import { useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, MessageSquare, Building2 } from 'lucide-react';
import { TaxDisclaimerBanner } from '@/components/tax-strategy/TaxDisclaimer';
import TrackerTab from '@/components/tax-strategy/TrackerTab';
import AskAdvisorTab from '@/components/tax-advisor/AskAdvisorTab';
import SCorpAssessmentTab from '@/components/tax-advisor/SCorpAssessmentTab';
import { getDefaultReasonableSalary } from '@/lib/taxCalculations';
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
  profile, sessions, scorpResult,
  onSaveSession, onSaveQuestion, onSaveScorpResult,
}: Props) {
  // Detect S-Corp status from profile or S-Corp Explorer result
  const isScorp = useMemo(() => {
    if ((profile as any)?.entity_type === 'scorp') return true;
    if (scorpResult?.answers?.currentEntity === 'scorp') return true;
    return false;
  }, [profile, scorpResult]);

  return (
    <div className="space-y-6">
      <TaxDisclaimerBanner />
      <TrackerTab isScorp={isScorp} />

      {/* Ask the Tax Advisor */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-3 px-1 group">
          <MessageSquare className="h-5 w-5 text-primary" />
          <span className="text-base font-semibold flex-1">Ask the Tax Advisor</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <AskAdvisorTab
            profile={profile}
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