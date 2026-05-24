import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { formatTzLabel } from '@/lib/usTimezones';
import { useNavigate } from 'react-router-dom';

/**
 * Google-Calendar-style prompt that appears when the device timezone differs
 * from the saved profile timezone. Mounted once in Layout.
 */
export function TimezoneChangePrompt() {
  const { tzPromptOpen, devicePromptTz, acceptTzChange, dismissTzChange, neverAskTzChange } = useUserProfile();
  const navigate = useNavigate();

  if (!tzPromptOpen || !devicePromptTz) return null;

  const label = formatTzLabel(devicePromptTz);

  return (
    <AlertDialog open={tzPromptOpen} onOpenChange={(o) => { if (!o) dismissTzChange(); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogTitle>Change time zone to {label}?</AlertDialogTitle>
        <AlertDialogDescription>
          Your device is in a different time zone than your profile. Switching keeps shift times and reminders aligned with where you are.
        </AlertDialogDescription>
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { dismissTzChange(); navigate('/settings/profile'); }}
          >
            Settings
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { void neverAskTzChange(); }}
          >
            Never ask again
          </Button>
          <Button variant="outline" size="sm" onClick={dismissTzChange}>
            No
          </Button>
          <Button size="sm" onClick={() => { void acceptTzChange(); }}>
            Yes
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
