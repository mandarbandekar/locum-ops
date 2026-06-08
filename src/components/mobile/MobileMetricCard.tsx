import { cn } from "@/lib/utils";

export function MobileMetricCard({
  label,
  value,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "primary" | "warning" | "danger";
  className?: string;
}) {
  const toneClass =
    tone === "primary"
      ? "text-[hsl(var(--m-primary))]"
      : tone === "warning"
      ? "text-[hsl(var(--m-warning))]"
      : tone === "danger"
      ? "text-[hsl(var(--m-danger))]"
      : "text-[hsl(var(--m-text))]";
  return (
    <div className={cn("mobile-card p-3.5", className)}>
      <div className="text-[11px] uppercase tracking-wide font-medium text-[hsl(var(--m-text-muted))]">
        {label}
      </div>
      <div className={cn("mt-1 text-[20px] font-semibold leading-tight", toneClass)}>
        {value}
      </div>
      {hint && <div className="text-[12px] text-[hsl(var(--m-text-muted))] mt-0.5">{hint}</div>}
    </div>
  );
}
