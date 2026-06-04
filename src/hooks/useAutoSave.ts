import { useEffect, useRef } from 'react';

/**
 * Debounced auto-save. Skips the initial render so the first load
 * doesn't trigger an unnecessary save.
 */
export function useAutoSave<T>(
  value: T,
  save: (v: T) => void | Promise<void>,
  opts?: { delay?: number; enabled?: boolean }
) {
  const delay = opts?.delay ?? 600;
  const enabled = opts?.enabled ?? true;
  const firstRef = useRef(true);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!enabled) return;
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    const t = setTimeout(() => {
      void saveRef.current(value);
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled, delay]);
}
