"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Braces, ChartNoAxesCombined, FileJson2, GitFork, LockKeyhole, Network, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { TraceDashboard } from "@/components/trace-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div id="top" className="mx-auto w-full max-w-[1480px] px-5 pb-6 sm:px-8">
      <section className="mx-auto max-w-4xl pb-10 pt-12 text-center sm:pt-20">
        <div className="mb-5 flex items-center justify-center gap-2">
          <Badge variant="default" className="gap-1.5 px-3 py-1.5">
            <Sparkles className="size-3" aria-hidden="true" />
            OpenTelemetry, without the setup
          </Badge>
          <ThemeToggle />
        </div>
        <h1 className="text-balance text-4xl font-bold tracking-[-0.045em] sm:text-6xl">
          Understand every <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-cyan-300">millisecond.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
          Turn raw OTLP traces into service maps, waterfall timelines, latency percentiles, and critical-chain insights—entirely in your browser.
        </p>
      </section>

      <Card className="mx-auto max-w-4xl overflow-hidden border-primary/15 bg-card/80 backdrop-blur-xl">
        <CardContent className="p-4 sm:p-6">
          <div
            className={cn(
              "relative rounded-2xl border-2 border-dashed px-5 py-12 text-center transition-colors sm:py-14",
              dragging ? "border-primary bg-primary/[0.06]" : "border-border bg-background/45 hover:border-primary/45",
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
                <span className="mx-auto mb-5 block size-12 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
                <h2 className="text-lg font-semibold">Analyzing traces off the main thread</h2>
                <p className="mt-2 text-sm text-muted-foreground">Normalizing timestamps, building parent indexes, and calculating latency paths…</p>
              </div>
            ) : (
              <>
                <span className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-8 ring-primary/[0.04]">
                  <UploadCloud className="size-6" aria-hidden="true" />
                </span>
                <h2 className="text-lg font-semibold">Drop your OTLP export here</h2>
                <p className="mt-2 text-sm text-muted-foreground">OTLP JSON or JSONL · up to 10 MB / 25,000 spans</p>
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

          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.055] px-4 py-3 text-left sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <div>
                <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Processed locally — nothing uploaded</div>
                <div className="mt-0.5 text-[11px] text-emerald-800/70 dark:text-emerald-200/70">Data stays in memory and disappears when you reset or close this page.</div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Badge variant="outline" className="border-emerald-500/20 text-emerald-700 dark:text-emerald-300">No backend</Badge>
              <Badge variant="outline" className="border-emerald-500/20 text-emerald-700 dark:text-emerald-300">No cookies</Badge>
            </div>
          </div>

          <p role="alert" aria-live="assertive" className={cn("mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-700 dark:text-red-300", !error && "hidden")}>
            {error}
          </p>
        </CardContent>
      </Card>

      <section className="mx-auto grid max-w-4xl gap-3 py-8 sm:grid-cols-3" aria-label="How TraceVista works">
        {[
          { icon: LockKeyhole, title: "Private by design", text: "Your telemetry never leaves the browser tab." },
          { icon: GitFork, title: "Causality-aware", text: "Parent links drive self-time and critical-chain analysis." },
          { icon: Network, title: "System-level view", text: "Cross-service calls become an explorable dependency map." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-border bg-card/55 p-4 backdrop-blur">
            <Icon className="mb-3 size-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>

      <div className="mx-auto flex max-w-4xl items-center justify-center gap-3 pb-5 text-[11px] text-muted-foreground">
        <ChartNoAxesCombined className="size-3.5" aria-hidden="true" />
        Standards-based OTLP/JSON · nanosecond-safe normalization · deterministic analysis
      </div>

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
            className="focus-ring min-h-64 w-full resize-y rounded-xl border border-input bg-background p-3 font-mono text-xs leading-relaxed placeholder:text-muted-foreground"
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
