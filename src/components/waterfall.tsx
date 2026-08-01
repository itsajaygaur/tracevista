"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CircleAlert, GitBranch, ZoomIn } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NormalizedSpan, TraceAnalysis } from "@/lib/types";

const LABEL_WIDTH = 248;
const ROW_HEIGHT = 36;

export function Waterfall({
  trace,
  selectedSpanId,
  onSelectSpan,
}: {
  trace: TraceAnalysis;
  selectedSpanId: string | null;
  onSelectSpan: (span: NormalizedSpan) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const traceDurationUs = Math.max(1, trace.summary.durationMs * 1000);
  const criticalIds = useMemo(() => new Set(trace.criticalSpanIds), [trace.criticalSpanIds]);
  // TanStack Virtual intentionally exposes mutable measurement functions; React Compiler safely skips this component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: trace.spans.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="default" className="gap-1.5">
            <GitBranch className="size-3" aria-hidden="true" />
            Estimated critical chain
          </Badge>
          <span className="hidden sm:inline" title="The path maximizes accumulated span self-time across parent links. Async links and missing instrumentation can change the true critical path.">
            Parent-link heuristic · {trace.criticalSpanIds.length} spans
          </span>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <ZoomIn className="size-3.5" aria-hidden="true" />
          Zoom
          <input
            type="range"
            min="1"
            max="4"
            step="0.25"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-24 accent-[var(--primary)]"
            aria-label="Waterfall zoom"
          />
          <span className="w-7 font-mono">{zoom.toFixed(1)}×</span>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-background/50">
        <div style={{ minWidth: LABEL_WIDTH + 680 * zoom }}>
          <div className="sticky top-0 z-10 flex h-9 border-b border-border bg-muted/85 text-[10px] font-medium text-muted-foreground backdrop-blur">
            <div className="flex shrink-0 items-center px-3" style={{ width: LABEL_WIDTH }}>Span / service</div>
            <div className="relative flex-1">
              {[0, 25, 50, 75, 100].map((tick) => (
                <span key={tick} className="absolute top-2 -translate-x-1/2 font-mono" style={{ left: `${tick}%` }}>
                  {formatDuration(trace.summary.durationMs * tick / 100)}
                </span>
              ))}
            </div>
          </div>

          <div ref={viewportRef} className="relative h-[396px] overflow-y-auto" data-testid="waterfall">
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const span = trace.spans[virtualRow.index];
                const left = span.startUs / traceDurationUs * 100;
                const width = Math.max(span.durationUs / traceDurationUs * 100, 0.35 / zoom);
                const critical = criticalIds.has(span.spanId);
                const selected = selectedSpanId === span.spanId;
                return (
                  <button
                    type="button"
                    key={span.spanId}
                    className={cn(
                      "focus-ring absolute left-0 top-0 flex w-full border-b border-border/60 text-left text-xs transition-colors hover:bg-muted/50",
                      selected && "bg-primary/[0.07]",
                    )}
                    style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}
                    onClick={() => onSelectSpan(span)}
                    aria-label={`${span.name}, ${formatDuration(span.durationUs / 1000)}`}
                  >
                    <div className="flex shrink-0 items-center gap-2 overflow-hidden px-3" style={{ width: LABEL_WIDTH, paddingLeft: 12 + Math.min(span.depth, 8) * 10 }}>
                      {span.isError ? <CircleAlert className="size-3 shrink-0 text-red-500" aria-hidden="true" /> : <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />}
                      <div className="min-w-0">
                        <div className="truncate font-medium">{span.name}</div>
                        <div className="truncate text-[9px] text-muted-foreground">{span.serviceName}</div>
                      </div>
                    </div>
                    <div className="relative min-w-0 flex-1">
                      {[25, 50, 75].map((tick) => <span key={tick} className="absolute inset-y-0 border-l border-border/50" style={{ left: `${tick}%` }} />)}
                      <span
                        className={cn(
                          "absolute top-2 h-5 min-w-[3px] rounded-[5px] border shadow-sm",
                          span.isError
                            ? "border-red-500/50 bg-red-500/70"
                            : critical
                              ? "border-primary/50 bg-primary/75"
                              : "border-cyan-500/30 bg-cyan-500/45 dark:bg-cyan-400/40",
                        )}
                        style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
                        title={`${span.name} · ${formatDuration(span.durationUs / 1000)} · self ${formatDuration(span.selfTimeUs / 1000)}`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
