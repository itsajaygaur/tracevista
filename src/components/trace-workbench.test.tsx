import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TraceWorkbench } from "@/components/trace-workbench";
import type { AnalysisResult } from "@/lib/types";

const result: AnalysisResult = {
  sourceName: "synthetic-checkout.json",
  synthetic: true,
  processingTimeMs: 12.4,
  overview: { traceCount: 1, spanCount: 1, serviceCount: 1, errorCount: 0, p50Ms: 10, p95Ms: 10 },
  issues: [],
  traces: [{
    summary: { traceId: "4bf92f3577b34da6a3ce929d0e0e4736", rootOperation: "GET /", durationMs: 10, spanCount: 1, serviceNames: ["api"], errorCount: 0, startedAtUnixNano: "1" },
    spans: [{ traceId: "4bf92f3577b34da6a3ce929d0e0e4736", spanId: "00f067aa0ba902b7", parentSpanId: null, name: "GET /", serviceName: "api", startUs: 0, endUs: 10000, durationUs: 10000, selfTimeUs: 10000, depth: 0, kind: 2, statusCode: 1, statusMessage: null, isError: false, attributes: {}, resourceAttributes: {}, events: [] }],
    serviceNodes: [{ id: "api", spanCount: 1, errorCount: 0 }],
    serviceEdges: [],
    criticalSpanIds: ["00f067aa0ba902b7"],
  }],
};

class MockWorker {
  static instance: MockWorker;
  listeners: Record<string, Array<(event: MessageEvent) => void>> = {};
  constructor() { MockWorker.instance = this; }
  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    this.listeners[type] = [...(this.listeners[type] ?? []), listener];
  }
  postMessage(message: { id: number }) {
    queueMicrotask(() => this.listeners.message?.forEach((listener) => listener({ data: { id: message.id, type: "success", result } } as MessageEvent)));
  }
  terminate() {}
}

describe("TraceWorkbench", () => {
  beforeEach(() => {
    vi.stubGlobal("Worker", MockWorker);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("loads synthetic data through the worker and renders the dashboard", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<TraceWorkbench />);
    expect(screen.getByText("Processed locally, nothing uploaded")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /load sample trace/i }));
    expect(await screen.findByRole("heading", { name: "Trace analysis" })).toBeInTheDocument();
    expect(screen.getByText("Synthetic demo data")).toBeInTheDocument();
    expect(screen.getByText("GET /")).toBeInTheDocument();
  });

  it("rejects unsupported file extensions before posting to the worker", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<TraceWorkbench />);
    const input = screen.getByLabelText("Choose an OTLP trace file");
    await user.upload(input, new File(["hello"], "trace.txt", { type: "text/plain" }));
    expect(screen.getByRole("alert")).toHaveTextContent("ending in .json or .jsonl");
  });
});
