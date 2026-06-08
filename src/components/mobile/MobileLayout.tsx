import { ReactNode } from 'react';
import { MobileBottomNav } from './MobileBottomNav';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { TimezoneMismatchDialog } from '@/components/TimezoneMismatchDialog';

export function MobileLayout({ children, title }: { children: ReactNode; title?: string }) {
  const { isDemo } = useAuth();
  const { profile } = useUserProfile();
  const company = title || (isDemo ? 'Demo Practice' : profile?.company_name || 'Locum Ops');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header
        className="sticky top-0 z-30 h-14 flex items-center px-4 border-b border-border bg-card/95 backdrop-blur"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <span
          className="text-[17px] font-semibold tracking-tight truncate"
          style={{ fontFamily: '"Manrope", system-ui, sans-serif' }}
        >
          {company}
        </span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <main
        className="flex-1 px-4 pt-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}
      >
        <ErrorBoundary scope="route">{children}</ErrorBoundary>
      </main>

      <MobileBottomNav />
      <TimezoneMismatchDialog />
    </div>
  );
}
