import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { UserProfileProvider, useUserProfile } from "@/contexts/UserProfileContext";
import { DataProvider } from "@/contexts/DataContext";
import { Layout } from "@/components/Layout";
import LandingPage from "@/pages/LandingPage";
import PublicLandingPage from "@/pages/PublicLandingPage";
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
import WaitlistPage from "@/pages/WaitlistPage";
import QuizPage from "@/pages/QuizPage";
import ResultsPage from "@/pages/ResultsPage";
import ThanksPage from "@/pages/ThanksPage";
import OnboardingPage from "@/pages/OnboardingPage";
import SettingsProfilePage from "@/pages/SettingsProfilePage";
import SettingsInvoiceProfilePage from "@/pages/SettingsInvoiceProfilePage";
import ImportPage from "@/pages/ImportPage";
import PublicInvoicePage from "@/pages/PublicInvoicePage";
import PublicConfirmationPage from "@/pages/PublicConfirmationPage";
import NotFound from "./pages/NotFound";

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

  // Redirect to onboarding if not completed (skip for demo)
  if (needsOnboarding && !isDemo) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
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
          <Route path="/credentials" element={<CredentialsPage />} />
          <Route path="/reports" element={<Navigate to="/business?tab=reports" replace />} />
          <Route path="/taxes" element={<Navigate to="/business?tab=taxes" replace />} />
          <Route path="/tax-strategy" element={<Navigate to="/business?tab=tax-strategy" replace />} />
          <Route path="/settings/profile" element={<SettingsProfilePage />} />
          <Route path="/settings/invoice-profile" element={<SettingsInvoiceProfilePage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/onboarding" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </DataProvider>
  );
}

function AuthGate() {
  const { user, loading, isDemo } = useAuth();

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
        <Route path="/" element={<PublicLandingPage />} />
        <Route path="/dev" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <UserProfileProvider isDemo={isDemo}>
      <AuthenticatedApp />
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
            <AuthGate />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
