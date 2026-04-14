import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  step: number;
  totalSteps: number;
  stepLabel: string;
  onBack?: () => void;
  /** Sticky bottom CTA content — rendered in fixed bar at bottom */
  stickyFooter?: React.ReactNode;
}

export function OnboardingLayout({
  children,
  step,
  totalSteps,
  stepLabel,
  onBack,
  stickyFooter,
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
        </div>
        <Progress value={progress} className="h-1.5" />
        <p className="text-xs text-muted-foreground">{stepLabel}</p>
      </div>

      {/* Full-width centered content — no illustration panel */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6">
        <div className="w-full max-w-[680px] mx-auto pt-6 pb-32">
          {children}
        </div>
      </div>

      {/* Sticky bottom CTA bar */}
      {stickyFooter && (
        <div className="shrink-0 border-t border-border/50 bg-background px-4 pt-3 pb-4">
          <div className="w-full max-w-[680px] mx-auto space-y-2">
            {stickyFooter}
          </div>
        </div>
      )}
    </div>
  );
}
