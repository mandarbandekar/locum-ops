import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import CredentialsList from '@/components/credentials/CredentialsList';
import RenewalsTab from '@/components/credentials/RenewalsTab';
import DocumentsVaultTab from '@/components/credentials/DocumentsVaultTab';
import CEEntriesTab from '@/components/credentials/CEEntriesTab';
import SubscriptionsTab from '@/components/subscriptions/SubscriptionsTab';
import { AddCredentialDialog } from '@/components/credentials/AddCredentialDialog';
import { ShieldCheck, GraduationCap, RefreshCw } from 'lucide-react';

export default function CredentialsPage() {
  const [primaryTab, setPrimaryTab] = useState<'credentials' | 'ce-tracker' | 'subscriptions'>('credentials');
  const [credSubTab, setCredSubTab] = useState('credentials');
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="page-title">Credential Management</h1>
            <p className="page-subtitle">Manage licenses, registrations, insurance & compliance</p>
          </div>
        </div>
      </div>

      {/* Primary 3-tab selector */}
      <div className="flex gap-2 sm:gap-3 flex-wrap">
        <button
          onClick={() => setPrimaryTab('credentials')}
          className={`primary-tab-btn ${primaryTab === 'credentials' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Credentials</span>
        </button>
        <button
          onClick={() => setPrimaryTab('ce-tracker')}
          className={`primary-tab-btn ${primaryTab === 'ce-tracker' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm"><span className="hidden sm:inline">Continuing </span>CE Hub</span>
        </button>
        <button
          onClick={() => setPrimaryTab('subscriptions')}
          className={`primary-tab-btn ${primaryTab === 'subscriptions' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm"><span className="hidden sm:inline">Required </span>Subscriptions</span>
        </button>
      </div>

      {/* Credentials section */}
      {primaryTab === 'credentials' && (
        <Tabs value={credSubTab} onValueChange={setCredSubTab}>
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
            {['credentials', 'renewals', 'documents'].map(t => (
              <TabsTrigger
                key={t}
                value={t}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 capitalize text-[13px] font-semibold"
              >
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="credentials" className="mt-6">
            <CredentialsList />
          </TabsContent>

          <TabsContent value="renewals" className="mt-6">
            <RenewalsTab />
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <DocumentsVaultTab />
          </TabsContent>
        </Tabs>
      )}

      {/* CE Tracker section */}
      {primaryTab === 'ce-tracker' && (
        <CEEntriesTab />
      )}

      {/* Required Subscriptions section */}
      {primaryTab === 'subscriptions' && (
        <SubscriptionsTab />
      )}

      <AddCredentialDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
