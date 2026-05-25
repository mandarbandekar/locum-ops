import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { labelForTz } from '@/lib/usTimezones';

/**
 * Confirmation shown when a user edits a facility's timezone. Existing shifts
 * normally keep their `timezone_at_creation` snapshot so history doesn't drift.
 *
 * For the common case where the clinic's tz was wrong from the start (e.g.
 * the stepper auto-defaulted to the user's profile tz), we also offer to
 * rebase existing shifts: keep the wall-clock numbers the user already typed
 * but reinterpret them in the new tz. The caller does the actual rewrite.
 *
 * Caller should:
 *   - only open this dialog when newTz !== oldTz,
 *   - read `rebaseExisting` from onConfirm and apply the backfill itself,
 *   - revert/keep the form in edit mode in onCancel.
 */
export function FacilityTimezoneChangeDialog({
  open,
  oldTz,
  newTz,
  existingShiftCount = 0,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  oldTz: string;
  newTz: string;
  existingShiftCount?: number;
  onCancel: () => void;
  onConfirm: (opts: { rebaseExisting: boolean }) => void;
}) {
  const [rebase, setRebase] = useState(false);
  useEffect(() => {
    if (open) setRebase(false);
  }, [open]);

  const showRebase = existingShiftCount > 0;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change clinic timezone?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                Future shifts for this clinic will use the new timezone. By default,
                existing shifts and invoices keep their original timezone so history
                doesn't shift.
              </p>
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
                <div>
                  <span className="text-muted-foreground">Current timezone:</span>{' '}
                  <span className="font-medium text-foreground">{labelForTz(oldTz)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">New timezone:</span>{' '}
                  <span className="font-medium text-foreground">{labelForTz(newTz)}</span>
                </div>
              </div>
              {showRebase && (
                <div className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="tz-rebase"
                      checked={rebase}
                      onCheckedChange={(v) => setRebase(v === true)}
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="tz-rebase" className="text-sm font-medium cursor-pointer">
                        Also rebase {existingShiftCount} existing shift{existingShiftCount === 1 ? '' : 's'} to the new timezone
                      </Label>
                      <p className="text-[12px] text-muted-foreground">
                        Use this if the old timezone was wrong from the start. The wall-clock times
                        you typed (e.g. 8:00 AM – 5:00 PM) stay the same — they'll just be
                        reinterpreted in {labelForTz(newTz)}. Any auto-generated draft invoices
                        for affected periods will also reflect the corrected times.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm({ rebaseExisting: rebase })}>
            Confirm timezone change
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
