import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tracevista.vercel.app"),
  title: "TraceVista — OpenTelemetry Trace Inspector",
  description: "Inspect OTLP traces locally with service maps, waterfall timelines, latency percentiles, and critical-chain analysis.",
  applicationName: "TraceVista",
  keywords: ["OpenTelemetry", "OTLP", "distributed tracing", "observability", "trace visualization"],
  authors: [{ name: "Ajay Gaur", url: "https://ajaygaur.in" }],
  creator: "Ajay Gaur",
  openGraph: {
    title: "TraceVista — Understand every millisecond",
    description: "A privacy-first OpenTelemetry trace inspector that runs entirely in your browser.",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "TraceVista — OpenTelemetry Trace Inspector",
    description: "Private, local OTLP trace analysis with no backend and no uploads.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#222327" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${instrumentSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
