import type * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "error" | "outline";

const styles: Record<BadgeVariant, string> = {
  default: "border-primary/20 bg-primary/10 text-primary",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  error: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
  outline: "border-border bg-transparent text-muted-foreground",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-sm border px-2 py-1 font-mono text-[10px] leading-none tracking-wide", styles[variant], className)}
      {...props}
    />
  );
}
