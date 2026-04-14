import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CalendarDays, Bell, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';

type PromptKey = 'credentials' | 'calendar' | 'notifications';

interface PromptDef {
  key: PromptKey;
  icon: React.ElementType;
  title: string;
  description: string;
  cta: string;
  link: string;
}

const PROMPTS: PromptDef[] = [
  {
    key: 'credentials',
    icon: Shield,
    title: 'Keep your credentials in one place',
    description: "Add your DEA, state license, and USDA accreditation — we'll remind you 60 days before anything expires.",
    cta: 'Add Credentials →',
    link: '/credentials',
  },
  {
    key: 'calendar',
    icon: CalendarDays,
    title: 'See your shifts in your calendar',
    description: 'Subscribe in Apple Calendar or download an .ics file to keep your schedule in sync.',
    cta: 'Set Up Calendar →',
    link: '/settings/calendar-sync',
  },
  {
    key: 'notifications',
    icon: Bell,
    title: 'Stay on top of payments',
    description: "You're getting email alerts for new invoices and overdue payments. Want to adjust what you hear about?",
    cta: 'Notification Settings →',
    link: '/settings/reminders',
  },
];

interface DashboardPromptCardsProps {
  credentialCount: number;
  shiftCount: number;
  hasSentInvoice: boolean;
  userCreatedAt?: string;
}

export function DashboardPromptCards({
  credentialCount,
  shiftCount,
  hasSentInvoice,
  userCreatedAt,
}: DashboardPromptCardsProps) {
  const { profile, updateProfile } = useUserProfile();
  const { isDemo } = useAuth();
  const navigate = useNavigate();

  const dismissed = (profile?.dismissed_prompts as Record<string, boolean> | undefined) ?? {};

  const activePrompt = useMemo<PromptDef | null>(() => {
    // Credentials: signed up >24h ago and 0 credentials
    if (!dismissed.credentials) {
      const signedUpOver24h = userCreatedAt
        ? Date.now() - new Date(userCreatedAt).getTime() > 24 * 60 * 60 * 1000
        : false;
      if (signedUpOver24h && credentialCount === 0) return PROMPTS[0];
    }

    // Calendar: 3+ shifts logged
    if (!dismissed.calendar && shiftCount >= 3) return PROMPTS[1];

    // Notifications: at least 1 sent invoice
    if (!dismissed.notifications && hasSentInvoice) return PROMPTS[2];

    return null;
  }, [dismissed, credentialCount, shiftCount, hasSentInvoice, userCreatedAt]);

  const handleDismiss = useCallback(
    async (key: PromptKey) => {
      const updated = { ...(profile?.dismissed_prompts as Record<string, boolean> ?? {}), [key]: true };
      await updateProfile({ dismissed_prompts: updated } as any);
    },
    [profile, updateProfile],
  );

  if (!activePrompt || isDemo) return null;

  const Icon = activePrompt.icon;

  return (
    <Card className="relative border-l-4 border-l-primary bg-card px-4 py-3 shrink-0">
      <button
        onClick={() => handleDismiss(activePrompt.key)}
        className="absolute top-2.5 right-2.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="rounded-lg bg-primary/10 p-2 shrink-0 mt-0.5">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground">{activePrompt.title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{activePrompt.description}</p>
          <Button
            size="sm"
            className="mt-2 h-8 text-xs"
            onClick={() => navigate(activePrompt.link)}
          >
            {activePrompt.cta}
          </Button>
        </div>
      </div>
    </Card>
  );
}
