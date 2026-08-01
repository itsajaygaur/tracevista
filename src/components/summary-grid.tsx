import { Activity, Boxes, CircleAlert, Clock3, Network, Rows3 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatCount, formatDuration } from "@/lib/format";
import type { AnalysisOverview } from "@/lib/types";

const cards = [
  { key: "traceCount", label: "Traces", icon: Activity, format: formatCount },
  { key: "spanCount", label: "Spans", icon: Rows3, format: formatCount },
  { key: "serviceCount", label: "Services", icon: Network, format: formatCount },
  { key: "errorCount", label: "Errors", icon: CircleAlert, format: formatCount },
  { key: "p50Ms", label: "p50 latency", icon: Clock3, format: formatDuration },
  { key: "p95Ms", label: "p95 latency", icon: Boxes, format: formatDuration },
] as const;

export function SummaryGrid({ overview }: { overview: AnalysisOverview }) {
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Analysis summary">
      {cards.map(({ key, label, icon: Icon, format }) => (
        <Card key={key} className="relative overflow-hidden p-4">
          <div className="absolute -right-3 -top-3 size-14 rounded-full bg-primary/5" />
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <Icon className="size-3.5 text-primary" aria-hidden="true" />
          </div>
          <div className="font-mono text-xl font-semibold tracking-tight">
            {format(overview[key] as number)}
          </div>
        </Card>
      ))}
    </section>
  );
}
