import type { AttributeValue, ImportIssue } from "@/lib/types";

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_SPANS = 25_000;

type UnknownRecord = Record<string, unknown>;

export interface ParsedEvent {
  name: string;
  timeUnixNano: bigint | null;
  attributes: Record<string, AttributeValue>;
}

export interface ParsedSpan {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  serviceName: string;
  startTimeUnixNano: bigint;
  endTimeUnixNano: bigint;
  kind: number | null;
  statusCode: number;
  statusMessage: string | null;
  attributes: Record<string, AttributeValue>;
  resourceAttributes: Record<string, AttributeValue>;
  events: ParsedEvent[];
}

export interface ParsedTelemetry {
  spans: ParsedSpan[];
  issues: ImportIssue[];
}

export class ImportFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportFailure";
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeAnyValue(input: unknown): AttributeValue {
  if (!isRecord(input)) return null;
  if (typeof input.stringValue === "string") return input.stringValue;
  if (typeof input.boolValue === "boolean") return input.boolValue;
  if (typeof input.doubleValue === "number") return input.doubleValue;
  if (typeof input.intValue === "number" || typeof input.intValue === "string") return input.intValue;
  if (typeof input.bytesValue === "string") return input.bytesValue;

  if (isRecord(input.arrayValue) && Array.isArray(input.arrayValue.values)) {
    return input.arrayValue.values.map(decodeAnyValue);
  }

  if (isRecord(input.kvlistValue) && Array.isArray(input.kvlistValue.values)) {
    return decodeAttributes(input.kvlistValue.values);
  }

  return null;
}

export function decodeAttributes(input: unknown): Record<string, AttributeValue> {
  if (!Array.isArray(input)) return {};

  const attributes: Record<string, AttributeValue> = {};
  for (const item of input) {
    if (!isRecord(item) || typeof item.key !== "string" || !item.key) continue;
    attributes[item.key] = decodeAnyValue(item.value);
  }
  return attributes;
}

function asStatusCode(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return 0;
}

function parseNano(value: unknown): bigint | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function parseId(value: unknown, length: 16 | 32): string | null {
  if (typeof value !== "string" || !new RegExp(`^[0-9a-fA-F]{${length}}$`).test(value)) return null;
  if (/^0+$/.test(value)) return null;
  return value.toLowerCase();
}

function createIssueCollector(initial: ImportIssue[] = []) {
  const issues = new Map<string, ImportIssue>();
  for (const issue of initial) issues.set(issue.code, { ...issue });

  return {
    add(code: string, message: string, count = 1, severity: ImportIssue["severity"] = "warning") {
      const existing = issues.get(code);
      if (existing) existing.count += count;
      else issues.set(code, { code, message, count, severity });
    },
    list() {
      return [...issues.values()];
    },
  };
}

function parseDocuments(text: string, addIssue: ReturnType<typeof createIssueCollector>["add"]): UnknownRecord[] {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!isRecord(parsed)) throw new ImportFailure("The top-level JSON value must be an OTLP object.");
    return [parsed];
  } catch (error) {
    if (error instanceof ImportFailure) throw error;
  }

  const documents: UnknownRecord[] = [];
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  for (const line of lines) {
    try {
      const parsed: unknown = JSON.parse(line);
      if (isRecord(parsed)) documents.push(parsed);
      else addIssue("malformed_jsonl_line", "Skipped JSONL lines whose top-level value was not an object.");
    } catch {
      addIssue("malformed_jsonl_line", "Skipped JSONL lines that were not valid JSON.");
    }
  }

  if (documents.length === 0) {
    throw new ImportFailure("The input is neither valid OTLP JSON nor valid OTLP JSONL.");
  }
  return documents;
}

function parseEvents(input: unknown): ParsedEvent[] {
  if (!Array.isArray(input)) return [];
  const events: ParsedEvent[] = [];

  for (const item of input) {
    if (!isRecord(item) || typeof item.name !== "string" || !item.name) continue;
    events.push({
      name: item.name,
      timeUnixNano: parseNano(item.timeUnixNano),
      attributes: decodeAttributes(item.attributes),
    });
  }
  return events;
}

function parseSpan(
  value: unknown,
  serviceName: string,
  resourceAttributes: Record<string, AttributeValue>,
): ParsedSpan | null {
  if (!isRecord(value)) return null;

  const traceId = parseId(value.traceId, 32);
  const spanId = parseId(value.spanId, 16);
  const parentSpanId = value.parentSpanId === undefined || value.parentSpanId === ""
    ? null
    : parseId(value.parentSpanId, 16);
  const startTimeUnixNano = parseNano(value.startTimeUnixNano);
  const endTimeUnixNano = parseNano(value.endTimeUnixNano);

  if (
    !traceId ||
    !spanId ||
    (value.parentSpanId !== undefined && value.parentSpanId !== "" && !parentSpanId) ||
    typeof value.name !== "string" ||
    value.name.trim().length === 0 ||
    startTimeUnixNano === null ||
    endTimeUnixNano === null ||
    endTimeUnixNano < startTimeUnixNano
  ) {
    return null;
  }

  const status = isRecord(value.status) ? value.status : {};
  return {
    traceId,
    spanId,
    parentSpanId,
    name: value.name.trim(),
    serviceName,
    startTimeUnixNano,
    endTimeUnixNano,
    kind: typeof value.kind === "number" ? value.kind : null,
    statusCode: asStatusCode(status.code),
    statusMessage: typeof status.message === "string" && status.message ? status.message : null,
    attributes: decodeAttributes(value.attributes),
    resourceAttributes,
    events: parseEvents(value.events),
  };
}

export function parseOtlpText(text: string): ParsedTelemetry {
  if (!text.trim()) throw new ImportFailure("The input is empty.");
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) {
    throw new ImportFailure("The input exceeds the 10 MB safety limit.");
  }

  const collector = createIssueCollector();
  const documents = parseDocuments(text, collector.add);
  const spans: ParsedSpan[] = [];
  const seen = new Set<string>();
  let candidateCount = 0;
  let tracesDocumentCount = 0;

  for (const document of documents) {
    if (!Array.isArray(document.resourceSpans)) {
      collector.add("invalid_otlp_document", "Skipped objects without an OTLP resourceSpans array.");
      continue;
    }
    tracesDocumentCount += 1;

    for (const resourceSpan of document.resourceSpans) {
      if (!isRecord(resourceSpan)) {
        collector.add("invalid_resource_spans", "Skipped malformed resourceSpans entries.");
        continue;
      }

      const resource = isRecord(resourceSpan.resource) ? resourceSpan.resource : {};
      const resourceAttributes = decodeAttributes(resource.attributes);
      const serviceValue = resourceAttributes["service.name"];
      const serviceName = typeof serviceValue === "string" && serviceValue.trim()
        ? serviceValue.trim()
        : "unknown_service";
      if (serviceName === "unknown_service") {
        collector.add("missing_service_name", "Used unknown_service when resource.service.name was missing.");
      }

      if (!Array.isArray(resourceSpan.scopeSpans)) {
        collector.add("invalid_scope_spans", "Skipped resourceSpans entries without a scopeSpans array.");
        continue;
      }

      for (const scopeSpan of resourceSpan.scopeSpans) {
        if (!isRecord(scopeSpan) || !Array.isArray(scopeSpan.spans)) {
          collector.add("invalid_scope_spans", "Skipped malformed scopeSpans entries.");
          continue;
        }

        for (const spanValue of scopeSpan.spans) {
          candidateCount += 1;
          if (candidateCount > MAX_IMPORT_SPANS) {
            throw new ImportFailure("The input exceeds the 25,000-span safety limit.");
          }

          const span = parseSpan(spanValue, serviceName, resourceAttributes);
          if (!span) {
            collector.add(
              "invalid_span",
              "Skipped spans with invalid IDs, names, timestamps, parent IDs, or time ranges.",
            );
            continue;
          }

          const key = `${span.traceId}:${span.spanId}`;
          if (seen.has(key)) {
            collector.add("duplicate_span", "Ignored duplicate (traceId, spanId) entries and kept the first.");
            continue;
          }
          seen.add(key);
          spans.push(span);
        }
      }
    }
  }

  if (tracesDocumentCount === 0) {
    throw new ImportFailure("No OTLP traces document with resourceSpans was found.");
  }
  if (spans.length === 0) {
    throw new ImportFailure("No valid spans were found in the OTLP input.");
  }

  return { spans, issues: collector.list() };
}
