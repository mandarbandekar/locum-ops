import { cn } from "@/lib/utils";

export function MobileSegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex w-full p-1 rounded-full bg-[hsl(var(--m-card))] border border-[hsl(var(--m-border))]",
        className
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "m-press flex-1 min-h-[40px] font-medium rounded-full transition",
              active
                ? "bg-[hsl(var(--m-primary))] text-[hsl(var(--m-primary-fg))]"
                : "text-[hsl(var(--m-text-muted))]"
            )}
            style={{ fontSize: "var(--m-text-sm)" }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
