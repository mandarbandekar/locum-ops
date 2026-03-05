import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DataProvider, useData } from "@/contexts/DataContext";
import { Layout } from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ClinicsPage from "@/pages/ClinicsPage";
import ClinicDetailPage from "@/pages/ClinicDetailPage";
import SchedulePage from "@/pages/SchedulePage";
import OutreachPage from "@/pages/OutreachPage";
import ConfirmationsPage from "@/pages/ConfirmationsPage";
import InvoicesPage from "@/pages/InvoicesPage";
import InvoiceDetailPage from "@/pages/InvoiceDetailPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AuthGate() {
  const { isLoggedIn } = useData();
  if (!isLoggedIn) return <LoginPage />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/clinics" element={<ClinicsPage />} />
        <Route path="/clinics/:id" element={<ClinicDetailPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/outreach" element={<OutreachPage />} />
        <Route path="/confirmations" element={<ConfirmationsPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <DataProvider>
        <BrowserRouter>
          <AuthGate />
        </BrowserRouter>
      </DataProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
