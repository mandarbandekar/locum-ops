import { useState, useCallback, useEffect } from 'react';

const DEFAULT_KEY = 'locumops_tour_completed';

export function useSpotlightTour(tourKey?: string) {
  const storageKey = tourKey || DEFAULT_KEY;
  const [isOpen, setIsOpen] = useState(false);

  const isTourCompleted = (() => {
    try { return localStorage.getItem(storageKey) === 'true'; } catch { return false; }
  })();

  const startTour = useCallback(() => setIsOpen(true), []);

  const closeTour = useCallback(() => {
    setIsOpen(false);
    try { localStorage.setItem(storageKey, 'true'); } catch {}
  }, [storageKey]);

  const resetTour = useCallback(() => {
    try { localStorage.removeItem(storageKey); } catch {}
  }, [storageKey]);

  // Auto-start on first visit for module-specific tours (not the default dashboard tour)
  useEffect(() => {
    if (tourKey && !isTourCompleted) {
      const t = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, []); // only on mount

  return { isOpen, isTourCompleted, startTour, closeTour, resetTour };
}
