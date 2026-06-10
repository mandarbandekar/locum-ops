import { ReactNode, useEffect, useState } from "react";
import { ChevronLeft, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function MobilePageHeader({
  title,
  subtitle,
  right,
  showProfile = true,
  onBack,
  sticky = true,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  showProfile?: boolean;
  onBack?: () => void;
  sticky?: boolean;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!sticky) return;
    const scroller = document.querySelector(".mobile-shell main");
    if (!scroller) return;
    const onScroll = () => setScrolled((scroller as HTMLElement).scrollTop > 4);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [sticky]);

  return (
    <header
      className={cn(
        "m-gutter pt-safe flex items-center gap-2",
        compact ? "pb-2" : "pb-3",
        sticky && "m-sticky-header",
        scrolled && "is-scrolled"
      )}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="m-tap m-press -ml-2 rounded-full flex items-center justify-center text-[hsl(var(--m-text))]"
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={2.2} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className={cn("m-title text-[hsl(var(--m-text))] truncate", compact && "text-[17px]")}>
          {title}
        </h1>
        {subtitle && !compact && (
          <p className="m-subtitle mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {right}
        {showProfile && !onBack && (
          <button
            type="button"
            aria-label="Open profile"
            onClick={() => navigate("/settings")}
            className="m-tap m-press rounded-full bg-[hsl(var(--m-card))] border border-[hsl(var(--m-border))] flex items-center justify-center text-[hsl(var(--m-text-muted))]"
          >
            <UserCircle2 className="h-5 w-5" />
          </button>
        )}
      </div>
    </header>
  );
}
