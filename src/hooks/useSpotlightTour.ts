import { useState, useCallback, useEffect, useRef } from 'react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT_KEY = 'locumops_tour_completed';

export function useSpotlightTour(tourKey?: string) {
  const storageKey = tourKey || DEFAULT_KEY;
  const [isOpen, setIsOpen] = useState(false);
  const { isDemo } = useAuth();

  // Use profile-based persistence for authenticated users, localStorage for demo
  let profileCompletedTours: string[] = [];
  let updateProfileFn: ((updates: any) => Promise<void>) | null = null;
  let profileLoading = false;

  try {
    const ctx = useUserProfile();
    profileCompletedTours = ctx.profile?.completed_tours ?? [];
    updateProfileFn = ctx.updateProfile;
    profileLoading = ctx.profileLoading;
  } catch {
    // Outside provider (e.g. demo without provider) — fall back to localStorage
  }

  const isTourCompleted = isDemo
    ? (() => { try { return localStorage.getItem(storageKey) === 'true'; } catch { return false; } })()
    : profileCompletedTours.includes(storageKey);

  const startTour = useCallback(() => setIsOpen(true), []);

  const closeTour = useCallback(async () => {
    setIsOpen(false);

    if (isDemo) {
      try { localStorage.setItem(storageKey, 'true'); } catch {}
      return;
    }

    // Persist to DB if not already marked
    if (updateProfileFn && !profileCompletedTours.includes(storageKey)) {
      const updated = [...profileCompletedTours, storageKey];
      await updateProfileFn({ completed_tours: updated } as any);
    }
  }, [storageKey, isDemo, updateProfileFn, profileCompletedTours]);

  // Auto-start on first visit for module-specific tours (not the default dashboard tour)
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || profileLoading) return;
    if (tourKey && !isTourCompleted && !isDemo) {
      autoStarted.current = true;
      const t = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [tourKey, isTourCompleted, isDemo, profileLoading]);

  return { isOpen, isTourCompleted, startTour, closeTour };
}
