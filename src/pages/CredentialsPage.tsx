import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CredentialsOverview } from '@/components/credentials/CredentialsOverview';
import CredentialsList from '@/components/credentials/CredentialsList';
import RenewalsTab from '@/components/credentials/RenewalsTab';
import DocumentsVaultTab from '@/components/credentials/DocumentsVaultTab';
import CEEntriesTab from '@/components/credentials/CEEntriesTab';
import SubscriptionsTab from '@/components/subscriptions/SubscriptionsTab';
import { AddCredentialDialog } from '@/components/credentials/AddCredentialDialog';
import { ShieldCheck, GraduationCap, RefreshCw } from 'lucide-react';

export default function CredentialsPage() {
  const [primaryTab, setPrimaryTab] = useState<'credentials' | 'ce-tracker' | 'subscriptions'>('credentials');
  const [credSubTab, setCredSubTab] = useState('overview');
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="page-title">Credentials</h1>
            <p className="text-sm text-muted-foreground">Manage licenses, registrations, insurance & compliance</p>
          </div>
        </div>
      </div>

      {/* Primary 3-tab selector */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => setPrimaryTab('credentials')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border-2 font-semibold text-sm transition-all flex-1 sm:flex-none ${
            primaryTab === 'credentials'
              ? 'border-primary bg-primary/5 text-primary shadow-sm'
              : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/50'
          }`}
        >
          <ShieldCheck className="h-5 w-5" />
          Credentials
        </button>
        <button
          onClick={() => setPrimaryTab('ce-tracker')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border-2 font-semibold text-sm transition-all flex-1 sm:flex-none ${
            primaryTab === 'ce-tracker'
              ? 'border-primary bg-primary/5 text-primary shadow-sm'
              : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/50'
          }`}
        >
          <GraduationCap className="h-5 w-5" />
          Continuing Education Hub
        </button>
        <button
          onClick={() => setPrimaryTab('subscriptions')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border-2 font-semibold text-sm transition-all flex-1 sm:flex-none ${
            primaryTab === 'subscriptions'
              ? 'border-primary bg-primary/5 text-primary shadow-sm'
              : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/50'
          }`}
        >
          <RefreshCw className="h-5 w-5" />
          Required Subscriptions
        </button>
      </div>

      {/* Credentials section */}
      {primaryTab === 'credentials' && (
        <Tabs value={credSubTab} onValueChange={setCredSubTab}>
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
            {['overview', 'credentials', 'renewals', 'documents'].map(t => (
              <TabsTrigger
                key={t}
                value={t}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 capitalize"
              >
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <CredentialsOverview
              onNavigate={setCredSubTab}
              onAddCredential={() => setDialogOpen(true)}
            />
          </TabsContent>

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
