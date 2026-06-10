import { useNavigate } from "react-router-dom";
import {
  User,
  Calendar,
  DollarSign,
  Settings as SettingsIcon,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";

const SECTIONS = [
  {
    to: "/settings/profile",
    label: "Profile",
    sub: "Your name, business and timezone",
    icon: User,
  },
  {
    to: "/settings/calendar-sync",
    label: "Calendar Sync",
    sub: "Subscribe to your shift calendar",
    icon: Calendar,
  },
  {
    to: "/settings/rate-card",
    label: "Rate Card",
    sub: "Default rates for new shifts",
    icon: DollarSign,
  },
  {
    to: "/settings/account",
    label: "Your Account",
    sub: "Login, security and account",
    icon: SettingsIcon,
  },
];

export default function MobileSettingsPage() {
  const navigate = useNavigate();
  const { signOut, user, isDemo } = useAuth();
  const { profile } = useUserProfile();
  const name =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    (isDemo ? "Demo User" : user?.email || "");

  return (
    <div>
      <MobilePageHeader title="Settings" subtitle={name || undefined} showProfile={false} />

      <div className="m-gutter pt-2">
        <div className="rounded-2xl border border-[hsl(var(--m-border))] bg-[hsl(var(--m-card))] overflow-hidden">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            return (
              <button
                key={s.to}
                type="button"
                onClick={() => navigate(s.to)}
                className={
                  "m-press w-full flex items-center gap-3 px-4 py-3 text-left active:bg-[hsl(var(--m-bg))] min-h-[var(--m-tap)] " +
                  (i > 0 ? "border-t border-[hsl(var(--m-border))]" : "")
                }
              >
                <span className="h-9 w-9 rounded-full bg-[hsl(var(--m-bg))] flex items-center justify-center text-[hsl(var(--m-primary))] shrink-0">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-[hsl(var(--m-text))]" style={{ fontSize: "var(--m-text-md)" }}>
                    {s.label}
                  </span>
                  <span className="block m-caption truncate">
                    {s.sub}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-[hsl(var(--m-text-muted))] shrink-0" />
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={signOut}
            className="m-press w-full flex items-center justify-center gap-2 min-h-[48px] rounded-2xl border border-[hsl(var(--m-border))] bg-[hsl(var(--m-card))] text-[hsl(var(--m-text))] font-medium"
            style={{ fontSize: "var(--m-text-md)" }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>

        <p className="mt-6 text-center m-caption">
          LocumOps
        </p>
      </div>
    </div>
  );
}
