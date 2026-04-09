import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Compass, ShieldCheck, FileText, Award, RotateCcw, BookOpen, FolderOpen } from 'lucide-react';

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
import { SpotlightTour, TourStep } from '@/components/SpotlightTour';
import { useSpotlightTour } from '@/hooks/useSpotlightTour';

type PrimaryTab = 'overview' | 'credentials' | 'renewals' | 'ce-tracker' | 'documents' | 'requirements';

const TABS: { value: PrimaryTab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'credentials', label: 'Credentials' },
  { value: 'renewals', label: 'Renewals' },
  { value: 'ce-tracker', label: 'CE Hub' },
  { value: 'documents', label: 'Documents' },
  { value: 'requirements', label: 'Requirements' },
];

const CREDENTIALS_TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="cred-overview"]',
    title: 'Compliance Dashboard',
    description: 'Your compliance dashboard: see expiring credentials, CE progress, and renewal deadlines at a glance.',
    placement: 'bottom',
    icon: ShieldCheck,
  },
  {
    targetSelector: '[data-tour="cred-credentials"]',
    title: 'Credentials',
    description: 'Track every license, DEA registration, USDA accreditation, and insurance policy. Get alerts before anything expires.',
    placement: 'bottom',
    icon: Award,
  },
  {
    targetSelector: '[data-tour="cred-renewals"]',
    title: 'Renewals',
    description: 'Upcoming renewal deadlines sorted by urgency. Direct links to renewal portals so you can renew without searching.',
    placement: 'bottom',
    icon: RotateCcw,
  },
  {
    targetSelector: '[data-tour="cred-ce"]',
    title: 'CE Hub',
    description: 'Log continuing education hours, track progress toward requirements, and store certificates. Never lose a CE record again.',
    placement: 'bottom',
    icon: BookOpen,
  },
  {
    targetSelector: '[data-tour="cred-documents"]',
    title: 'Document Vault',
    description: 'Your digital credential vault. Upload and organize copies of licenses, certificates, and insurance docs — always accessible.',
    placement: 'bottom',
    icon: FolderOpen,
  },
];

const TAB_TOUR_ATTR: Record<PrimaryTab, string> = {
  overview: 'cred-overview',
  credentials: 'cred-credentials',
  renewals: 'cred-renewals',
  'ce-tracker': 'cred-ce',
  documents: 'cred-documents',
  requirements: '',
};

export default function CredentialsPage() {
  const [activeTab, setActiveTab] = useState<PrimaryTab>('overview');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { isDemo } = useAuth();
  const credTour = useSpotlightTour('locumops_tour_credentials');

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

  const isCompletelyEmpty = !isDemo && !onboardingLoading && credentialCount === 0 && needsOnboarding;
  const shouldShowWelcome = !isDemo && !onboardingLoading && showWelcome && credentialCount === 0;
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
          <Button
            variant="ghost"
            size="sm"
            onClick={credTour.startTour}
            className="ml-auto gap-1.5 text-xs text-primary hover:bg-primary/10"
          >
            <Compass className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tour</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as PrimaryTab)}>
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto flex-wrap">
          {TABS.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              data-tour={TAB_TOUR_ATTR[tab.value] || undefined}
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
            showChecklist={!isDemo && needsOnboarding && !onboardingLoading && credentialCount === 0}
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

      <SpotlightTour steps={CREDENTIALS_TOUR_STEPS} isOpen={credTour.isOpen} onClose={credTour.closeTour} />
    </div>
  );
}
