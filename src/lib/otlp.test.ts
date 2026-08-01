import { describe, expect, it } from "vitest";

import { ImportFailure, MAX_IMPORT_BYTES, decodeAttributes, parseOtlpText } from "@/lib/otlp";
import { SAMPLE_OTLP, SAMPLE_TEXT } from "@/lib/sample";

const TRACE_ID = "4bf92f3577b34da6a3ce929d0e0e4736";
const SPAN_ID = "00f067aa0ba902b7";

function documentWith(spans: unknown[], resourceAttributes: unknown[] = [{ key: "service.name", value: { stringValue: "api" } }]) {
  return {
    resourceSpans: [{
      resource: { attributes: resourceAttributes },
      scopeSpans: [{ spans }],
    }],
  };
}

function validSpan(overrides: Record<string, unknown> = {}) {
  return {
    traceId: TRACE_ID,
    spanId: SPAN_ID,
    name: "GET /health",
    startTimeUnixNano: "1777000000000000000",
    endTimeUnixNano: "1777000000005000000",
    status: { code: 1 },
    ...overrides,
  };
}

describe("OTLP parser", () => {
  it("parses the synthetic OTLP fixture and preserves BigInt timestamps", () => {
    const parsed = parseOtlpText(SAMPLE_TEXT);
    expect(parsed.spans).toHaveLength(21);
    expect(parsed.spans[0].startTimeUnixNano).toBeTypeOf("bigint");
    expect(new Set(parsed.spans.map((span) => span.serviceName))).toContain("payment-api");
    expect(parsed.issues).toEqual([]);
  });

  it("decodes all supported OTLP AnyValue shapes", () => {
    expect(decodeAttributes([
      { key: "text", value: { stringValue: "hello" } },
      { key: "flag", value: { boolValue: true } },
      { key: "count", value: { intValue: "9007199254740993" } },
      { key: "ratio", value: { doubleValue: 1.5 } },
      { key: "bytes", value: { bytesValue: "AQI=" } },
      { key: "list", value: { arrayValue: { values: [{ stringValue: "a" }, { intValue: 2 }] } } },
      { key: "map", value: { kvlistValue: { values: [{ key: "nested", value: { stringValue: "yes" } }] } } },
      { key: "empty", value: {} },
      { nope: "ignored" },
    ])).toEqual({
      text: "hello",
      flag: true,
      count: "9007199254740993",
      ratio: 1.5,
      bytes: "AQI=",
      list: ["a", 2],
      map: { nested: "yes" },
      empty: null,
    });
  });

  it("parses JSONL, skips malformed lines, and aggregates warnings", () => {
    const first = JSON.stringify(documentWith([validSpan()]));
    const second = JSON.stringify(documentWith([
      validSpan({ spanId: "00f067aa0ba902b8", name: "child", parentSpanId: SPAN_ID }),
      validSpan({ spanId: "invalid", name: "bad" }),
    ]));
    const parsed = parseOtlpText(`${first}\nnot-json\n[]\n${second}`);
    expect(parsed.spans).toHaveLength(2);
    expect(parsed.issues.find((issue) => issue.code === "malformed_jsonl_line")?.count).toBe(2);
    expect(parsed.issues.find((issue) => issue.code === "invalid_span")?.count).toBe(1);
  });

  it("deduplicates spans and falls back when service.name is missing", () => {
    const text = JSON.stringify(documentWith([validSpan(), validSpan()], []));
    const parsed = parseOtlpText(text);
    expect(parsed.spans).toHaveLength(1);
    expect(parsed.spans[0].serviceName).toBe("unknown_service");
    expect(parsed.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["duplicate_span", "missing_service_name"]));
  });

  it("parses span status, events, attributes, kind, and optional parent", () => {
    const text = JSON.stringify(documentWith([validSpan({
      kind: 3,
      parentSpanId: "00f067aa0ba902b8",
      attributes: [{ key: "error.type", value: { stringValue: "timeout" } }],
      status: { code: "2", message: "timed out" },
      events: [
        { name: "exception", timeUnixNano: "1777000000004000000", attributes: [{ key: "exception.type", value: { stringValue: "TimeoutError" } }] },
        { bad: true },
      ],
    })]));
    const parsed = parseOtlpText(text);
    expect(parsed.spans[0]).toMatchObject({ kind: 3, statusCode: 2, statusMessage: "timed out", parentSpanId: "00f067aa0ba902b8" });
    expect(parsed.spans[0].events).toHaveLength(1);
  });

  it.each([
    ["", "empty"],
    ["not json", "neither valid"],
    ["[]", "top-level"],
    [JSON.stringify({ logs: [] }), "No OTLP traces"],
    [JSON.stringify(documentWith([])), "No valid spans"],
    [JSON.stringify(documentWith([validSpan({ traceId: "0".repeat(32) })])), "No valid spans"],
    [JSON.stringify(documentWith([validSpan({ endTimeUnixNano: "1" })])), "No valid spans"],
  ])("rejects invalid input: %s", (text, message) => {
    expect(() => parseOtlpText(text)).toThrow(new RegExp(message, "i"));
  });

  it("enforces the byte limit", () => {
    expect(() => parseOtlpText("x".repeat(MAX_IMPORT_BYTES + 1))).toThrow(ImportFailure);
  });

  it("accepts the exported fixture as a normal JSON object", () => {
    expect(SAMPLE_OTLP.resourceSpans.length).toBeGreaterThan(3);
  });
});
