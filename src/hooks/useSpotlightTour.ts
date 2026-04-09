import { useState, useCallback } from 'react';

const STORAGE_KEY = 'locumops_tour_completed';

export function useSpotlightTour() {
  const [isOpen, setIsOpen] = useState(false);

  const isTourCompleted = (() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  })();

  const startTour = useCallback(() => setIsOpen(true), []);

  const closeTour = useCallback(() => {
    setIsOpen(false);
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
  }, []);

  const resetTour = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return { isOpen, isTourCompleted, startTour, closeTour, resetTour };
}
