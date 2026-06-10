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
      className="fixed bottom-0 inset-x-0 z-40 backdrop-blur-md border-t border-[hsl(var(--m-border))]"
      style={{
        paddingBottom: "var(--m-safe-bottom)",
        background: "hsl(var(--m-card) / 0.92)",
      }}
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
                  "m-press relative flex flex-col items-center justify-center gap-0.5 py-2 min-h-[var(--m-tap)] font-medium",
                  active
                    ? "text-[hsl(var(--m-primary))]"
                    : "text-[hsl(var(--m-text-muted))]"
                )}
                style={{ fontSize: "var(--m-text-xs)" }}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <span className="absolute top-0 h-[3px] w-7 rounded-b-full bg-[hsl(var(--m-primary))]" />
                )}
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 1.8} />
                <span>{tab.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
