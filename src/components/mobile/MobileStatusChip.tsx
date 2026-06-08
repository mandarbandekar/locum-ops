import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  paid: "bg-[hsl(var(--m-accent))] text-[hsl(var(--m-primary))]",
  sent: "bg-blue-50 text-blue-700",
  draft: "bg-slate-100 text-slate-700",
  overdue: "bg-red-50 text-red-700",
  ready: "bg-amber-50 text-amber-700",
  default: "bg-slate-100 text-slate-700",
};

export function MobileStatusChip({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const key = (status || "default").toLowerCase();
  const tone = TONE[key] ?? TONE.default;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize",
        tone,
        className
      )}
    >
      {label ?? status}
    </span>
  );
}
