import { ImageResponse } from "next/og";

export const alt = "TraceVista — Privacy-first OpenTelemetry trace inspector";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0f172a",
        color: "white",
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 28, fontWeight: 700 }}>
        <div style={{ width: 48, height: 48, borderRadius: 13, background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>⌁</div>
        TraceVista
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 68, lineHeight: 1.05, maxWidth: 920, fontWeight: 750, letterSpacing: -3 }}>Understand every millisecond.</div>
        <div style={{ color: "#94a3b8", fontSize: 28 }}>Private OTLP trace analysis. No backend. Nothing uploaded.</div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {['Service maps', 'Waterfall timelines', 'Critical-chain analysis'].map((label) => (
          <div key={label} style={{ border: "1px solid #334155", borderRadius: 999, padding: "10px 18px", color: "#cbd5e1", fontSize: 18 }}>{label}</div>
        ))}
      </div>
    </div>,
    size,
  );
}
