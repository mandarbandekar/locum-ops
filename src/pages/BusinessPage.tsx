import { BarChart3, Landmark, FileText } from 'lucide-react';
import ReportsPage from '@/pages/ReportsPage';
import TaxEstimateTab from '@/components/business/TaxEstimateTab';
import CPAPrepTab from '@/components/business/CPAPrepTab';
import { useSearchParams } from 'react-router-dom';
import { useTaxAdvisor } from '@/hooks/useTaxAdvisor';

export default function BusinessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'reports';

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
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="page-title">Relief Business Insights</h1>
            <p className="page-subtitle">Your revenue, tax obligations, and CPA prep</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 sm:gap-3 flex-wrap">
        <button
          onClick={() => setSearchParams({ tab: 'reports' }, { replace: true })}
          className={`primary-tab-btn ${activeTab === 'reports' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Revenue & Work</span>
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'tax-estimate' }, { replace: true })}
          className={`primary-tab-btn ${activeTab === 'tax-estimate' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <Landmark className="h-4 w-4 sm:h-5 sm:w-5" />
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

      {activeTab === 'reports' && <ReportsPage />}
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
