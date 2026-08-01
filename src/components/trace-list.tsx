"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CircleAlert, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDuration, shortId } from "@/lib/format";
import type { TraceAnalysis } from "@/lib/types";

export function TraceList({
  traces,
  selectedTraceId,
  onSelect,
}: {
  traces: TraceAnalysis[];
  selectedTraceId: string;
  onSelect: (trace: TraceAnalysis) => void;
}) {
  const [query, setQuery] = useState("");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return traces.filter((trace) => {
      if (errorsOnly && trace.summary.errorCount === 0) return false;
      if (!search) return true;
      return (
        trace.summary.traceId.includes(search) ||
        trace.summary.rootOperation.toLowerCase().includes(search) ||
        trace.summary.serviceNames.some((name) => name.toLowerCase().includes(search))
      );
    });
  }, [errorsOnly, query, traces]);

  // TanStack Virtual intentionally exposes mutable measurement functions; React Compiler safely skips this component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 84,
    overscan: 6,
  });

  return (
    <div className="flex h-full min-h-[520px] flex-col">
      <div className="border-b border-border p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search traces or services"
            aria-label="Search traces"
            className="focus-ring h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground"
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} of {traces.length} traces</span>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={errorsOnly}
              onChange={(event) => setErrorsOnly(event.target.checked)}
              className="size-3.5 accent-[var(--primary)]"
            />
            Errors only
          </label>
        </div>
      </div>

      <div ref={parentRef} className="min-h-0 flex-1 overflow-auto" data-testid="trace-list">
        {filtered.length === 0 ? (
          <div className="grid h-56 place-items-center px-5 text-center text-sm text-muted-foreground">No traces match this filter.</div>
        ) : (
          <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const trace = filtered[virtualRow.index];
              const selected = trace.summary.traceId === selectedTraceId;
              return (
                <button
                  key={trace.summary.traceId}
                  type="button"
                  onClick={() => onSelect(trace)}
                  className={cn(
                    "focus-ring absolute left-0 top-0 w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/60",
                    selected && "bg-primary/[0.08] shadow-[inset_3px_0_0_var(--primary)] hover:bg-primary/[0.1]",
                  )}
                  style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}
                  aria-pressed={selected}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{trace.summary.rootOperation}</div>
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground">{shortId(trace.summary.traceId)}</div>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-medium">{formatDuration(trace.summary.durationMs)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] text-muted-foreground">{trace.summary.serviceNames.join(" · ")}</span>
                    {trace.summary.errorCount > 0 ? (
                      <Badge variant="error" className="shrink-0 gap-1 px-1.5 py-0.5">
                        <CircleAlert className="size-3" aria-hidden="true" />
                        {trace.summary.errorCount}
                      </Badge>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
