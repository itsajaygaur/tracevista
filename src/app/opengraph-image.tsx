import { ImageResponse } from "next/og";

export const alt = "TraceVista: Privacy-first OpenTelemetry trace inspector";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

const accent = "#8b7cf7";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#202024",
        color: "#f0eeea",
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 48, height: 48, borderRadius: 8, background: accent, color: "#202024", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>⌁</div>
        <div style={{ fontSize: 28, fontWeight: 700 }}>TraceVista</div>
        <div style={{ fontFamily: "monospace", fontSize: 18, letterSpacing: 2, color: "#9a9aa2" }}>/ OTLP INSPECTOR</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", fontSize: 70, lineHeight: 1.05, maxWidth: 940, fontWeight: 700, letterSpacing: -2 }}>
          <span>Understand every&nbsp;</span>
          <span style={{ color: accent }}>millisecond.</span>
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 22, letterSpacing: 2, color: "#9a9aa2" }}>PROCESSED LOCALLY · NOTHING UPLOADED</div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {["SERVICE MAPS", "WATERFALL TIMELINES", "CRITICAL CHAIN"].map((label) => (
          <div key={label} style={{ border: "1px solid #3a3a40", borderRadius: 4, padding: "10px 18px", color: "#c9c7c2", fontFamily: "monospace", fontSize: 17, letterSpacing: 2 }}>{label}</div>
        ))}
      </div>
    </div>,
    size,
  );
}
