import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DemoGuideDialog } from '@/components/DemoGuideDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { isDemo } = useAuth();
  const { profile } = useUserProfile();
  const company = isDemo ? 'Demo Practice' : (profile?.company_name || '');

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border bg-card/80 backdrop-blur-sm px-4 sm:px-5 shrink-0 sticky top-0 z-30">
            <SidebarTrigger className="mr-3" />
            <span className="text-[15px] font-semibold text-primary tracking-tight truncate">LocumOps</span>
            {company && (
              <span className="ml-2.5 text-sm text-muted-foreground truncate hidden sm:inline">
                — {company}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {isDemo && <DemoGuideDialog />}
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-5 md:p-7 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
