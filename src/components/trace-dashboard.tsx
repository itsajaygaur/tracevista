"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download, FileJson2, RotateCcw, ShieldCheck, TimerReset } from "lucide-react";

import { SpanDetails } from "@/components/span-details";
import { ServiceMap } from "@/components/service-map";
import { SummaryGrid } from "@/components/summary-grid";
import { TraceList } from "@/components/trace-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Waterfall } from "@/components/waterfall";
import { formatCount, formatDuration } from "@/lib/format";
import type { AnalysisExport, AnalysisResult, NormalizedSpan, TraceAnalysis } from "@/lib/types";

function createExport(result: AnalysisResult): AnalysisExport {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceName: result.sourceName,
    synthetic: result.synthetic,
    overview: result.overview,
    issues: result.issues,
    traces: result.traces.map((trace) => {
      const spans = new Map(trace.spans.map((span) => [span.spanId, span]));
      return {
        summary: trace.summary,
        criticalOperations: trace.criticalSpanIds.map((spanId) => spans.get(spanId)?.name ?? spanId),
        serviceEdges: trace.serviceEdges,
      };
    }),
  };
}

export function TraceDashboard({ result, onReset }: { result: AnalysisResult; onReset: () => void }) {
  const [selectedTrace, setSelectedTrace] = useState<TraceAnalysis>(result.traces[0]);
  const [selectedSpan, setSelectedSpan] = useState<NormalizedSpan | null>(null);

  const selectedSpansById = useMemo(
    () => new Map(selectedTrace.spans.map((span) => [span.spanId, span])),
    [selectedTrace.spans],
  );
  const criticalNames = useMemo(() => {
    return selectedTrace.criticalSpanIds.map((id) => selectedSpansById.get(id)?.name).filter(Boolean).join(" → ");
  }, [selectedSpansById, selectedTrace.criticalSpanIds]);

  const exportSummary = () => {
    const blob = new Blob([JSON.stringify(createExport(result), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tracevista-${result.sourceName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-summary.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-[1480px] px-5 pb-6 sm:px-8">
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="success" className="gap-1.5">
              <ShieldCheck className="size-3" aria-hidden="true" />
              Processed locally
            </Badge>
            {result.synthetic ? <Badge variant="warning">Synthetic demo data</Badge> : null}
            <Badge variant="outline" className="gap-1.5 font-mono">
              <FileJson2 className="size-3" aria-hidden="true" />
              {result.sourceName}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Trace analysis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatCount(result.overview.spanCount)} spans processed in {formatDuration(result.processingTimeMs)} inside a Web Worker.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={exportSummary}>
            <Download className="size-4" aria-hidden="true" />
            Export summary
          </Button>
          <Button variant="secondary" onClick={onReset}>
            <RotateCcw className="size-4" aria-hidden="true" />
            New import
          </Button>
        </div>
      </header>

      <SummaryGrid overview={result.overview} />

      {result.issues.length ? (
        <Card className="mt-4 border-amber-500/20 bg-amber-500/[0.04]">
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <div>
              <div className="text-xs font-semibold text-amber-800 dark:text-amber-200">Data-quality notes</div>
              <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-amber-800/80 dark:text-amber-200/80">
                {result.issues.map((issue) => <li key={issue.code}>{issue.count}× {issue.message}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-4 overflow-hidden">
        <div className="grid min-h-[650px] lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="border-b border-border lg:border-b-0 lg:border-r" aria-label="Trace browser">
            <TraceList
              traces={result.traces}
              selectedTraceId={selectedTrace.summary.traceId}
              onSelect={(trace) => {
                setSelectedTrace(trace);
                setSelectedSpan(null);
              }}
            />
          </aside>

          <section className="min-w-0 p-4 sm:p-5" aria-label="Selected trace details">
            <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold">{selectedTrace.summary.rootOperation}</h2>
                  {selectedTrace.summary.errorCount ? <Badge variant="error">{selectedTrace.summary.errorCount} errors</Badge> : <Badge variant="success">Healthy</Badge>}
                </div>
                <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{selectedTrace.summary.traceId}</p>
              </div>
              <div className="flex shrink-0 items-center gap-4 text-xs">
                <div><span className="text-muted-foreground">Duration</span><div className="mt-0.5 font-mono font-semibold">{formatDuration(selectedTrace.summary.durationMs)}</div></div>
                <div><span className="text-muted-foreground">Spans</span><div className="mt-0.5 font-mono font-semibold">{selectedTrace.summary.spanCount}</div></div>
                <div><span className="text-muted-foreground">Services</span><div className="mt-0.5 font-mono font-semibold">{selectedTrace.summary.serviceNames.length}</div></div>
              </div>
            </div>

            <Tabs defaultValue="waterfall">
              <TabsList aria-label="Trace visualization">
                <TabsTrigger value="waterfall">Waterfall</TabsTrigger>
                <TabsTrigger value="services">Service map</TabsTrigger>
                <TabsTrigger value="critical">Critical chain</TabsTrigger>
              </TabsList>
              <TabsContent value="waterfall">
                <Waterfall trace={selectedTrace} selectedSpanId={selectedSpan?.spanId ?? null} onSelectSpan={setSelectedSpan} />
              </TabsContent>
              <TabsContent value="services">
                <ServiceMap trace={selectedTrace} />
              </TabsContent>
              <TabsContent value="critical">
                <Card className="border-primary/15 bg-primary/[0.035]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TimerReset className="size-4 text-primary" aria-hidden="true" /> Estimated critical chain</CardTitle>
                    <CardDescription>
                      This parent-linked path maximizes accumulated exclusive time. It is an engineering estimate—not a causal guarantee—when async links or instrumentation are incomplete.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ol className="relative ml-2 border-l border-primary/25 pl-5">
                      {selectedTrace.criticalSpanIds.map((spanId, index) => {
                        const span = selectedSpansById.get(spanId)!;
                        return (
                          <li key={spanId} className="relative pb-5 last:pb-0">
                            <span className="absolute -left-[26px] top-0 grid size-3 place-items-center rounded-full bg-primary ring-4 ring-card" />
                            <button type="button" className="focus-ring rounded text-left" onClick={() => setSelectedSpan(span)}>
                              <div className="text-sm font-semibold">{index + 1}. {span.name}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{span.serviceName} · self {formatDuration(span.selfTimeUs / 1000)} · total {formatDuration(span.durationUs / 1000)}</div>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                    <p className="mt-5 rounded-lg bg-muted/60 p-3 font-mono text-[10px] leading-relaxed text-muted-foreground">{criticalNames}</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </Card>

      <SpanDetails span={selectedSpan} open={Boolean(selectedSpan)} onOpenChange={(open) => { if (!open) setSelectedSpan(null); }} />
    </div>
  );
}
