import { useEffect, useRef, useCallback, useState } from 'react';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // Show warning 2 min before logout

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

export function useIdleTimeout(onLogout: () => void, enabled: boolean) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const logoutTimer = useRef<ReturnType<typeof setTimeout>>();
  const warningTimer = useRef<ReturnType<typeof setTimeout>>();
  const countdownInterval = useRef<ReturnType<typeof setInterval>>();
  const lastActivity = useRef(Date.now());

  const resetTimers = useCallback(() => {
    lastActivity.current = Date.now();
    setShowWarning(false);

    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);

    warningTimer.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(Math.round(WARNING_BEFORE_MS / 1000));
      countdownInterval.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    logoutTimer.current = setTimeout(() => {
      setShowWarning(false);
      onLogout();
    }, IDLE_TIMEOUT_MS);
  }, [onLogout]);

  const stayLoggedIn = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    if (!enabled) return;

    resetTimers();

    const handleActivity = () => {
      // Only reset if warning is NOT showing (don't reset during countdown)
      if (!showWarning) {
        resetTimers();
      }
    };

    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));

    return () => {
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, handleActivity));
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
      if (warningTimer.current) clearTimeout(warningTimer.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [enabled, resetTimers, showWarning]);

  return { showWarning, secondsLeft, stayLoggedIn };
}
