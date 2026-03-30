import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ComplianceOverview } from '@/components/compliance/ComplianceOverview';
import CredentialsList from '@/components/credentials/CredentialsList';
import RenewalsTab from '@/components/credentials/RenewalsTab';
import DocumentsVaultTab from '@/components/credentials/DocumentsVaultTab';
import CEEntriesTab from '@/components/credentials/CEEntriesTab';
import SubscriptionsTab from '@/components/subscriptions/SubscriptionsTab';
import { AddCredentialDialog } from '@/components/credentials/AddCredentialDialog';
import { ComplianceWelcomeModal } from '@/components/compliance/onboarding/ComplianceWelcomeModal';
import { ComplianceOnboardingFlow } from '@/components/compliance/onboarding/ComplianceOnboardingFlow';
import { useComplianceOnboarding } from '@/hooks/useComplianceOnboarding';
import { useCredentials } from '@/hooks/useCredentials';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck } from 'lucide-react';

type PrimaryTab = 'overview' | 'credentials' | 'renewals' | 'ce-tracker' | 'documents' | 'requirements';

const TABS: { value: PrimaryTab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'credentials', label: 'Credentials' },
  { value: 'renewals', label: 'Renewals' },
  { value: 'ce-tracker', label: 'CE Hub' },
  { value: 'documents', label: 'Documents' },
  { value: 'requirements', label: 'Requirements' },
];

export default function CredentialsPage() {
  const [activeTab, setActiveTab] = useState<PrimaryTab>('overview');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { isDemo } = useAuth();

  const {
    showWelcome,
    needsOnboarding,
    state: onboardingState,
    isLoading: onboardingLoading,
    checklistItems,
    markWelcomeSeen,
    markSkipped,
    markCompleted,
    setSelectedTypes,
    markCredentialAdded,
    markDocumentUploaded,
    markCEAdded,
  } = useComplianceOnboarding();

  const { credentials } = useCredentials();
  const credentialCount = isDemo ? 5 : (credentials?.length || 0);

  const [showOnboardingFlow, setShowOnboardingFlow] = useState(false);

  // Auto-trigger onboarding for completely empty state (no credentials + never completed/skipped onboarding)
  const isCompletelyEmpty = !isDemo && !onboardingLoading && credentialCount === 0 && needsOnboarding;

  // Show welcome modal for first-time users with no credentials
  const shouldShowWelcome = !isDemo && !onboardingLoading && showWelcome && credentialCount === 0;
  // Show onboarding flow after welcome
  const shouldShowFlow = showOnboardingFlow;

  const handleGetStarted = async () => {
    await markWelcomeSeen();
    setShowOnboardingFlow(true);
  };

  const handleSkipWelcome = async () => {
    await markSkipped();
  };

  const handleSkipFlow = async () => {
    await markSkipped();
    setShowOnboardingFlow(false);
  };

  const handleFlowComplete = async () => {
    await markCompleted();
    setShowOnboardingFlow(false);
  };

  const handleStartOnboarding = async () => {
    await markWelcomeSeen();
    setShowOnboardingFlow(true);
  };

  const handleNavigate = (tab: string) => {
    if (TABS.some(t => t.value === tab)) {
      setActiveTab(tab as PrimaryTab);
    }
  };

  const handleChecklistAction = useCallback((action: string) => {
    switch (action) {
      case 'add-credential':
        setDialogOpen(true);
        break;
      case 'upload-document':
        setActiveTab('documents');
        break;
      case 'add-ce':
        setActiveTab('ce-tracker');
        break;
      case 'review-renewals':
        setActiveTab('renewals');
        break;
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="page-title">Credential Management</h1>
            <p className="page-subtitle">Manage licenses, CE, renewals, insurance, documents, and compliance tasks in one place</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as PrimaryTab)}>
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto flex-wrap">
          {TABS.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-[13px] font-semibold"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <ComplianceOverview
            onNavigate={handleNavigate}
            checklistItems={checklistItems}
            onChecklistAction={handleChecklistAction}
            showChecklist={!isDemo && needsOnboarding && !onboardingLoading}
            credentialCount={credentialCount}
            onStartOnboarding={handleStartOnboarding}
            onAddCredential={() => setDialogOpen(true)}
            onUploadDocument={() => setActiveTab('documents')}
            onAddCE={() => setActiveTab('ce-tracker')}
          />
        </TabsContent>

        <TabsContent value="credentials" className="mt-6">
          <CredentialsList />
        </TabsContent>

        <TabsContent value="renewals" className="mt-6">
          <RenewalsTab />
        </TabsContent>

        <TabsContent value="ce-tracker" className="mt-6">
          <CEEntriesTab />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsVaultTab />
        </TabsContent>

        <TabsContent value="requirements" className="mt-6">
          <SubscriptionsTab />
        </TabsContent>
      </Tabs>

      <AddCredentialDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* Onboarding modals */}
      <ComplianceWelcomeModal
        open={shouldShowWelcome}
        onGetStarted={handleGetStarted}
        onSkip={handleSkipWelcome}
      />

      <ComplianceOnboardingFlow
        open={shouldShowFlow}
        onComplete={handleFlowComplete}
        onSkip={handleSkipFlow}
        onSetSelectedTypes={setSelectedTypes}
        onMarkCredentialAdded={markCredentialAdded}
        onMarkDocumentUploaded={markDocumentUploaded}
        onMarkCEAdded={markCEAdded}
      />
    </div>
  );
}
