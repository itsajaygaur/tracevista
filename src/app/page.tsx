import { Github, ShieldCheck } from "lucide-react";

import { TraceWorkbench } from "@/components/trace-workbench";

export default function HomePage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <div className="app-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[44rem] opacity-70" />
      <nav className="mx-auto flex w-full max-w-[1480px] items-center justify-between px-5 py-5 sm:px-8" aria-label="Primary navigation">
        <a href="#top" className="focus-ring flex items-center gap-3 rounded-lg" aria-label="TraceVista home">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
              <path d="M4 7h4l2.3 10L14 4l2.2 9H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-base font-bold tracking-tight">TraceVista</span>
        </a>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 sm:flex">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Local-only analysis
          </span>
          <a
            href="https://github.com/itsajaygaur/tracevista"
            target="_blank"
            rel="noreferrer"
            className="focus-ring inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="View TraceVista on GitHub"
          >
            <Github className="size-[18px]" aria-hidden="true" />
          </a>
        </div>
      </nav>

      <TraceWorkbench />

      <footer className="mx-auto flex w-full max-w-[1480px] flex-col gap-3 px-5 py-10 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>Built for engineers who want signal before setup.</p>
        <div className="flex gap-4">
          <a className="hover:text-foreground" href="https://opentelemetry.io/docs/specs/otel/protocol/file-exporter/" target="_blank" rel="noreferrer">OTLP format</a>
          <a className="hover:text-foreground" href="https://github.com/itsajaygaur/tracevista" target="_blank" rel="noreferrer">Source code</a>
        </div>
      </footer>
    </main>
  );
}
