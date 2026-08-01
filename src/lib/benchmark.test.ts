import { expect, it } from "vitest";

import { analyzeTelemetry } from "@/lib/analysis";
import { parseOtlpText } from "@/lib/otlp";

it("analyzes a deterministic 10,000-span OTLP fixture within the target", () => {
  const traceId = "4bf92f3577b34da6a3ce929d0e0e4736";
  const base = 1_777_000_000_000_000_000n;
  const spans = Array.from({ length: 10_000 }, (_, index) => {
    const spanId = (index + 1).toString(16).padStart(16, "0");
    const start = base + BigInt(index) * 10_000n;
    return {
      traceId,
      spanId,
      ...(index ? { parentSpanId: "0000000000000001" } : {}),
      name: index ? `operation.${index}` : "benchmark.root",
      startTimeUnixNano: start.toString(),
      endTimeUnixNano: (start + 5_000_000n).toString(),
      status: { code: 1 },
    };
  });
  const fixture = JSON.stringify({
    resourceSpans: [{
      resource: { attributes: [{ key: "service.name", value: { stringValue: "benchmark" } }] },
      scopeSpans: [{ spans }],
    }],
  });

  const startedAt = performance.now();
  const result = analyzeTelemetry(parseOtlpText(fixture));
  const elapsedMs = performance.now() - startedAt;
  console.info(`[benchmark] 10,000 spans analyzed in ${elapsedMs.toFixed(1)} ms`);

  expect(result.overview.spanCount).toBe(10_000);
  expect(elapsedMs).toBeLessThan(1_500);
}, 5_000);
