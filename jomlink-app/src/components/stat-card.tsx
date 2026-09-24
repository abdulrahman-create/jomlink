import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Compact metric tile used across the member dashboard.
 * Renders an icon, a value and a label in an accessible definition-style block.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "destructive";
}) {
  const toneClass = {
    default: "text-primary",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  }[tone];

  return (
    <div className="rounded-lg border border-border bg-muted p-4">
      <Icon className={cn("h-4 w-4", toneClass)} aria-hidden="true" />
      <p className="mt-2 text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground/80">{hint}</p>}
    </div>
  );
}
