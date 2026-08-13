export function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds)) return "-";
  if (milliseconds === 0) return "0 ms";
  if (milliseconds < 0.001) return "<1 µs";
  if (milliseconds < 1) return `${Math.round(milliseconds * 1000)} µs`;
  if (milliseconds < 1000) {
    const digits = milliseconds < 10 ? 2 : milliseconds < 100 ? 1 : 0;
    return `${milliseconds.toFixed(digits)} ms`;
  }
  return `${(milliseconds / 1000).toFixed(milliseconds < 10000 ? 2 : 1)} s`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: value >= 10000 ? "compact" : "standard" }).format(value);
}

export function shortId(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function formatAttributeValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return String(value ?? "null");
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}
