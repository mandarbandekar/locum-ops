import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { UserProfileProvider, useUserProfile } from "@/contexts/UserProfileContext";
import { DataProvider } from "@/contexts/DataContext";
import { Layout } from "@/components/Layout";


import { useIdleTimeout } from "@/hooks/useIdleTimeout";
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
import TaxPlanningAdvisorPage from "@/pages/TaxPlanningAdvisorPage";
import WaitlistPage from "@/pages/WaitlistPage";
import QuizPage from "@/pages/QuizPage";
import ResultsPage from "@/pages/ResultsPage";
import ThanksPage from "@/pages/ThanksPage";
import OnboardingPage from "@/pages/OnboardingPage";
import WelcomePage from "@/pages/WelcomePage";
import SettingsProfilePage from "@/pages/SettingsProfilePage";
import SettingsSchedulingPage from "@/pages/SettingsSchedulingPage";
import SettingsCalendarSyncPage from "@/pages/SettingsCalendarSyncPage";
// SettingsInvoicingPage removed — invoice settings are now per-facility
import SettingsPaymentsPage from "@/pages/SettingsPaymentsPage";
import SettingsRemindersPage from "@/pages/SettingsRemindersPage";
import SettingsBusinessTaxesPage from "@/pages/SettingsBusinessTaxesPage";
import SettingsSecurityPage from "@/pages/SettingsSecurityPage";
import SettingsAccountPage from "@/pages/SettingsAccountPage";

import PublicInvoicePage from "@/pages/PublicInvoicePage";
import PublicConfirmationPage from "@/pages/PublicConfirmationPage";
import NotFound from "./pages/NotFound";
import { PostHogPageTracker } from "@/components/PostHogPageTracker";

const queryClient = new QueryClient();

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
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="*" element={<Navigate to="/welcome" replace />} />
          </Routes>
        </DataProvider>
      );
    }
    return (
      <DataProvider isDemo={false}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
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
          <Route path="/settings/payments" element={<SettingsPaymentsPage />} />
          <Route path="/settings/reminders" element={<SettingsRemindersPage />} />
          <Route path="/settings/business-taxes" element={<SettingsBusinessTaxesPage />} />
          <Route path="/settings/security" element={<SettingsSecurityPage />} />
          <Route path="/settings/account" element={<SettingsAccountPage />} />
          {/* Legacy redirects */}
          <Route path="/settings/invoice-profile" element={<Navigate to="/settings/invoicing" replace />} />
          <Route path="/import" element={<Navigate to="/" replace />} />
          <Route path="/onboarding" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
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
    </UserProfileProvider>
  );
}

import { ThemeProvider } from 'next-themes';

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <PostHogPageTracker />
            <AuthGate />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
