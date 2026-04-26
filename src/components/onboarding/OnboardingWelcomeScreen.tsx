import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock } from 'lucide-react';
import { trackOnboarding } from '@/lib/onboardingAnalytics';
import { LocumOpsMark } from '@/components/brand/LocumOpsMark';

interface Props {
  firstName?: string;
  onContinue: () => void;
}

/* ---------------- Motif SVGs ---------------- */

function ClinicMotif() {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="clinic-roof" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.85" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {/* Back building */}
      <rect x="14" y="36" width="30" height="42" rx="3" fill="hsl(var(--primary))" fillOpacity="0.18" />
      <rect x="20" y="44" width="5" height="5" rx="1" fill="hsl(var(--primary))" fillOpacity="0.45" />
      <rect x="29" y="44" width="5" height="5" rx="1" fill="hsl(var(--primary))" fillOpacity="0.45" />
      <rect x="20" y="54" width="5" height="5" rx="1" fill="hsl(var(--primary))" fillOpacity="0.45" />
      <rect x="29" y="54" width="5" height="5" rx="1" fill="hsl(var(--primary))" fillOpacity="0.45" />

      {/* Front clinic with cross */}
      <rect x="38" y="28" width="44" height="50" rx="4" fill="url(#clinic-roof)" />
      <rect x="56" y="38" width="8" height="20" rx="1.5" fill="hsl(var(--card))" />
      <rect x="50" y="44" width="20" height="8" rx="1.5" fill="hsl(var(--card))" />
      <rect x="46" y="62" width="8" height="16" rx="1" fill="hsl(var(--primary-foreground))" fillOpacity="0.3" />
      <rect x="66" y="62" width="8" height="16" rx="1" fill="hsl(var(--primary-foreground))" fillOpacity="0.3" />

      {/* Pin marker — bobs on hover */}
      <g
        className="origin-center transition-transform duration-500 motion-safe:group-hover:-translate-y-1"
        style={{ transformBox: 'fill-box' }}
      >
        <circle cx="72" cy="22" r="9" fill="hsl(var(--accent))" />
        <circle cx="72" cy="22" r="3" fill="hsl(var(--card))" />
        <path d="M72 31 L68 36 L76 36 Z" fill="hsl(var(--accent))" />
      </g>

      {/* ground line */}
      <line x1="8" y1="80" x2="88" y2="80" stroke="hsl(var(--border))" strokeWidth="1" />
    </svg>
  );
}

function InvoiceMotif() {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden>
      {/* Shift card (left) */}
      <g className="transition-transform duration-500 motion-safe:group-hover:-translate-x-0.5">
        <rect x="8" y="22" width="34" height="46" rx="4" fill="hsl(var(--primary))" fillOpacity="0.16" stroke="hsl(var(--primary))" strokeOpacity="0.35" />
        <rect x="13" y="29" width="14" height="3" rx="1" fill="hsl(var(--primary))" fillOpacity="0.6" />
        <rect x="13" y="36" width="22" height="2" rx="1" fill="hsl(var(--primary))" fillOpacity="0.35" />
        <rect x="13" y="42" width="18" height="2" rx="1" fill="hsl(var(--primary))" fillOpacity="0.35" />
        <rect x="13" y="56" width="10" height="6" rx="1.5" fill="hsl(var(--primary))" fillOpacity="0.7" />
      </g>

      {/* Arrow */}
      <g className="transition-transform duration-500 motion-safe:group-hover:translate-x-1">
        <path d="M44 45 L54 45" stroke="hsl(var(--accent))" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M51 41 L55 45 L51 49" stroke="hsl(var(--accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      {/* Invoice card (right) */}
      <g className="transition-transform duration-500 motion-safe:group-hover:translate-x-0.5">
        <rect x="56" y="18" width="34" height="54" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--accent))" strokeOpacity="0.55" />
        <rect x="61" y="25" width="16" height="3" rx="1" fill="hsl(var(--accent))" fillOpacity="0.85" />
        <rect x="61" y="33" width="24" height="2" rx="1" fill="hsl(var(--foreground))" fillOpacity="0.25" />
        <rect x="61" y="38" width="20" height="2" rx="1" fill="hsl(var(--foreground))" fillOpacity="0.25" />
        <rect x="61" y="43" width="22" height="2" rx="1" fill="hsl(var(--foreground))" fillOpacity="0.25" />
        <line x1="61" y1="50" x2="85" y2="50" stroke="hsl(var(--border))" strokeWidth="1" />
        <rect x="61" y="55" width="10" height="3" rx="1" fill="hsl(var(--foreground))" fillOpacity="0.4" />
        <rect x="73" y="55" width="12" height="3" rx="1" fill="hsl(var(--accent))" />
        <circle cx="80" cy="66" r="4" fill="hsl(var(--accent))" fillOpacity="0.18" />
        <path d="M77.5 66 L79.5 68 L82.5 64.5" stroke="hsl(var(--accent))" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </svg>
  );
}

function RenewalMotif() {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="shield-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      {/* Shield */}
      <path
        d="M48 14 L74 22 V46 C74 62 62 74 48 80 C34 74 22 62 22 46 V22 Z"
        fill="url(#shield-grad)"
      />
      <path
        d="M48 14 L74 22 V46 C74 62 62 74 48 80 C34 74 22 62 22 46 V22 Z"
        fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.5" strokeWidth="1.2"
      />

      {/* Clock arc */}
      <circle cx="48" cy="46" r="16" fill="hsl(var(--card))" />
      <circle cx="48" cy="46" r="16" fill="none" stroke="hsl(var(--accent))" strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="3 3" />

      {/* Hour marks */}
      <circle cx="48" cy="32" r="1" fill="hsl(var(--foreground))" fillOpacity="0.5" />
      <circle cx="62" cy="46" r="1" fill="hsl(var(--foreground))" fillOpacity="0.5" />
      <circle cx="48" cy="60" r="1" fill="hsl(var(--foreground))" fillOpacity="0.5" />
      <circle cx="34" cy="46" r="1" fill="hsl(var(--foreground))" fillOpacity="0.5" />

      {/* Clock hands — minute hand rotates on hover */}
      <g
        className="origin-center transition-transform duration-700 motion-safe:group-hover:rotate-45"
        style={{ transformOrigin: '48px 46px' }}
      >
        <line x1="48" y1="46" x2="48" y2="36" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
      </g>
      <line x1="48" y1="46" x2="56" y2="46" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
      <circle cx="48" cy="46" r="1.8" fill="hsl(var(--accent))" />

      {/* Tick badge */}
      <g className="transition-transform duration-500 motion-safe:group-hover:scale-110" style={{ transformOrigin: '70px 64px' }}>
        <circle cx="70" cy="64" r="7" fill="hsl(var(--accent))" />
        <path d="M67 64 L69.2 66 L73 62" stroke="hsl(var(--card))" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </svg>
  );
}

function TaxMotif() {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden>
      {/* Calendar */}
      <rect x="14" y="22" width="50" height="56" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeOpacity="0.4" />
      <rect x="14" y="22" width="50" height="12" rx="4" fill="hsl(var(--primary))" fillOpacity="0.85" />
      <rect x="20" y="18" width="3" height="9" rx="1" fill="hsl(var(--primary))" />
      <rect x="55" y="18" width="3" height="9" rx="1" fill="hsl(var(--primary))" />

      {/* Calendar grid */}
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2, 3, 4].map((col) => {
          const isQ = row === 2 && col === 2;
          return (
            <rect
              key={`${row}-${col}`}
              x={19 + col * 8}
              y={40 + row * 8}
              width="5"
              height="5"
              rx="1"
              fill={isQ ? 'hsl(var(--accent))' : 'hsl(var(--foreground))'}
              fillOpacity={isQ ? 1 : 0.18}
            />
          );
        })
      )}

      {/* Sparkline panel — draws on hover */}
      <g>
        <rect x="58" y="50" width="30" height="28" rx="3" fill="hsl(var(--accent))" fillOpacity="0.1" stroke="hsl(var(--accent))" strokeOpacity="0.3" />
        <path
          d="M62 72 L68 66 L72 69 L78 60 L84 55"
          stroke="hsl(var(--accent))"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="60"
          strokeDashoffset="60"
          className="motion-safe:group-hover:[stroke-dashoffset:0] transition-all duration-700"
          style={{ animation: 'spark-draw 1.2s ease-out 0.6s forwards' }}
        />
        <circle cx="84" cy="55" r="2" fill="hsl(var(--accent))" />
      </g>

      <style>{`
        @keyframes spark-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  );
}

/* ---------------- Benefits ---------------- */

const BENEFITS = [
  {
    Motif: ClinicMotif,
    title: 'One home for every clinic',
    body: 'Contracts, contacts, rates, and notes — all per facility, always at hand.',
  },
  {
    Motif: InvoiceMotif,
    title: 'Shifts → invoices, automatically',
    body: 'Log a shift; a draft invoice writes itself, ready to send when you are.',
  },
  {
    Motif: RenewalMotif,
    title: 'Never miss a renewal',
    body: 'License, DEA, and CE tracking with proactive reminders before deadlines.',
  },
  {
    Motif: TaxMotif,
    title: 'Tax-ready year-round',
    body: 'Real-time withholding nudges and CPA-ready exports — no April scramble.',
  },
];

/* ---------------- Screen ---------------- */

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
      {/* Decorative background orbs — toned down */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -right-40 h-[380px] w-[380px] rounded-full bg-accent/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-1/3 h-[340px] w-[340px] rounded-full bg-primary/8 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/90"
      />

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-10">
        {/* Brand mark — the only "Welcome to LocumOps" cue */}
        <div className="mb-7 flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-500">
          <LocumOpsMark className="h-10 w-10" />
          <span
            className="text-sm font-semibold tracking-tight text-foreground/80"
            style={{ fontFamily: '"Manrope", system-ui, sans-serif' }}
          >
            LocumOps
          </span>
          <div className="mt-2 h-px w-24 bg-gradient-to-r from-transparent via-primary/50 to-accent/40" />
        </div>

        {/* Optional small greeting */}
        {firstName && (
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80 animate-in fade-in slide-in-from-bottom-2 duration-500"
            style={{ animationDelay: '40ms', animationFillMode: 'backwards' }}
          >
            Hi {firstName} —
          </p>
        )}

        {/* Hero */}
        <h1
          className="text-center font-[Manrope] text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-[56px] md:leading-[1.05] animate-in fade-in slide-in-from-bottom-4 duration-700"
          style={{ animationDelay: '80ms', animationFillMode: 'backwards' }}
        >
          Your relief practice,
          <br />
          <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            organized end-to-end.
          </span>
        </h1>

        <p
          className="mt-5 max-w-xl text-center text-base leading-relaxed text-muted-foreground sm:text-lg animate-in fade-in slide-in-from-bottom-4 duration-700"
          style={{ animationDelay: '180ms', animationFillMode: 'backwards' }}
        >
          One workspace for clinics, shifts, invoices, credentials, and taxes —
          built for independent locum clinicians who'd rather practice than push paper.
        </p>

        {/* Benefit grid */}
        <div className="mt-10 grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
          {BENEFITS.map((b, i) => {
            const Motif = b.Motif;
            return (
              <div
                key={b.title}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 animate-in fade-in slide-in-from-bottom-4 duration-700"
                style={{
                  animationDelay: `${280 + i * 90}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex items-center gap-4">
                  {/* Motif tile */}
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/15 ring-1 ring-primary/15">
                    <div className="h-16 w-16">
                      <Motif />
                    </div>
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
          style={{ animationDelay: '720ms', animationFillMode: 'backwards' }}
        >
          <Button onClick={handleContinue} size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20">
            Let's get set up
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Takes about 3 minutes
          </div>

          {/* Reassurance pills */}
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground/80">
            <span className="rounded-full border border-border/60 bg-card/60 px-2.5 py-1">No credit card</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="rounded-full border border-border/60 bg-card/60 px-2.5 py-1">Cancel anytime</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="rounded-full border border-border/60 bg-card/60 px-2.5 py-1">Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
