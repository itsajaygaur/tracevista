import type { ParsedSpan, ParsedTelemetry } from "@/lib/otlp";
import type {
  AnalysisOverview,
  ImportIssue,
  NormalizedSpan,
  ServiceEdge,
  ServiceNode,
  TraceAnalysis,
} from "@/lib/types";

export interface CoreAnalysis {
  overview: AnalysisOverview;
  traces: TraceAnalysis[];
  issues: ImportIssue[];
}

export function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * percentileValue;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function unionDuration(intervals: Array<[number, number]>): number {
  const valid = intervals.filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0]);
  if (valid.length === 0) return 0;

  let total = 0;
  let [currentStart, currentEnd] = valid[0];
  for (let index = 1; index < valid.length; index += 1) {
    const [start, end] = valid[index];
    if (start <= currentEnd) currentEnd = Math.max(currentEnd, end);
    else {
      total += currentEnd - currentStart;
      currentStart = start;
      currentEnd = end;
    }
  }
  return total + currentEnd - currentStart;
}

function isSpanError(span: ParsedSpan): boolean {
  return (
    span.statusCode === 2 ||
    (typeof span.attributes["error.type"] === "string" && span.attributes["error.type"] !== "") ||
    span.events.some((event) => event.name.toLowerCase() === "exception")
  );
}

function addIssue(
  map: Map<string, ImportIssue>,
  code: string,
  message: string,
  count = 1,
): void {
  const existing = map.get(code);
  if (existing) existing.count += count;
  else map.set(code, { code, severity: "warning", message, count });
}

function sanitizeParents(
  spansById: Map<string, ParsedSpan>,
  issueMap: Map<string, ImportIssue>,
): Map<string, string | null> {
  const parents = new Map<string, string | null>();

  for (const span of spansById.values()) {
    if (!span.parentSpanId) {
      parents.set(span.spanId, null);
      continue;
    }
    if (!spansById.has(span.parentSpanId)) {
      parents.set(span.spanId, null);
      addIssue(issueMap, "missing_parent", "Treated spans with missing parents as additional roots.");
      continue;
    }

    const visited = new Set([span.spanId]);
    let cursor: string | null = span.parentSpanId;
    let cyclic = false;
    while (cursor) {
      if (visited.has(cursor)) {
        cyclic = true;
        break;
      }
      visited.add(cursor);
      cursor = spansById.get(cursor)?.parentSpanId ?? null;
    }

    if (cyclic) {
      parents.set(span.spanId, null);
      addIssue(issueMap, "cyclic_parent", "Ignored cyclic parent links and treated affected spans as roots.");
    } else {
      parents.set(span.spanId, span.parentSpanId);
    }
  }
  return parents;
}

function buildServiceGraph(spans: NormalizedSpan[], children: Map<string, string[]>): {
  nodes: ServiceNode[];
  edges: ServiceEdge[];
} {
  const nodeMap = new Map<string, ServiceNode>();
  const edgeMap = new Map<string, { source: string; target: string; durations: number[]; errors: number }>();
  const spansById = new Map(spans.map((span) => [span.spanId, span]));

  for (const span of spans) {
    const node = nodeMap.get(span.serviceName) ?? { id: span.serviceName, spanCount: 0, errorCount: 0 };
    node.spanCount += 1;
    node.errorCount += Number(span.isError);
    nodeMap.set(span.serviceName, node);

    for (const childId of children.get(span.spanId) ?? []) {
      const child = spansById.get(childId);
      if (!child || child.serviceName === span.serviceName) continue;
      const key = `${span.serviceName}→${child.serviceName}`;
      const edge = edgeMap.get(key) ?? {
        source: span.serviceName,
        target: child.serviceName,
        durations: [],
        errors: 0,
      };
      edge.durations.push(child.durationUs / 1000);
      edge.errors += Number(child.isError);
      edgeMap.set(key, edge);
    }
  }

  return {
    nodes: [...nodeMap.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edgeMap.entries()].map(([id, edge]) => ({
      id,
      source: edge.source,
      target: edge.target,
      callCount: edge.durations.length,
      errorCount: edge.errors,
      medianMs: percentile(edge.durations, 0.5),
      p95Ms: percentile(edge.durations, 0.95),
    })),
  };
}

function analyzeTrace(rawSpans: ParsedSpan[], issueMap: Map<string, ImportIssue>): TraceAnalysis {
  const spansById = new Map(rawSpans.map((span) => [span.spanId, span]));
  const parentMap = sanitizeParents(spansById, issueMap);
  const children = new Map<string, string[]>();
  for (const [spanId, parentId] of parentMap) {
    if (!parentId) continue;
    const list = children.get(parentId) ?? [];
    list.push(spanId);
    children.set(parentId, list);
  }

  const minStart = rawSpans.reduce(
    (minimum, span) => (span.startTimeUnixNano < minimum ? span.startTimeUnixNano : minimum),
    rawSpans[0].startTimeUnixNano,
  );
  const maxEnd = rawSpans.reduce(
    (maximum, span) => (span.endTimeUnixNano > maximum ? span.endTimeUnixNano : maximum),
    rawSpans[0].endTimeUnixNano,
  );

  const depthMemo = new Map<string, number>();
  const getDepth = (spanId: string): number => {
    const cached = depthMemo.get(spanId);
    if (cached !== undefined) return cached;
    const parent = parentMap.get(spanId);
    const depth = parent ? getDepth(parent) + 1 : 0;
    depthMemo.set(spanId, depth);
    return depth;
  };

  const normalizedById = new Map<string, NormalizedSpan>();
  for (const span of rawSpans) {
    const startUs = Number(span.startTimeUnixNano - minStart) / 1000;
    const endUs = Number(span.endTimeUnixNano - minStart) / 1000;
    normalizedById.set(span.spanId, {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: parentMap.get(span.spanId) ?? null,
      name: span.name,
      serviceName: span.serviceName,
      startUs,
      endUs,
      durationUs: Math.max(0, endUs - startUs),
      selfTimeUs: 0,
      depth: getDepth(span.spanId),
      kind: span.kind,
      statusCode: span.statusCode,
      statusMessage: span.statusMessage,
      isError: isSpanError(span),
      attributes: span.attributes,
      resourceAttributes: span.resourceAttributes,
      events: span.events.map((event) => ({
        name: event.name,
        timeOffsetUs: event.timeUnixNano === null ? null : Number(event.timeUnixNano - minStart) / 1000,
        attributes: event.attributes,
      })),
    });
  }

  for (const span of normalizedById.values()) {
    const childIntervals = (children.get(span.spanId) ?? []).map((childId): [number, number] => {
      const child = normalizedById.get(childId)!;
      return [Math.max(span.startUs, child.startUs), Math.min(span.endUs, child.endUs)];
    });
    span.selfTimeUs = Math.max(0, span.durationUs - unionDuration(childIntervals));
  }

  const pathMemo = new Map<string, { score: number; path: string[] }>();
  const scorePath = (spanId: string): { score: number; path: string[] } => {
    const cached = pathMemo.get(spanId);
    if (cached) return cached;
    const span = normalizedById.get(spanId)!;
    let bestChild = { score: 0, path: [] as string[] };
    for (const childId of children.get(spanId) ?? []) {
      const candidate = scorePath(childId);
      if (candidate.score > bestChild.score) bestChild = candidate;
    }
    const result = { score: span.selfTimeUs + bestChild.score, path: [spanId, ...bestChild.path] };
    pathMemo.set(spanId, result);
    return result;
  };

  const roots = [...normalizedById.values()].filter((span) => span.parentSpanId === null);
  let critical = { score: -1, path: [] as string[] };
  for (const root of roots) {
    const candidate = scorePath(root.spanId);
    if (candidate.score > critical.score) critical = candidate;
  }

  const spans = [...normalizedById.values()].sort(
    (a, b) => a.startUs - b.startUs || b.durationUs - a.durationUs || a.name.localeCompare(b.name),
  );
  const graph = buildServiceGraph(spans, children);
  const root = [...roots].sort((a, b) => a.startUs - b.startUs || b.durationUs - a.durationUs)[0] ?? spans[0];

  return {
    summary: {
      traceId: rawSpans[0].traceId,
      rootOperation: root.name,
      durationMs: Number(maxEnd - minStart) / 1_000_000,
      spanCount: spans.length,
      serviceNames: [...new Set(spans.map((span) => span.serviceName))].sort(),
      errorCount: spans.filter((span) => span.isError).length,
      startedAtUnixNano: minStart.toString(),
    },
    spans,
    serviceNodes: graph.nodes,
    serviceEdges: graph.edges,
    criticalSpanIds: critical.path,
  };
}

export function analyzeTelemetry(parsed: ParsedTelemetry): CoreAnalysis {
  const issueMap = new Map(parsed.issues.map((issue) => [issue.code, { ...issue }]));
  const tracesMap = new Map<string, ParsedSpan[]>();
  for (const span of parsed.spans) {
    const spans = tracesMap.get(span.traceId) ?? [];
    spans.push(span);
    tracesMap.set(span.traceId, spans);
  }

  const traces = [...tracesMap.values()]
    .map((spans) => analyzeTrace(spans, issueMap))
    .sort((a, b) => b.summary.durationMs - a.summary.durationMs);
  const traceDurations = traces.map((trace) => trace.summary.durationMs);
  const allSpans = traces.flatMap((trace) => trace.spans);

  return {
    overview: {
      traceCount: traces.length,
      spanCount: allSpans.length,
      serviceCount: new Set(allSpans.map((span) => span.serviceName)).size,
      errorCount: allSpans.filter((span) => span.isError).length,
      p50Ms: percentile(traceDurations, 0.5),
      p95Ms: percentile(traceDurations, 0.95),
    },
    traces,
    issues: [...issueMap.values()],
  };
}
