import { ReactNode } from "react";
import { MobileBottomNav } from "./MobileBottomNav";

export function MobileAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mobile-shell min-h-[100dvh] flex flex-col">
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
