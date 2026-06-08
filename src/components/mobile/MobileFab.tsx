import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileFab({
  onClick,
  label,
  className,
}: {
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "mobile-fab fixed right-5 z-30 inline-flex items-center gap-2 h-14 px-5 rounded-full bg-[hsl(var(--m-primary))] text-[hsl(var(--m-primary-fg))] font-semibold text-[14px]",
        className
      )}
      style={{ bottom: "calc(var(--m-bottom-nav-h) + var(--m-safe-bottom) + 16px)" }}
    >
      <Plus className="h-5 w-5" />
      {label}
    </button>
  );
}
