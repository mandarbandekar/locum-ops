import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
}

export function MobileEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  compact = false,
}: MobileEmptyStateProps) {
  return (
    <div
      className={cn(
        "mobile-card flex flex-col items-center text-center",
        compact ? "p-5" : "px-5 py-8",
        className
      )}
    >
      {Icon && (
        <div className="h-12 w-12 rounded-full bg-[hsl(var(--m-accent))] text-[hsl(var(--m-primary))] flex items-center justify-center mb-3">
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      )}
      <div
        className="font-semibold text-[hsl(var(--m-text))]"
        style={{ fontSize: "var(--m-text-md)" }}
      >
        {title}
      </div>
      {description && (
        <div
          className="mt-1 text-[hsl(var(--m-text-muted))] max-w-[260px]"
          style={{ fontSize: "var(--m-text-sm)", lineHeight: 1.4 }}
        >
          {description}
        </div>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="m-press mt-4 inline-flex items-center justify-center min-h-[40px] px-5 rounded-full bg-[hsl(var(--m-primary))] text-[hsl(var(--m-primary-fg))] font-semibold"
          style={{ fontSize: "var(--m-text-sm)" }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
