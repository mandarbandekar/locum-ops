import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Building2, CalendarClock, DollarSign, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const steps = [
  {
    icon: Building2,
    title: 'Add your clinics',
    description: 'The hospitals and practices you work with.',
    time: '~2 min',
  },
  {
    icon: CalendarClock,
    title: 'Log a few shifts',
    description: 'Past or upcoming — we'll use these to generate invoices.',
    time: '~3 min',
  },
  {
    icon: DollarSign,
    title: 'See your tax estimate',
    description: 'Your projected quarterly self-employment tax, instantly.',
    time: '~1 min',
  },
];

export default function WelcomePage() {
  const navigate = useNavigate();
  const { updateProfile, completeOnboarding } = useUserProfile();

  const handleGetStarted = async () => {
    await updateProfile({ has_seen_welcome: true } as any);
    navigate('/onboarding', { replace: true });
  };

  const handleSkip = async () => {
    await updateProfile({ has_seen_welcome: true } as any);
    await completeOnboarding();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">L</span>
          </div>
          <span className="text-xl font-semibold text-foreground tracking-tight">Locum Ops</span>
        </div>

        {/* Headline */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Welcome to Locum Ops</h1>
          <p className="text-muted-foreground text-base">The business command center for relief vets.</p>
        </div>

        {/* Value proposition */}
        <div className="w-full rounded-xl bg-primary/10 border border-primary/20 px-5 py-4 text-sm text-foreground leading-relaxed text-center">
          We'll help you track shifts, generate invoices, and estimate your quarterly taxes — all in one place. No spreadsheets, no guesswork.
        </div>

        {/* Steps */}
        <div className="w-full space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Here's what we'll set up</p>
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground text-sm">{step.title}</p>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full whitespace-nowrap">{step.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total time */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Total setup time: about 5 minutes</span>
        </div>

        {/* CTAs */}
        <div className="w-full space-y-3">
          <Button onClick={handleGetStarted} className="w-full" size="lg">
            Let's Get Started <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
          <button
            onClick={handleSkip}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            I'll explore on my own
          </button>
        </div>
      </div>
    </div>
  );
}
