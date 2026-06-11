import { ReactNode, useEffect } from "react";
import { useTheme } from "next-themes";
import { MobileBottomNav } from "./MobileBottomNav";

export function MobileAppShell({ children }: { children: ReactNode }) {
  // Mobile app is light-mode only for all users. Force light theme on mount
  // and keep the documentElement class in sync if anything else flips it.
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme("light");
    const root = document.documentElement;
    const ensureLight = () => {
      if (root.classList.contains("dark")) {
        root.classList.remove("dark");
        root.classList.add("light");
        root.style.colorScheme = "light";
      }
    };
    ensureLight();
    const obs = new MutationObserver(ensureLight);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [setTheme]);

  return (
    <div className="mobile-shell light min-h-[100dvh] flex flex-col" style={{ colorScheme: "light" }}>
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y"
        style={{ paddingBottom: "calc(var(--m-bottom-nav-h) + var(--m-safe-bottom) + 8px)" }}
      >
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}
