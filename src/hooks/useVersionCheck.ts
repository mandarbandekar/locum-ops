import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Detects when a new frontend deploy is available and prompts the user to reload.
 *
 * Strategy: Vite produces hashed asset filenames in the built `index.html`.
 * We fetch `/index.html` on an interval and on tab focus, hash its contents,
 * and compare to the version captured at app start. If it changes, the user
 * is running a stale bundle — surface a toast with a Reload action.
 *
 * No-ops in dev (where index.html has no hashed assets and changes constantly).
 */
async function fetchVersion(): Promise<string | null> {
  try {
    const res = await fetch('/index.html', { cache: 'no-store' });
    if (!res.ok) return null;
    const text = await res.text();
    // Hash the script/link tags (which contain hashed filenames) rather than
    // the whole document so meta tag tweaks don't trigger reload prompts.
    const assetRefs = text.match(/(?:src|href)="\/assets\/[^"]+"/g);
    return assetRefs ? assetRefs.join('|') : text.length.toString();
  } catch {
    return null;
  }
}

export function useVersionCheck(intervalMs = 60_000) {
  const initialVersion = useRef<string | null>(null);
  const notified = useRef(false);

  useEffect(() => {
    if (import.meta.env.DEV) return;

    let cancelled = false;

    const check = async () => {
      const v = await fetchVersion();
      if (cancelled || !v) return;
      if (initialVersion.current === null) {
        initialVersion.current = v;
        return;
      }
      if (v !== initialVersion.current && !notified.current) {
        // Quiet-hours auto-reload: if it's between 2:00 and 4:59 AM local
        // time, the user almost certainly isn't actively working — reload
        // silently so they get the new bundle without an interruption.
        const hour = new Date().getHours();
        const inQuietHours = hour >= 2 && hour < 5;
        if (inQuietHours && document.visibilityState !== 'visible') {
          window.location.reload();
          return;
        }

        notified.current = true;
        toast('A new version is available', {
          description: 'Reload to get the latest updates. Tabs left open overnight will refresh automatically around 2 AM.',
          duration: Infinity,
          action: {
            label: 'Reload',
            onClick: () => window.location.reload(),
          },
        });
      }
    };

    check();
    const interval = setInterval(check, intervalMs);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [intervalMs]);
}
