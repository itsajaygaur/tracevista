"use client";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatAttributeValue, formatDuration, shortId } from "@/lib/format";
import type { NormalizedSpan } from "@/lib/types";

function AttributeTable({ values }: { values: NormalizedSpan["attributes"] }) {
  const entries = Object.entries(values);
  if (entries.length === 0) return <p className="py-3 text-sm text-muted-foreground">No attributes recorded.</p>;
  return (
    <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background/45">
      {entries.map(([key, value]) => (
        <div key={key} className="grid gap-1 px-3 py-2.5 text-xs sm:grid-cols-[minmax(140px,0.7fr)_1.3fr]">
          <dt className="break-all font-mono text-muted-foreground">{key}</dt>
          <dd className="break-all font-mono text-foreground">{formatAttributeValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SpanDetails({ span, open, onOpenChange }: { span: NormalizedSpan | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {span ? (
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant={span.isError ? "error" : "success"}>{span.isError ? "Error" : "Completed"}</Badge>
              <Badge variant="outline">{span.serviceName}</Badge>
            </div>
            <DialogTitle>{span.name}</DialogTitle>
            <DialogDescription className="font-mono text-xs">Span {shortId(span.spanId)} · Trace {shortId(span.traceId)}</DialogDescription>
          </DialogHeader>

          <div className="mb-6 grid grid-cols-3 gap-3">
            {[
              ["Duration", formatDuration(span.durationUs / 1000)],
              ["Self time", formatDuration(span.selfTimeUs / 1000)],
              ["Timeline start", formatDuration(span.startUs / 1000)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-muted/40 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
                <div className="mt-1 font-mono text-sm font-semibold">{value}</div>
              </div>
            ))}
          </div>

          {span.statusMessage ? (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300">
              {span.statusMessage}
            </div>
          ) : null}

          <section className="mb-6">
            <h3 className="mb-2 text-sm font-semibold">Span attributes</h3>
            <AttributeTable values={span.attributes} />
          </section>

          {span.events.length ? (
            <section className="mb-6">
              <h3 className="mb-2 text-sm font-semibold">Events</h3>
              <div className="space-y-2">
                {span.events.map((event, index) => (
                  <div key={`${event.name}-${index}`} className="rounded-xl border border-border bg-background/45 p-3">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold">{event.name}</span>
                      <span className="font-mono text-muted-foreground">{event.timeOffsetUs === null ? "no timestamp" : formatDuration(event.timeOffsetUs / 1000)}</span>
                    </div>
                    {Object.keys(event.attributes).length ? <div className="mt-2"><AttributeTable values={event.attributes} /></div> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="mb-2 text-sm font-semibold">Resource attributes</h3>
            <AttributeTable values={span.resourceAttributes} />
          </section>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
