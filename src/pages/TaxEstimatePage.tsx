import { Landmark } from 'lucide-react';
import TaxEstimateTab from '@/components/business/TaxEstimateTab';
import { useTaxAdvisor } from '@/hooks/useTaxAdvisor';

export default function TaxEstimatePage() {
  const {
    profile, sessions, loading,
    saveSession, saveQuestion, saveScorpResult,
  } = useTaxAdvisor();

  const scorpResult = profile?.scorp_assessment_result ?? null;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Landmark className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="page-title">Tax Estimate</h1>
            <p className="page-subtitle">Estimated quarterly tax obligations and planning tools</p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground py-8 text-center">Loading…</p>
      ) : (
        <TaxEstimateTab
          profile={profile}
          sessions={sessions}
          scorpResult={scorpResult}
          onSaveSession={saveSession}
          onSaveQuestion={saveQuestion}
          onSaveScorpResult={saveScorpResult}
        />
      )}
    </div>
  );
}
