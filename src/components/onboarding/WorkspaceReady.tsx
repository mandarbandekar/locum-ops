import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, LayoutDashboard, CalendarDays, Building2, FileText, ArrowRight } from 'lucide-react';
import { CalendarSyncStep } from '@/components/onboarding/CalendarSyncStep';
import type { Facility, Shift, Invoice } from '@/types';

interface Props {
  facilities: Facility[];
  shifts: Shift[];
  invoices: Invoice[];
  taxEnabled: boolean;
  shiftRate: number | null;
  onNavigate: (path: string) => void;
  onCompleteOnboarding: () => Promise<void>;
}

interface ResultItem {
  icon: string;
  label: string;
  detail: string;
  completed: boolean;
  link?: string;
}

export function WorkspaceReady({ facilities, shifts, invoices, taxEnabled, shiftRate, onNavigate, onCompleteOnboarding }: Props) {
  const [calendarDone, setCalendarDone] = useState(false);
  const [completing, setCompleting] = useState(false);

  const draftInvoice = invoices.find(i => i.status === 'draft');
  const quarterlyEst = shiftRate ? shiftRate * 60 * 0.3 : null;

  const results: ResultItem[] = [
    {
      icon: '🏥',
      label: 'Clinic CRM',
      detail: facilities.length > 0 ? `${facilities[0].name} added` : 'No clinics yet',
      completed: facilities.length > 0,
      link: '/facilities',
    },
    {
      icon: '📋',
      label: 'Shift Log',
      detail: shifts.length > 0 ? `${shifts.length} shift${shifts.length !== 1 ? 's' : ''} tracked` : 'No shifts yet',
      completed: shifts.length > 0,
      link: '/schedule',
    },
    {
      icon: '📄',
      label: 'Invoice',
      detail: draftInvoice ? `$${draftInvoice.total_amount.toLocaleString()} draft ready to send` : 'No invoices yet',
      completed: !!draftInvoice,
      link: '/invoices',
    },
    {
      icon: '🧮',
      label: 'Tax Estimate',
      detail: taxEnabled && quarterlyEst
        ? `$${quarterlyEst.toLocaleString(undefined, { maximumFractionDigits: 0 })} quarterly projection`
        : 'Disabled',
      completed: taxEnabled,
      link: '/taxes',
    },
  ];

  const nextSteps = [
    'Add your credentials (DEA, state license, USDA)',
    'Set up email reminders for invoices',
    'Customize your invoice template',
    'Log more shifts to improve tax accuracy',
  ];

  const handleNavigate = async (path: string) => {
    if (completing) return;
    setCompleting(true);
    await onCompleteOnboarding();
    onNavigate(path);
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Calendar Sync */}
      {!calendarDone && (
        <div className="space-y-2">
          <div>
            <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Sync your shifts to your calendar</h2>
            <p className="text-muted-foreground mt-1">Optional — you can set this up later in Settings.</p>
          </div>
          <CalendarSyncStep onContinue={() => setCalendarDone(true)} />
        </div>
      )}

      {/* Section 2: Completion Summary — shown after calendar sync is done/skipped */}
      {calendarDone && (
      <div className="space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Check className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground font-[Manrope]">You're all set</h2>
          <p className="text-muted-foreground">Your relief business has a home now. Here's what's ready:</p>
        </div>

        {/* Result Cards */}
        <div className="space-y-2">
          {results.map((item, i) => (
            <Card
              key={item.label}
              className={`animate-slide-up ${!item.completed ? 'opacity-60' : ''}`}
              style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
            >
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
                {item.completed ? (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  item.link && (
                    <button
                      type="button"
                      onClick={() => handleNavigate(item.link!)}
                      className="text-xs text-primary hover:underline shrink-0"
                    >
                      Set up →
                    </button>
                  )
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Optional Next Steps */}
        <Card className="bg-muted/30">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Optional next steps</p>
            {nextSteps.map(step => (
              <div key={step} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 rounded border border-border shrink-0" />
                <span>{step}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Navigation CTAs */}
        <div className="space-y-2">
          <Button
            className="w-full"
            size="lg"
            onClick={() => handleNavigate('/')}
            disabled={completing}
          >
            <LayoutDashboard className="mr-2 h-5 w-5" /> Go to Dashboard
          </Button>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={() => handleNavigate('/schedule')} disabled={completing}>
              <CalendarDays className="mr-1.5 h-4 w-4" /> Schedule
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleNavigate('/facilities')} disabled={completing}>
              <Building2 className="mr-1.5 h-4 w-4" /> Clinics
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleNavigate('/invoices')} disabled={completing}>
              <FileText className="mr-1.5 h-4 w-4" /> Invoices
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
