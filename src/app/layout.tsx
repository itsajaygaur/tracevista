import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
