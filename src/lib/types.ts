export type AttributeValue =
  | string
  | number
  | boolean
  | null
  | AttributeValue[]
  | { [key: string]: AttributeValue };

export type IssueSeverity = "warning" | "error";

export interface ImportIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  count: number;
}

export interface SpanEvent {
  name: string;
  timeOffsetUs: number | null;
  attributes: Record<string, AttributeValue>;
}

export interface NormalizedSpan {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  serviceName: string;
  startUs: number;
  endUs: number;
  durationUs: number;
  selfTimeUs: number;
  depth: number;
  kind: number | null;
  statusCode: number;
  statusMessage: string | null;
  isError: boolean;
  attributes: Record<string, AttributeValue>;
  resourceAttributes: Record<string, AttributeValue>;
  events: SpanEvent[];
}

export interface TraceSummary {
  traceId: string;
  rootOperation: string;
  durationMs: number;
  spanCount: number;
  serviceNames: string[];
  errorCount: number;
  startedAtUnixNano: string;
}

export interface ServiceNode {
  id: string;
  spanCount: number;
  errorCount: number;
}

export interface ServiceEdge {
  id: string;
  source: string;
  target: string;
  callCount: number;
  errorCount: number;
  medianMs: number;
  p95Ms: number;
}

export interface TraceAnalysis {
  summary: TraceSummary;
  spans: NormalizedSpan[];
  serviceNodes: ServiceNode[];
  serviceEdges: ServiceEdge[];
  criticalSpanIds: string[];
}

export interface AnalysisOverview {
  traceCount: number;
  spanCount: number;
  serviceCount: number;
  errorCount: number;
  p50Ms: number;
  p95Ms: number;
}

export interface AnalysisResult {
  sourceName: string;
  synthetic: boolean;
  processingTimeMs: number;
  overview: AnalysisOverview;
  traces: TraceAnalysis[];
  issues: ImportIssue[];
}

export interface AnalysisExport {
  schemaVersion: 1;
  generatedAt: string;
  sourceName: string;
  synthetic: boolean;
  overview: AnalysisOverview;
  issues: ImportIssue[];
  traces: Array<{
    summary: TraceSummary;
    criticalOperations: string[];
    serviceEdges: ServiceEdge[];
  }>;
}
