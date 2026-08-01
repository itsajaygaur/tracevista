/// <reference lib="webworker" />

import { analyzeTelemetry } from "@/lib/analysis";
import { ImportFailure, parseOtlpText } from "@/lib/otlp";
import type { AnalysisResult } from "@/lib/types";

interface AnalyzeRequest {
  id: number;
  type: "analyze";
  text: string;
  sourceName: string;
  synthetic: boolean;
}

type AnalyzeResponse =
  | { id: number; type: "success"; result: AnalysisResult }
  | { id: number; type: "error"; message: string };

const workerScope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.addEventListener("message", (event: MessageEvent<AnalyzeRequest>) => {
  const request = event.data;
  if (request.type !== "analyze") return;

  const startedAt = performance.now();
  let response: AnalyzeResponse;
  try {
    const parsed = parseOtlpText(request.text);
    const analysis = analyzeTelemetry(parsed);
    response = {
      id: request.id,
      type: "success",
      result: {
        sourceName: request.sourceName,
        synthetic: request.synthetic,
        processingTimeMs: performance.now() - startedAt,
        ...analysis,
      },
    };
  } catch (error) {
    const message = error instanceof ImportFailure || error instanceof Error
      ? error.message
      : "Trace analysis failed unexpectedly.";
    response = { id: request.id, type: "error", message };
  }

  workerScope.postMessage(response);
});

export {};
