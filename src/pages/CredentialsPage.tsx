import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CredentialsOverview } from '@/components/credentials/CredentialsOverview';
import CredentialsList from '@/components/credentials/CredentialsList';
import RenewalsTab from '@/components/credentials/RenewalsTab';
import DocumentsVaultTab from '@/components/credentials/DocumentsVaultTab';
import CEEntriesTab from '@/components/credentials/CEEntriesTab';
import { AddCredentialDialog } from '@/components/credentials/AddCredentialDialog';
import { ShieldCheck } from 'lucide-react';

export default function CredentialsPage() {
  const [tab, setTab] = useState('overview');
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

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
          {['overview', 'credentials', 'ce-entries', 'renewals', 'documents'].map(t => (
            <TabsTrigger
              key={t}
              value={t}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 capitalize"
            >
              {t === 'ce-entries' ? 'CE Entries' : t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <CredentialsOverview
            onNavigate={setTab}
            onAddCredential={() => setDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="credentials" className="mt-6">
          <CredentialsList />
        </TabsContent>

        <TabsContent value="ce-entries" className="mt-6">
          <CEEntriesTab />
        </TabsContent>

        <TabsContent value="renewals" className="mt-6">
          <RenewalsTab />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsVaultTab />
        </TabsContent>
      </Tabs>

      <AddCredentialDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
