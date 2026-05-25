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
import { labelForTz } from '@/lib/usTimezones';

/**
 * Confirmation shown when a user edits a facility's timezone in any clinic
 * settings UI. Existing shifts use `timezone_at_creation` so they are not
 * affected; this dialog just makes the future-only impact explicit.
 *
 * Caller should:
 *   - only open this dialog when newTz !== oldTz,
 *   - persist the new timezone in onConfirm,
 *   - revert/keep the form in edit mode in onCancel.
 */
export function FacilityTimezoneChangeDialog({
  open,
  oldTz,
  newTz,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  oldTz: string;
  newTz: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change clinic timezone?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                Existing shifts and invoices will keep their original timezone.
                Future shifts for this clinic will use the new timezone.
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
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm timezone change</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
