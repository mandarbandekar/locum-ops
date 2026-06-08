import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileFab({
  onClick,
  label,
  className,
  iconOnly = false,
}: {
  onClick: () => void;
  label: string;
  className?: string;
  iconOnly?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "fixed right-5 z-30 inline-flex items-center justify-center bg-[hsl(var(--m-primary))] text-[hsl(var(--m-primary-fg))] shadow-none",
        iconOnly
          ? "h-12 w-12 rounded-full"
          : "h-14 px-5 gap-2 rounded-full font-semibold text-[14px]",
        className
      )}
      style={{ bottom: "calc(var(--m-bottom-nav-h) + var(--m-safe-bottom) + 16px)" }}
    >
      <Plus className={iconOnly ? "h-6 w-6" : "h-5 w-5"} />
      {!iconOnly && label}
    </button>
  );
}
