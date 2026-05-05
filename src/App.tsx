import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { UserProfileProvider, useUserProfile } from "@/contexts/UserProfileContext";
import { DataProvider } from "@/contexts/DataContext";
import { Layout } from "@/components/Layout";


import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { IdleTimeoutWarning } from "@/components/IdleTimeoutWarning";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import FacilitiesPage from "@/pages/FacilitiesPage";
import FacilityDetailPage from "@/pages/FacilityDetailPage";
import SchedulePage from "@/pages/SchedulePage";
import InvoicesPage from "@/pages/InvoicesPage";
import InvoiceDetailPage from "@/pages/InvoiceDetailPage";
import CredentialsPage from "@/pages/CredentialsPage";
import BusinessPage from "@/pages/BusinessPage";
import ExpensesPage from "@/pages/ExpensesPage";
import TaxCenterPage from "@/pages/TaxCenterPage";
import WaitlistPage from "@/pages/WaitlistPage";
import QuizPage from "@/pages/QuizPage";
import ResultsPage from "@/pages/ResultsPage";
import ThanksPage from "@/pages/ThanksPage";
import OnboardingPage from "@/pages/OnboardingPage";
import OnboardingStatusPage from "@/pages/OnboardingStatusPage";
import WelcomePage from "@/pages/WelcomePage";
import SettingsProfilePage from "@/pages/SettingsProfilePage";
import SettingsSchedulingPage from "@/pages/SettingsSchedulingPage";
import SettingsCalendarSyncPage from "@/pages/SettingsCalendarSyncPage";
// SettingsInvoicingPage removed — invoice settings are now per-facility
import SettingsPaymentsPage from "@/pages/SettingsPaymentsPage";
import SettingsRateCardPage from "@/pages/SettingsRateCardPage";
import SettingsRemindersPage from "@/pages/SettingsRemindersPage";
import SettingsBusinessTaxesPage from "@/pages/SettingsBusinessTaxesPage";
import SettingsSecurityPage from "@/pages/SettingsSecurityPage";
import SettingsAccountPage from "@/pages/SettingsAccountPage";
import FounderDashboardPage from "@/pages/FounderDashboardPage";
import AdminFeedbackPage from "@/pages/AdminFeedbackPage";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";

import PublicInvoicePage from "@/pages/PublicInvoicePage";
import PublicConfirmationPage from "@/pages/PublicConfirmationPage";
import NotFound from "./pages/NotFound";
import { PostHogPageTracker } from "@/components/PostHogPageTracker";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { isAuthError } from "@/lib/errorReporting";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry once on transient failures, but never on auth errors —
      // those will not recover without a session refresh.
      retry: (failureCount, err) => failureCount < 2 && !isAuthError(err),
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

function AuthenticatedApp() {
  const { isDemo } = useAuth();
  const { needsOnboarding, profileLoading } = useUserProfile();

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (needsOnboarding && !isDemo) {
    const { profile } = useUserProfile();
    if (!profile?.has_seen_welcome) {
      return (
        <DataProvider isDemo={false}>
          <Routes>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="*" element={<Navigate to="/welcome" replace />} />
          </Routes>
        </DataProvider>
      );
    }
    return (
      <DataProvider isDemo={false}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/onboarding/status" element={<OnboardingStatusPage />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </DataProvider>
    );
  }

  return (
    <DataProvider isDemo={isDemo}>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/facilities" element={<FacilitiesPage />} />
          <Route path="/facilities/:id" element={<FacilityDetailPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/invoice/public/:token" element={<PublicInvoicePage />} />
          <Route path="/confirmations/public/:token" element={<PublicConfirmationPage />} />
          <Route path="/business" element={<BusinessPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/tax-center" element={<TaxCenterPage />} />
          <Route path="/tax-estimate" element={<Navigate to="/tax-center?tab=tax-estimate" replace />} />
          <Route path="/cpa-prep" element={<Navigate to="/tax-center?tab=cpa-prep" replace />} />
          <Route path="/tax-planning" element={<Navigate to="/tax-center?tab=tax-estimate" replace />} />
          <Route path="/credentials" element={<CredentialsPage />} />
          <Route path="/reports" element={<Navigate to="/business" replace />} />
          <Route path="/taxes" element={<Navigate to="/tax-center" replace />} />
          <Route path="/tax-strategy" element={<Navigate to="/tax-center" replace />} />
          <Route path="/tax-strategies" element={<Navigate to="/tax-center?tab=tax-strategies" replace />} />
          {/* Settings */}
          <Route path="/settings/profile" element={<SettingsProfilePage />} />
          <Route path="/settings/scheduling" element={<SettingsSchedulingPage />} />
          <Route path="/settings/calendar-sync" element={<SettingsCalendarSyncPage />} />
          <Route path="/settings/invoicing" element={<Navigate to="/settings/profile" replace />} />
          <Route path="/settings/rate-card" element={<SettingsRateCardPage />} />
          <Route path="/settings/payments" element={<SettingsPaymentsPage />} />
          <Route path="/settings/reminders" element={<SettingsRemindersPage />} />
          <Route path="/settings/business-taxes" element={<SettingsBusinessTaxesPage />} />
          <Route path="/settings/security" element={<SettingsSecurityPage />} />
          <Route path="/settings/account" element={<SettingsAccountPage />} />
          <Route path="/founder" element={<FounderDashboardPage />} />
          <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
          <Route path="/settings/founder" element={<Navigate to="/founder" replace />} />
          {/* Legacy redirects */}
          <Route path="/settings/invoice-profile" element={<Navigate to="/settings/invoicing" replace />} />
          <Route path="/import" element={<Navigate to="/" replace />} />
          <Route path="/onboarding" element={<Navigate to="/" replace />} />
          <Route path="/onboarding/status" element={<OnboardingStatusPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/forgot-password" element={<Navigate to="/settings/security" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </DataProvider>
  );
}

function AuthGate() {
  const { user, loading, isDemo, signOut } = useAuth();
  const idleEnabled = !!(user || isDemo);
  const { showWarning, secondsLeft, stayLoggedIn } = useIdleTimeout(signOut, idleEnabled);
  useVersionCheck();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user && !isDemo) {
    return (
      <Routes>
        <Route path="/invoice/public/:token" element={<PublicInvoicePage />} />
        <Route path="/confirmations/public/:token" element={<PublicConfirmationPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/waitlist" element={<WaitlistPage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/thanks" element={<ThanksPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <UserProfileProvider isDemo={isDemo}>
      <AuthenticatedApp />
      <IdleTimeoutWarning
        open={showWarning}
        secondsLeft={secondsLeft}
        onStay={stayLoggedIn}
        onLogout={signOut}
      />
      <FeedbackButton />
    </UserProfileProvider>
  );
}

import { ThemeProvider } from 'next-themes';

/**
 * Forwards Supabase password recovery sessions to /reset-password regardless
 * of where the recovery link initially lands the user. Supabase's verify
 * endpoint redirects to the project Site URL with `#type=recovery&access_token=...`
 * in the hash; without this interceptor the user lands on `/`, the hash gets
 * silently consumed, and they never reach the reset form.
 */
function RecoveryRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const forwardIfRecovery = (hash: string) => {
      if (!hash || !hash.includes('type=recovery')) return;
      if (location.pathname === '/reset-password') return;
      navigate(`/reset-password${hash}`, { replace: true });
    };

    // Initial check on mount and whenever the route changes
    forwardIfRecovery(window.location.hash);

    // Catch the case where Supabase fires PASSWORD_RECOVERY after mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && location.pathname !== '/reset-password') {
        navigate(`/reset-password${window.location.hash || ''}`, { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [location.pathname, navigate]);

  return null;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <ErrorBoundary scope="root">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <BrowserRouter>
              <RecoveryRedirect />
              <PostHogPageTracker />
              <AuthGate />
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </ThemeProvider>
);

export default App;
