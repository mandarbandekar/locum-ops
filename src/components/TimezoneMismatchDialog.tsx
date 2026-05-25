import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  shouldPromptTzMismatch,
  isSupportedUsTz,
  labelForTz,
} from '@/lib/usTimezones';

const SESSION_KEY = 'locumops_tz_prompt_dismissed';

/**
 * One-shot prompt that fires when the browser's detected timezone differs
 * from the saved profile timezone. Replaces the prior silent auto-sync.
 *
 * Behavior contract (see src/lib/usTimezones.ts → shouldPromptTzMismatch):
 *  - Never shown when `timezone_pinned` is true.
 *  - Never shown when device tz is unsupported / non-US (we don't offer to
 *    save garbage into the US-only picker).
 *  - Three actions: Use device | Keep saved | Don't ask again.
 *  - "Don't ask again" sets `timezone_pinned = true`.
 *  - "Use device" updates `timezone` only (leaves `timezone_pinned` alone).
 *  - "Keep saved" makes no profile change; just suppresses for this session.
 */
export function TimezoneMismatchDialog() {
  const { isDemo } = useAuth();
  const { profile, updateProfile } = useUserProfile();
  const [open, setOpen] = useState(false);
  const [deviceTz, setDeviceTz] = useState('');

  useEffect(() => {
    if (isDemo || !profile) return;
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(SESSION_KEY) === '1') return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (
      shouldPromptTzMismatch({
        pinned: !!profile.timezone_pinned,
        profileTz: profile.timezone,
        deviceTz: tz,
      })
    ) {
      setDeviceTz(tz);
      setOpen(true);
    }
  }, [isDemo, profile?.id, profile?.timezone, profile?.timezone_pinned]);

  const dismissForSession = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const handleUseDevice = async () => {
    if (isSupportedUsTz(deviceTz)) {
      await updateProfile({ timezone: deviceTz });
    }
    dismissForSession();
  };

  const handleKeepSaved = () => {
    dismissForSession();
  };

  const handleNeverAsk = async () => {
    await updateProfile({ timezone_pinned: true });
    dismissForSession();
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismissForSession()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Your device timezone is different from your saved business timezone.</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 pt-1 text-sm">
              <div>
                <span className="text-muted-foreground">Saved timezone:</span>{' '}
                <span className="font-medium text-foreground">{labelForTz(profile.timezone)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Device timezone:</span>{' '}
                <span className="font-medium text-foreground">{labelForTz(deviceTz)}</span>
              </div>
              <p className="pt-2">
                Which timezone should Locum Ops use for dashboard dates, reminders,
                and business defaults?
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button onClick={handleUseDevice} className="w-full">
            Use device timezone
          </Button>
          <Button onClick={handleKeepSaved} variant="outline" className="w-full">
            Keep saved timezone
          </Button>
          <Button onClick={handleNeverAsk} variant="ghost" className="w-full text-muted-foreground">
            Don't ask again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
