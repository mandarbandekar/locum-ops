import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, MessageSquare, Building2, BookOpen, Sparkles } from 'lucide-react';
import AskAdvisorTab from '@/components/tax-advisor/AskAdvisorTab';
import SCorpAssessmentTab from '@/components/tax-advisor/SCorpAssessmentTab';
import TaxProfileSetup from '@/components/tax-intelligence/TaxProfileSetup';
import TaxDashboard from '@/components/tax-intelligence/TaxDashboard';
import TaxReductionGuide from '@/components/tax-intelligence/TaxReductionGuide';
import { useTaxIntelligence } from '@/hooks/useTaxIntelligence';
import type { TaxAdvisorProfile, TaxAdvisorSession, SavedTaxQuestion } from '@/hooks/useTaxAdvisor';

interface Props {
  profile: TaxAdvisorProfile | null;
  sessions: TaxAdvisorSession[];
  scorpResult: any;
  onSaveSession: (prompt: string, response: string, title?: string) => Promise<TaxAdvisorSession | null>;
  onSaveQuestion: (q: string, topic: string, sessionId?: string) => Promise<void>;
  onSaveScorpResult: (result: any) => Promise<void>;
}

export default function TaxEstimateTab({
  profile: advisorProfile, sessions, scorpResult,
  onSaveSession, onSaveQuestion, onSaveScorpResult,
}: Props) {
  const { profile: taxProfile, loading, saveProfile, hasProfile } = useTaxIntelligence();
  const [setupOpen, setSetupOpen] = useState(false);

  if (loading) {
    return <p className="text-muted-foreground py-8 text-center">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      {/* Setup wizard modal */}
      <TaxProfileSetup
        open={setupOpen}
        onOpenChange={setSetupOpen}
        existingProfile={taxProfile}
        onSave={saveProfile}
      />

      {/* If no profile yet, show setup prompt */}
      {!hasProfile ? (
        <div className="text-center py-12 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Set Up Your Tax Profile</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Answer 8 quick questions about your tax situation so we can calculate your quarterly estimates, personalize your tax guidance, and track what you owe.
            </p>
          </div>
          <Button onClick={() => setSetupOpen(true)} size="lg" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Get Started
          </Button>
        </div>
      ) : (
        <>
          {/* Live Tax Dashboard */}
          <TaxDashboard
            profile={taxProfile!}
            onEditProfile={() => setSetupOpen(true)}
            onSaveProfile={saveProfile}
          />

          {/* Tax Reduction Guide */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-3 px-1 group">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="text-base font-semibold flex-1">Tax Reduction Guide</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <TaxReductionGuide profile={taxProfile!} />
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {/* Ask the Tax Advisor */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-3 px-1 group">
          <MessageSquare className="h-5 w-5 text-primary" />
          <span className="text-base font-semibold flex-1">Ask the Tax Advisor</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <AskAdvisorTab
            profile={advisorProfile}
            sessions={sessions}
            onSaveSession={onSaveSession}
            onSaveQuestion={onSaveQuestion}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* S-Corp Explorer */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-3 px-1 group">
          <Building2 className="h-5 w-5 text-primary" />
          <span className="text-base font-semibold flex-1">S-Corp Explorer</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SCorpAssessmentTab
            savedResult={scorpResult}
            onSaveResult={onSaveScorpResult}
            onSaveQuestion={onSaveQuestion}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
