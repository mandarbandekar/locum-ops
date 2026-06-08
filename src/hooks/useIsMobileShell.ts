import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Returns true when either the viewport is mobile-sized OR the app is being
 * launched as an installed PWA (display-mode: standalone). The standalone
 * check ensures users who install on a tablet/desktop also get the focused
 * mobile shell, matching the field-companion intent.
 */
export function useIsMobileShell() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  React.useEffect(() => {
    const sizeMql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const standaloneMql = window.matchMedia("(display-mode: standalone)");
    const update = () => {
      const narrow = window.innerWidth < MOBILE_BREAKPOINT;
      const standalone = standaloneMql.matches || (navigator as any).standalone === true;
      setIsMobile(narrow || standalone);
    };
    update();
    sizeMql.addEventListener("change", update);
    standaloneMql.addEventListener?.("change", update);
    window.addEventListener("resize", update);
    return () => {
      sizeMql.removeEventListener("change", update);
      standaloneMql.removeEventListener?.("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return isMobile;
}
