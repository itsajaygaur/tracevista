"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Braces, FileJson2, ShieldCheck } from "lucide-react";

import { TraceDashboard } from "@/components/trace-dashboard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MAX_IMPORT_BYTES } from "@/lib/otlp";
import { SAMPLE_TEXT } from "@/lib/sample";
import { cn } from "@/lib/utils";
import type { AnalysisResult } from "@/lib/types";

type WorkerResponse =
  | { id: number; type: "success"; result: AnalysisResult }
  | { id: number; type: "error"; message: string };

export function TraceWorkbench() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [status, setStatus] = useState<"idle" | "processing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const worker = new Worker(new URL("../workers/trace.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if (response.id !== requestIdRef.current) return;
      setStatus("idle");
      if (response.type === "success") {
        setError(null);
        setResult(response.result);
      } else {
        setError(response.message);
      }
    });
    worker.addEventListener("error", () => {
      setStatus("idle");
      setError("The browser worker stopped unexpectedly. Reload the page and try again.");
    });
    return () => worker.terminate();
  }, []);

  const analyze = (text: string, sourceName: string, synthetic = false) => {
    setError(null);
    setStatus("processing");
    requestIdRef.current += 1;
    workerRef.current?.postMessage({
      id: requestIdRef.current,
      type: "analyze",
      text,
      sourceName,
      synthetic,
    });
  };

  const handleFile = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".json") && !lowerName.endsWith(".jsonl")) {
      setError("Choose an OTLP file ending in .json or .jsonl.");
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      setError("The selected file exceeds the 10 MB safety limit.");
      return;
    }
    try {
      analyze(await file.text(), file.name);
    } catch {
      setError("The selected file could not be read.");
    }
  };

  if (result) return <TraceDashboard result={result} onReset={() => { setResult(null); setError(null); }} />;

  return (
    <div id="top" className="mx-auto w-full max-w-4xl px-5 pb-16 sm:px-8">
      <section className="pb-12 pt-14 sm:pt-20">
        <p className="mono-label text-muted-foreground">00 · OpenTelemetry, without the setup</p>
        <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[1.02] tracking-tight sm:text-7xl">
          Understand every <span className="text-primary">millisecond.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Turn raw OTLP traces into service maps, waterfall timelines, latency percentiles, and critical-chain insights, entirely in your browser.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5 sm:px-6">
          <span className="mono-label">Input: OTLP JSON / JSONL</span>
          <span className="mono-label text-muted-foreground">Max 10 MB · 25,000 spans</span>
        </div>
        <div className="p-4 sm:p-6">
          <div
            className={cn(
              "relative rounded-sm border border-dashed px-5 py-12 text-center transition-colors sm:py-14",
              dragging ? "border-primary bg-primary/[0.04]" : "border-border hover:border-primary/50",
            )}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files[0];
              if (file) void handleFile(file);
            }}
          >
            {status === "processing" ? (
              <div role="status" aria-live="polite">
                <span className="mx-auto mb-5 block size-10 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
                <h2 className="text-lg font-semibold">Analyzing traces off the main thread</h2>
                <p className="mt-2 text-sm text-muted-foreground">Normalizing timestamps, building parent indexes, and calculating latency paths…</p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold tracking-tight">Drop your OTLP export here</h2>
                <p className="mt-2 font-mono text-xs text-muted-foreground">OTLP JSON or JSONL · up to 10 MB / 25,000 spans</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.jsonl,application/json"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleFile(file);
                    event.target.value = "";
                  }}
                  aria-label="Choose an OTLP trace file"
                />
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <FileJson2 className="size-4" aria-hidden="true" />
                    Choose file
                  </Button>
                  <Button variant="secondary" onClick={() => setPasteOpen(true)}>
                    <Braces className="size-4" aria-hidden="true" />
                    Paste OTLP
                  </Button>
                  <Button variant="ghost" onClick={() => analyze(SAMPLE_TEXT, "synthetic-checkout.json", true)}>
                    Load sample trace
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 text-left sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <div className="text-xs font-semibold">Processed locally, nothing uploaded</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">Data stays in memory and disappears when you reset or close this page.</div>
              </div>
            </div>
            <div className="mono-label flex shrink-0 gap-4 text-muted-foreground">
              <span>No backend</span>
              <span>No cookies</span>
            </div>
          </div>

          <p role="alert" aria-live="assertive" className={cn("mt-4 rounded-sm border-l-2 border-destructive bg-destructive/[0.06] px-4 py-3 text-sm text-red-700 dark:text-red-300", !error && "hidden")}>
            {error}
          </p>
        </div>
      </section>

      <section className="mt-12 grid border-y border-border max-sm:divide-y sm:grid-cols-3 sm:divide-x" aria-label="How TraceVista works">
        {[
          { index: "01", title: "Private by design", text: "Your telemetry never leaves the browser tab." },
          { index: "02", title: "Causality-aware", text: "Parent links drive self-time and critical-chain analysis." },
          { index: "03", title: "System-level view", text: "Cross-service calls become an explorable dependency map." },
        ].map(({ index, title, text }) => (
          <div key={title} className="p-5">
            <h3 className="mono-label flex gap-2">
              <span className="text-primary">{index}</span>
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>

      <p className="mono-label mt-8 text-center text-muted-foreground">
        Standards-based OTLP/JSON · nanosecond-safe normalization · deterministic analysis
      </p>

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paste OTLP JSON or JSONL</DialogTitle>
            <DialogDescription>The content is sent directly to a browser Web Worker. It is never transmitted over the network.</DialogDescription>
          </DialogHeader>
          <textarea
            value={pasteValue}
            onChange={(event) => setPasteValue(event.target.value)}
            placeholder={'{"resourceSpans":[…]}'}
            aria-label="OTLP JSON content"
            className="focus-ring min-h-64 w-full resize-y rounded-sm border border-input bg-background p-3 font-mono text-xs leading-relaxed placeholder:text-muted-foreground"
            autoFocus
          />
          <div className="mt-4 flex justify-end gap-2">
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button
              disabled={!pasteValue.trim()}
              onClick={() => {
                setPasteOpen(false);
                analyze(pasteValue, "pasted-otlp.json");
              }}
            >
              Analyze content
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
