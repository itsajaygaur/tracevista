import { Github } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { TraceWorkbench } from "@/components/trace-workbench";

export default function HomePage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <nav className="border-b border-border" aria-label="Primary navigation">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between px-5 py-4 sm:px-8">
          <a href="#top" className="focus-ring flex items-center gap-3 rounded-sm" aria-label="TraceVista home">
            <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-primary text-primary-foreground">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
                <path d="M4 7h4l2.3 10L14 4l2.2 9H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-base font-semibold tracking-tight">TraceVista</span>
            <span className="mono-label hidden text-muted-foreground md:inline">/ OTLP inspector</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="mono-label hidden text-muted-foreground sm:block">Local-only · no uploads</span>
            <ThemeToggle />
            <a
              href="https://github.com/itsajaygaur/tracevista"
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex size-9 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="View TraceVista on GitHub"
            >
              <Github className="size-[18px]" aria-hidden="true" />
            </a>
          </div>
        </div>
      </nav>

      <TraceWorkbench />

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="mono-label text-muted-foreground">Built for engineers who want signal before setup</p>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <a className="focus-ring rounded-sm hover:text-foreground" href="https://opentelemetry.io/docs/specs/otel/protocol/file-exporter/" target="_blank" rel="noreferrer">
              OTLP format
            </a>
            <a className="focus-ring rounded-sm hover:text-foreground" href="https://github.com/itsajaygaur/tracevista" target="_blank" rel="noreferrer">
              Source code
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
