import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Receipt,
  ShieldCheck,
  Calculator,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { trackOnboarding } from '@/lib/onboardingAnalytics';

interface Props {
  firstName?: string;
  onContinue: () => void;
}

const BENEFITS = [
  {
    icon: Building2,
    title: 'One home for every clinic',
    body: 'Store contracts, contacts, rates, and notes — all per facility, always at hand.',
  },
  {
    icon: Receipt,
    title: 'Shifts → invoices, automatically',
    body: 'Log a shift and a draft invoice writes itself, ready to send when you are.',
  },
  {
    icon: ShieldCheck,
    title: 'Never miss a renewal',
    body: 'License, DEA, and CE tracking with proactive reminders before deadlines.',
  },
  {
    icon: Calculator,
    title: 'Tax-ready year-round',
    body: 'Real-time withholding nudges and CPA-ready exports — no scramble in April.',
  },
];

export function OnboardingWelcomeScreen({ firstName, onContinue }: Props) {
  useEffect(() => {
    trackOnboarding('onboarding_welcome_viewed' as any, {});
  }, []);

  const handleContinue = () => {
    trackOnboarding('onboarding_welcome_continued' as any, {});
    onContinue();
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Decorative background orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 h-[480px] w-[480px] rounded-full bg-primary/20 blur-3xl opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -right-40 h-[420px] w-[420px] rounded-full bg-accent/20 blur-3xl opacity-50"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-1/3 h-[360px] w-[360px] rounded-full bg-primary/15 blur-3xl opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80"
      />

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-12">
        {/* Eyebrow */}
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Welcome to LocumOps
        </div>

        {/* Hero */}
        <h1
          className="text-center font-[Manrope] text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl animate-in fade-in slide-in-from-bottom-4 duration-700"
          style={{ animationDelay: '60ms', animationFillMode: 'backwards' }}
        >
          {firstName ? `Welcome, ${firstName}.` : 'Your relief practice,'}
          <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            organized end-to-end.
          </span>
        </h1>

        <p
          className="mt-5 max-w-2xl text-center text-base text-muted-foreground sm:text-lg animate-in fade-in slide-in-from-bottom-4 duration-700"
          style={{ animationDelay: '160ms', animationFillMode: 'backwards' }}
        >
          One workspace for clinics, shifts, invoices, credentials, and taxes —
          built for independent locum clinicians who'd rather practice than push paper.
        </p>

        {/* Benefit grid */}
        <div className="mt-12 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 animate-in fade-in slide-in-from-bottom-4 duration-700"
                style={{
                  animationDelay: `${260 + i * 90}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-[Manrope] text-base font-semibold text-foreground">
                      {b.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {b.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div
          className="mt-10 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700"
          style={{ animationDelay: '700ms', animationFillMode: 'backwards' }}
        >
          <Button onClick={handleContinue} size="lg" className="h-12 px-8 text-base">
            Let's get set up
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Takes about 3 minutes
          </div>
        </div>
      </div>
    </div>
  );
}
