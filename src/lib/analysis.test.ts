import { describe, expect, it } from "vitest";

import { analyzeTelemetry, percentile, unionDuration } from "@/lib/analysis";
import type { ParsedSpan, ParsedTelemetry } from "@/lib/otlp";
import { parseOtlpText } from "@/lib/otlp";
import { SAMPLE_TEXT } from "@/lib/sample";

const TRACE = "4bf92f3577b34da6a3ce929d0e0e4736";

function parsedSpan(overrides: Partial<ParsedSpan> = {}): ParsedSpan {
  return {
    traceId: TRACE,
    spanId: "00f067aa0ba902b7",
    parentSpanId: null,
    name: "root",
    serviceName: "api",
    startTimeUnixNano: 1_777_000_000_000_000_000n,
    endTimeUnixNano: 1_777_000_000_100_000_000n,
    kind: 2,
    statusCode: 1,
    statusMessage: null,
    attributes: {},
    resourceAttributes: { "service.name": "api" },
    events: [],
    ...overrides,
  };
}

function analyze(spans: ParsedSpan[]) {
  return analyzeTelemetry({ spans, issues: [] });
}

describe("analysis helpers", () => {
  it("uses linear interpolation for percentiles", () => {
    expect(percentile([], 0.95)).toBe(0);
    expect(percentile([10], 0.95)).toBe(10);
    expect(percentile([40, 10, 20, 30], 0.5)).toBe(25);
    expect(percentile([0, 100], 0.95)).toBe(95);
  });

  it("merges overlapping and adjacent intervals", () => {
    expect(unionDuration([])).toBe(0);
    expect(unionDuration([[0, 10], [5, 12], [12, 15], [20, 25], [4, 4]])).toBe(20);
  });
});

describe("trace analysis", () => {
  it("derives overview, service graph, errors, and critical chain from the sample", () => {
    const result = analyzeTelemetry(parseOtlpText(SAMPLE_TEXT));
    expect(result.overview).toMatchObject({ traceCount: 3, spanCount: 21, serviceCount: 6, errorCount: 4 });
    expect(result.overview.p95Ms).toBeGreaterThan(result.overview.p50Ms);

    const slow = result.traces.find((trace) => trace.summary.durationMs === 620)!;
    expect(slow.summary.rootOperation).toBe("POST /checkout");
    expect(slow.serviceEdges.some((edge) => edge.source === "checkout-api" && edge.target === "payment-api")).toBe(true);
    expect(slow.criticalSpanIds[0]).toBe("00f067aa0ba902b7");
    expect(slow.spans.find((span) => span.name === "SELECT inventory")?.durationUs).toBe(148_000);
    expect(slow.spans.find((span) => span.name === "provider.request")?.isError).toBe(true);
  });

  it("computes self-time from the union of direct children", () => {
    const root = parsedSpan();
    const childA = parsedSpan({
      spanId: "00f067aa0ba902b8",
      parentSpanId: root.spanId,
      name: "a",
      startTimeUnixNano: root.startTimeUnixNano + 10_000_000n,
      endTimeUnixNano: root.startTimeUnixNano + 60_000_000n,
    });
    const childB = parsedSpan({
      spanId: "00f067aa0ba902b9",
      parentSpanId: root.spanId,
      name: "b",
      startTimeUnixNano: root.startTimeUnixNano + 40_000_000n,
      endTimeUnixNano: root.startTimeUnixNano + 90_000_000n,
    });
    const result = analyze([root, childA, childB]);
    expect(result.traces[0].spans.find((span) => span.spanId === root.spanId)?.selfTimeUs).toBe(20_000);
  });

  it("treats missing parents as roots and reports the issue", () => {
    const orphan = parsedSpan({ parentSpanId: "00f067aa0ba902ff" });
    const result = analyze([orphan]);
    expect(result.traces[0].spans[0].parentSpanId).toBeNull();
    expect(result.issues.find((issue) => issue.code === "missing_parent")?.count).toBe(1);
  });

  it("breaks cyclic parent links without recursing forever", () => {
    const first = parsedSpan({ spanId: "00f067aa0ba902b7", parentSpanId: "00f067aa0ba902b8" });
    const second = parsedSpan({ spanId: "00f067aa0ba902b8", parentSpanId: "00f067aa0ba902b7", name: "second" });
    const result = analyze([first, second]);
    expect(result.issues.find((issue) => issue.code === "cyclic_parent")?.count).toBe(2);
    expect(result.traces[0].spans.every((span) => span.parentSpanId === null)).toBe(true);
  });

  it("detects errors from status, error.type, and exception events", () => {
    const spans = [
      parsedSpan({ statusCode: 2 }),
      parsedSpan({ spanId: "00f067aa0ba902b8", attributes: { "error.type": "timeout" } }),
      parsedSpan({ spanId: "00f067aa0ba902b9", events: [{ name: "exception", timeUnixNano: null, attributes: {} }] }),
    ];
    const result = analyze(spans);
    expect(result.overview.errorCount).toBe(3);
  });

  it("sorts traces by duration and spans by relative start time", () => {
    const secondTrace = "0af7651916cd43dd8448eb211c80319c";
    const result = analyze([
      parsedSpan({ name: "late", startTimeUnixNano: 1_777_000_000_020_000_000n }),
      parsedSpan({ spanId: "00f067aa0ba902b8", name: "early" }),
      parsedSpan({ traceId: secondTrace, spanId: "11f067aa0ba902b7", name: "short", endTimeUnixNano: 1_777_000_000_010_000_000n }),
    ]);
    expect(result.traces[0].summary.traceId).toBe(TRACE);
    expect(result.traces[0].spans[0].name).toBe("early");
  });

  it("preserves parser issues", () => {
    const input: ParsedTelemetry = {
      spans: [parsedSpan()],
      issues: [{ code: "source_warning", severity: "warning", message: "source", count: 2 }],
    };
    expect(analyzeTelemetry(input).issues[0].count).toBe(2);
  });
});
