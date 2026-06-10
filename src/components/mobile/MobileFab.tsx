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
        "mobile-fab m-press fixed right-5 z-30 inline-flex items-center justify-center bg-[hsl(var(--m-primary))] text-[hsl(var(--m-primary-fg))]",
        iconOnly
          ? "h-14 w-14 rounded-full"
          : "h-14 px-5 gap-2 rounded-full font-semibold",
        className
      )}
      style={{
        bottom: "calc(var(--m-bottom-nav-h) + var(--m-safe-bottom) + 16px)",
        fontSize: "var(--m-text-md)",
      }}
    >
      <Plus className={iconOnly ? "h-6 w-6" : "h-5 w-5"} />
      {!iconOnly && label}
    </button>
  );
}
