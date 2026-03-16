import { ArrowLeft, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import onboardingIllustration from '@/assets/onboarding-illustration.png';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  step: number;
  totalSteps: number;
  stepLabel: string;
  onBack?: () => void;
  onSkip?: () => void;
  skipLabel?: string;
}

export function OnboardingLayout({
  children,
  step,
  totalSteps,
  stepLabel,
  onBack,
  onSkip,
  skipLabel = 'Skip for now',
}: OnboardingLayoutProps) {
  const progress = (step / totalSteps) * 100;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
      {/* Top progress bar */}
      <div className="shrink-0 px-6 pt-4 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Step {step} of {totalSteps}
            </span>
          </div>
          {onSkip && (
            <Button variant="ghost" size="sm" onClick={onSkip} className="gap-1.5 text-muted-foreground hover:text-foreground">
              {skipLabel}
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <Progress value={progress} className="h-1.5" />
        <p className="text-xs text-muted-foreground">{stepLabel}</p>
      </div>

      {/* Split content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: form area */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-12 overflow-y-auto">
          <div className="w-full max-w-lg py-6">
            {children}
          </div>
        </div>

        {/* Right: decorative panel (hidden on mobile) */}
        <div className="hidden lg:flex w-[420px] xl:w-[480px] shrink-0 bg-muted/50 items-center justify-center p-8">
          <img
            src={onboardingIllustration}
            alt="LocumOps onboarding"
            className="max-w-full max-h-[70vh] object-contain opacity-90"
          />
        </div>
      </div>
    </div>
  );
}
