import { useMemo, useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Building2, CalendarDays, Landmark,
  CheckCircle2, Circle, Plus, ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useTaxIntelligence } from '@/hooks/useTaxIntelligence';
import { SCHEDULE_OPTIONS, daysPerWeekToIndex } from '@/components/tax-intelligence/TaxProjectionDisplay';
import { calculate1099Tax, type TaxProfileV1 } from '@/lib/taxCalculatorV1';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  onOpenAddClinic: () => void;
  onOpenAddShift: () => void;
}

export function GettingStartedChecklist({ onOpenAddClinic, onOpenAddShift }: Props) {
  const navigate = useNavigate();
  const { facilities, shifts, invoices } = useData();
  const { profile, updateProfile } = useUserProfile();
  const { profile: taxProfile } = useTaxIntelligence();
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const [autoHidden, setAutoHidden] = useState(false);

  const hasClinic = facilities.length > 0;
  const hasShift = shifts.length > 0;
  const hasViewedTax = !!profile?.dismissed_prompts?.getting_started_tax_viewed;

  // Item 3 counts as done if they have a shift (they can see the estimate)
  const taxDone = hasShift || hasViewedTax;

  const completedCount = [hasClinic, hasShift, taxDone].filter(Boolean).length;
  const allDone = completedCount === 3;
  const progress = Math.round((completedCount / 3) * 100);

  // Auto-hide when all done
  useEffect(() => {
    if (allDone && !autoHidden) {
      const t = setTimeout(() => {
        setAutoHidden(true);
        toast.success("🎉 You're all set! Your dashboard is ready.");
        handleDismissSilent();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [allDone]);

  const handleDismissSilent = useCallback(async () => {
    await updateProfile({
      dismissed_prompts: { ...profile?.dismissed_prompts, getting_started: true },
    });
  }, [profile, updateProfile]);

  const handleDismissConfirmed = async () => {
    setConfirmDismiss(false);
    await handleDismissSilent();
  };

  // Quarterly tax estimate using the same calculation as the Tax Estimate page
  const quarterlyEstimate = useMemo(() => {
    const firstShiftRate = shifts.length > 0 ? shifts[0].rate_applied : 0;
    if (firstShiftRate <= 0) return 0;

    const savedDays = (taxProfile as any)?.typical_days_per_week;
    const scheduleIdx = savedDays ? daysPerWeekToIndex(savedDays) : 1; // default 3 days/wk
    const daysPerYear = SCHEDULE_OPTIONS[scheduleIdx]?.daysPerYear ?? 144;
    const annualIncome = firstShiftRate * daysPerYear;
    const expenses = Number((taxProfile as any)?.annual_business_expenses ?? 9500);
    const stateCode = ((taxProfile as any)?.state_code ?? 'CA').toLowerCase();

    const taxInput: TaxProfileV1 = {
      entityType: '1099',
      annualReliefIncome: annualIncome,
      scorpSalary: 0,
      extraWithholding: 0,
      payPeriodsPerYear: 24,
      filingStatus: (taxProfile as any)?.filing_status ?? 'single',
      spouseW2Income: 0,
      retirementContributions: 0,
      annualBusinessExpenses: expenses,
      stateKey: stateCode,
    };

    const result = calculate1099Tax(taxInput);
    return Math.round(result.quarterlyPayment);
  }, [shifts, taxProfile]);

  const firstClinicName = facilities.length > 0 ? facilities[0].name : '';

  // Don't render if dismissed or auto-hidden
  if (profile?.dismissed_prompts?.getting_started || autoHidden) return null;

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent shrink-0">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <h3 className="font-semibold text-sm text-foreground">Get the most out of LocumOps</h3>
              <p className="text-xs text-muted-foreground">{completedCount} of 3 complete</p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmDismiss(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>

          <Progress value={progress} className="h-1.5" />

          {/* Checklist items */}
          <div className="space-y-1">
            {/* Item 1: Add clinic */}
            <ChecklistRow
              done={hasClinic}
              doneText={`${firstClinicName} added`}
              description="Start with one clinic you work with regularly."
              ctaLabel="+ Add Clinic"
              onAction={onOpenAddClinic}
            />

            {/* Item 2: Log shift */}
            <ChecklistRow
              done={hasShift}
              doneText={`1 shift logged${invoices.length > 0 ? ' — draft invoice created' : ''}`}
              description={hasClinic
                ? "Log a recent shift — it feeds your invoices and tax estimate."
                : "Add a clinic first, then log a shift."
              }
              ctaLabel="+ Log Shift"
              onAction={onOpenAddShift}
              disabled={!hasClinic}
            />

            {/* Item 3: Tax estimate */}
            <ChecklistRow
              done={taxDone}
              doneText={quarterlyEstimate > 0 ? `$${quarterlyEstimate.toLocaleString()} estimated quarterly` : 'Tax estimate viewed'}
              description={hasShift
                ? "Your estimated quarterly tax bill is ready."
                : "Log a shift first to see your estimated quarterly taxes."
              }
              ctaLabel="See Estimate →"
              onAction={() => {
                updateProfile({
                  dismissed_prompts: { ...profile?.dismissed_prompts, getting_started_tax_viewed: true },
                });
                navigate('/tax-estimate');
              }}
              disabled={!hasShift}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dismiss confirmation */}
      <AlertDialog open={confirmDismiss} onOpenChange={setConfirmDismiss}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dismiss getting started?</AlertDialogTitle>
            <AlertDialogDescription>
              You can always find these actions in the sidebar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep showing</AlertDialogCancel>
            <AlertDialogAction onClick={handleDismissConfirmed}>
              Yes, dismiss
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ChecklistRow({
  done,
  doneText,
  description,
  ctaLabel,
  onAction,
  disabled,
}: {
  done: boolean;
  doneText: string;
  description: string;
  ctaLabel: string;
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${done ? 'opacity-60' : ''}`}>
      {done ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground/30 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        {done ? (
          <p className="text-sm text-emerald-500 font-medium">✓ {doneText}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {!done && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 text-xs h-7"
          onClick={onAction}
          disabled={disabled}
        >
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
