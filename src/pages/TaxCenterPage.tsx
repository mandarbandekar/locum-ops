import { Landmark, FileText, Calculator } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import TaxEstimateTab from '@/components/business/TaxEstimateTab';
import CPAPrepTab from '@/components/business/CPAPrepTab';
import { useTaxAdvisor } from '@/hooks/useTaxAdvisor';

export default function TaxCenterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'tax-estimate';

  const {
    profile, sessions, questions, reviewItems, loading,
    saveProfile, saveSession, saveQuestion, updateQuestion, deleteQuestion, updateReviewItem,
    saveScorpResult,
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
            <h1 className="page-title">Tax Center</h1>
            <p className="page-subtitle">Tax estimation, quarterly planning, and CPA prep</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 sm:gap-3 flex-wrap">
        <button
          onClick={() => setSearchParams({ tab: 'tax-estimate' }, { replace: true })}
          className={`primary-tab-btn ${activeTab === 'tax-estimate' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Tax Estimate</span>
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'cpa-prep' }, { replace: true })}
          className={`primary-tab-btn ${activeTab === 'cpa-prep' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">CPA Prep</span>
        </button>
      </div>

      {activeTab === 'tax-estimate' && (
        loading
          ? <p className="text-muted-foreground py-8 text-center">Loading…</p>
          : <TaxEstimateTab
              profile={profile}
              sessions={sessions}
              scorpResult={scorpResult}
              onSaveSession={saveSession}
              onSaveQuestion={saveQuestion}
              onSaveScorpResult={saveScorpResult}
            />
      )}
      {activeTab === 'cpa-prep' && (
        loading
          ? <p className="text-muted-foreground py-8 text-center">Loading…</p>
          : <CPAPrepTab
              profile={profile}
              questions={questions}
              reviewItems={reviewItems}
              onSaveProfile={saveProfile}
              onSaveQuestion={saveQuestion}
              onUpdateQuestion={updateQuestion}
              onDeleteQuestion={deleteQuestion}
              onUpdateReviewItem={updateReviewItem}
            />
      )}
    </div>
  );
}
