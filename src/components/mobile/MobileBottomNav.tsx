import { NavLink, useLocation } from "react-router-dom";
import { Calendar, Home, Building2, Wallet, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Today", icon: Home, match: (p: string) => p === "/" },
  { to: "/schedule", label: "Schedule", icon: Calendar, match: (p: string) => p.startsWith("/schedule") },
  { to: "/facilities", label: "Clinics", icon: Building2, match: (p: string) => p.startsWith("/facilities") },
  { to: "/invoices", label: "Money", icon: Wallet, match: (p: string) => p.startsWith("/invoices") || p.startsWith("/expenses") },
  { to: "/business", label: "Insights", icon: BarChart3, match: (p: string) => p.startsWith("/business") },
];

export function MobileBottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-40 bg-[hsl(var(--m-card))] border-t border-[hsl(var(--m-border))]"
      style={{ paddingBottom: "var(--m-safe-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match(pathname);
          return (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[64px] text-[11px] font-medium transition-colors",
                  active
                    ? "text-[hsl(var(--m-primary))]"
                    : "text-[hsl(var(--m-text-muted))] hover:text-[hsl(var(--m-text))]"
                )}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-[hsl(var(--m-primary))]" />
                )}
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                <span>{tab.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
