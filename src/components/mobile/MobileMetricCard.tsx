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
    <div className={cn("mobile-card p-3 min-w-0", className)}>
      <div className="m-eyebrow truncate">{label}</div>
      <div
        className={cn("mt-1 font-semibold leading-tight tracking-tight tabular-nums truncate", toneClass)}
        style={{ fontSize: "var(--m-text-xl)" }}
      >
        {value}
      </div>
      {hint && <div className="m-caption mt-0.5 truncate">{hint}</div>}
    </div>
  );
}
