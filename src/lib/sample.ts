type AnyValue =
  | { stringValue: string }
  | { intValue: string }
  | { boolValue: boolean }
  | { doubleValue: number };

type Attribute = { key: string; value: AnyValue };

const BASE_NANO = 1_777_000_000_000_000_000n;

const attribute = (key: string, value: string | number | boolean): Attribute => {
  if (typeof value === "boolean") return { key, value: { boolValue: value } };
  if (typeof value === "number") return { key, value: { intValue: String(value) } };
  return { key, value: { stringValue: value } };
};

function span(
  traceId: string,
  spanId: string,
  parentSpanId: string | null,
  name: string,
  startMs: number,
  durationMs: number,
  options: {
    statusCode?: number;
    statusMessage?: string;
    attributes?: Attribute[];
    events?: Array<{ name: string; atMs: number; attributes?: Attribute[] }>;
    kind?: number;
  } = {},
) {
  const start = BASE_NANO + BigInt(startMs) * 1_000_000n;
  const end = start + BigInt(durationMs) * 1_000_000n;
  return {
    traceId,
    spanId,
    ...(parentSpanId ? { parentSpanId } : {}),
    name,
    kind: options.kind ?? 2,
    startTimeUnixNano: start.toString(),
    endTimeUnixNano: end.toString(),
    attributes: options.attributes ?? [],
    status: {
      code: options.statusCode ?? 1,
      ...(options.statusMessage ? { message: options.statusMessage } : {}),
    },
    events: (options.events ?? []).map((event) => ({
      name: event.name,
      timeUnixNano: (BASE_NANO + BigInt(event.atMs) * 1_000_000n).toString(),
      attributes: event.attributes ?? [],
    })),
  };
}

function resource(serviceName: string, spans: ReturnType<typeof span>[]) {
  return {
    resource: {
      attributes: [
        attribute("service.name", serviceName),
        attribute("deployment.environment.name", "demo"),
        attribute("telemetry.sdk.language", "typescript"),
      ],
    },
    scopeSpans: [{ scope: { name: "tracevista.synthetic", version: "1.0.0" }, spans }],
  };
}

const SLOW_TRACE = "4bf92f3577b34da6a3ce929d0e0e4736";
const HEALTHY_TRACE = "0af7651916cd43dd8448eb211c80319c";
const FAILED_TRACE = "7c0f5b1d64e14f6298b8683a9bb528d1";

export const SAMPLE_OTLP = {
  resourceSpans: [
    resource("web-gateway", [
      span(SLOW_TRACE, "00f067aa0ba902b7", null, "POST /checkout", 0, 620, {
        kind: 2,
        attributes: [attribute("http.request.method", "POST"), attribute("http.route", "/checkout")],
      }),
      span(HEALTHY_TRACE, "11f067aa0ba902b7", null, "POST /checkout", 800, 184, {
        kind: 2,
        attributes: [attribute("http.request.method", "POST"), attribute("http.route", "/checkout")],
      }),
      span(FAILED_TRACE, "22f067aa0ba902b7", null, "POST /checkout", 1_200, 342, {
        kind: 2,
        statusCode: 2,
        statusMessage: "payment authorization failed",
        attributes: [attribute("http.response.status_code", 502), attribute("error.type", "bad_gateway")],
      }),
    ]),
    resource("checkout-api", [
      span(SLOW_TRACE, "00f067aa0ba902b8", "00f067aa0ba902b7", "checkout.create", 18, 568, {
        attributes: [attribute("app.cart.items", 4)],
      }),
      span(SLOW_TRACE, "00f067aa0ba902b9", "00f067aa0ba902b8", "cart.validate", 28, 42),
      span(HEALTHY_TRACE, "11f067aa0ba902b8", "11f067aa0ba902b7", "checkout.create", 812, 154),
      span(FAILED_TRACE, "22f067aa0ba902b8", "22f067aa0ba902b7", "checkout.create", 1_215, 306, {
        statusCode: 2,
        statusMessage: "upstream payment error",
        attributes: [attribute("error.type", "payment_declined")],
      }),
    ]),
    resource("inventory-api", [
      span(SLOW_TRACE, "00f067aa0ba902c0", "00f067aa0ba902b8", "inventory.reserve", 78, 214),
      span(HEALTHY_TRACE, "11f067aa0ba902c0", "11f067aa0ba902b8", "inventory.reserve", 828, 45),
      span(FAILED_TRACE, "22f067aa0ba902c0", "22f067aa0ba902b8", "inventory.reserve", 1_228, 48),
    ]),
    resource("redis", [
      span(SLOW_TRACE, "00f067aa0ba902c1", "00f067aa0ba902c0", "GET inventory:sku", 88, 24, {
        kind: 3,
        attributes: [attribute("db.system.name", "redis"), attribute("cache.hit", false)],
        events: [{ name: "cache.miss", atMs: 110, attributes: [attribute("cache.key", "inventory:sku")]}],
      }),
      span(HEALTHY_TRACE, "11f067aa0ba902c1", "11f067aa0ba902c0", "GET inventory:sku", 835, 8, {
        kind: 3,
        attributes: [attribute("db.system.name", "redis"), attribute("cache.hit", true)],
      }),
    ]),
    resource("postgres", [
      span(SLOW_TRACE, "00f067aa0ba902c2", "00f067aa0ba902c0", "SELECT inventory", 118, 148, {
        kind: 3,
        attributes: [attribute("db.system.name", "postgresql"), attribute("db.operation.name", "SELECT")],
      }),
      span(SLOW_TRACE, "00f067aa0ba902c3", "00f067aa0ba902b8", "INSERT order", 304, 72, {
        kind: 3,
        attributes: [attribute("db.system.name", "postgresql"), attribute("db.operation.name", "INSERT")],
      }),
      span(HEALTHY_TRACE, "11f067aa0ba902c2", "11f067aa0ba902b8", "INSERT order", 880, 34, {
        kind: 3,
      }),
      span(FAILED_TRACE, "22f067aa0ba902c2", "22f067aa0ba902b8", "ROLLBACK order", 1_480, 24, {
        kind: 3,
      }),
    ]),
    resource("payment-api", [
      span(SLOW_TRACE, "00f067aa0ba902d0", "00f067aa0ba902b8", "payment.authorize", 386, 174, {
        events: [{ name: "retry.scheduled", atMs: 455, attributes: [attribute("retry.delay_ms", 20)] }],
      }),
      span(SLOW_TRACE, "00f067aa0ba902d1", "00f067aa0ba902d0", "provider.request", 398, 58, {
        kind: 3,
        statusCode: 2,
        statusMessage: "upstream timeout",
        attributes: [attribute("error.type", "timeout")],
        events: [{ name: "exception", atMs: 454, attributes: [attribute("exception.type", "TimeoutError")] }],
      }),
      span(SLOW_TRACE, "00f067aa0ba902d2", "00f067aa0ba902d0", "provider.request retry", 478, 64, {
        kind: 3,
        attributes: [attribute("http.response.status_code", 200), attribute("retry.count", 1)],
      }),
      span(HEALTHY_TRACE, "11f067aa0ba902d0", "11f067aa0ba902b8", "payment.authorize", 918, 38),
      span(FAILED_TRACE, "22f067aa0ba902d0", "22f067aa0ba902b8", "payment.authorize", 1_290, 174, {
        statusCode: 2,
        statusMessage: "card declined",
        attributes: [attribute("error.type", "card_declined")],
        events: [{ name: "exception", atMs: 1_452, attributes: [attribute("exception.type", "PaymentDeclined")] }],
      }),
    ]),
  ],
};

export const SAMPLE_TEXT = JSON.stringify(SAMPLE_OTLP);
