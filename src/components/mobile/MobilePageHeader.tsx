import { ReactNode } from "react";
import { UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function MobilePageHeader({
  title,
  subtitle,
  right,
  showProfile = true,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  showProfile?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <header className="px-5 pt-safe pb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[26px] leading-tight font-semibold text-[hsl(var(--m-text))] tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[14px] text-[hsl(var(--m-text-muted))] mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {right}
        {showProfile && (
          <button
            type="button"
            aria-label="Open profile"
            onClick={() => navigate("/settings/profile")}
            className="h-10 w-10 rounded-full bg-[hsl(var(--m-card))] border border-[hsl(var(--m-border))] flex items-center justify-center text-[hsl(var(--m-text-muted))]"
          >
            <UserCircle2 className="h-6 w-6" />
          </button>
        )}
      </div>
    </header>
  );
}
