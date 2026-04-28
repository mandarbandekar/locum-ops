import { useRef, useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check, SkipForward, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { AddClinicStepper, type AddClinicStepperHandle } from '@/components/facilities/AddClinicStepper';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { mapDefaultRatesToRateEntries } from '@/lib/onboardingRateMapping';

export function AddFacilityDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (facilityId: string) => void;
}) {
  const handleRef = useRef<AddClinicStepperHandle | null>(null);
  // Tick so the dialog footer reflects current stepper state.
  const [, setTick] = useState(0);
  const { profile } = useUserProfile();

  // Pull the user's saved Rate Card so the Rates step is pre-populated for
  // every clinic added after onboarding (Facilities page, Dashboard, Schedule, etc.).
  const defaultRates = useMemo(
    () => mapDefaultRatesToRateEntries((profile?.default_rates ?? []) as any),
    [profile?.default_rates],
  );

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setTick(t => t + 1), 150);
    return () => window.clearInterval(id);
  }, [open]);

  const handle = handleRef.current;

  const handleSaved = (facilityId: string, name: string) => {
    onCreated?.(facilityId);
    onOpenChange(false);
    toast.success(`${name} added`, {
      description: 'Add tech access info, contracts, or notes anytime from the clinic page.',
      action: {
        label: 'Open clinic',
        onClick: () => {
          window.location.assign(`/facilities/${facilityId}`);
        },
      },
      duration: 6000,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Add Clinic
          </DialogTitle>
        </DialogHeader>

        <AddClinicStepper
          ref={(h) => { handleRef.current = h; }}
          onSaved={handleSaved}
          defaultRates={defaultRates}
        />

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border mt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleRef.current?.back()}
            disabled={!handle?.canBack}
            className={!handle?.canBack ? 'invisible' : ''}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            {handle?.canSkip && (
              <Button type="button" variant="outline" size="sm" onClick={() => handleRef.current?.skip()}>
                <SkipForward className="h-3.5 w-3.5 mr-1" /> Skip
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => handleRef.current?.next()}
              disabled={handle ? (!handle.canSave && handle.step === 1) : false}
            >
              {handle?.primaryLabel === 'Save Clinic' ? (
                <><Check className="h-3.5 w-3.5 mr-1" /> Save Clinic</>
              ) : (
                <>{handle?.primaryLabel ?? 'Continue'} <ArrowRight className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
