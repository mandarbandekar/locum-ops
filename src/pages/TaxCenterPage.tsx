import { Landmark, FileText, Calculator, Lightbulb, Compass } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import TaxEstimateTab from '@/components/business/TaxEstimateTab';
import CPAPrepTab from '@/components/business/CPAPrepTab';
import TaxStrategiesTab from '@/components/tax-strategies/TaxStrategiesTab';
import { useTaxAdvisor } from '@/hooks/useTaxAdvisor';
import { SpotlightTour, TourStep } from '@/components/SpotlightTour';
import { useSpotlightTour } from '@/hooks/useSpotlightTour';

const TAX_TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="tax-estimate"]',
    title: 'Tax Estimate',
    description: 'Real-time quarterly tax estimates based on your actual shift income. Uses 2026 federal brackets, SE tax, and your state rate.',
    placement: 'bottom',
    icon: Calculator,
  },
  {
    targetSelector: '[data-tour="tax-strategy"]',
    title: 'Personalized Tax Strategy',
    description: 'Savings opportunities personalized to your income: S-Corp analysis, retirement contributions, vet-specific deductions, and more.',
    placement: 'bottom',
    icon: Lightbulb,
  },
  {
    targetSelector: '[data-tour="tax-cpa"]',
    title: 'CPA Prep',
    description: 'Generate a CPA-ready packet with income summaries, expense reports, and mileage logs. Makes tax season prep take minutes, not days.',
    placement: 'bottom',
    icon: FileText,
  },
  {
    targetSelector: '[data-tour="tax-header"]',
    title: 'Tax Intelligence',
    description: 'Tax intelligence built specifically for 1099 relief vets. No more guessing what you owe or scrambling at tax time.',
    placement: 'bottom',
    icon: Landmark,
  },
];

export default function TaxCenterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'tax-estimate';
  const taxTour = useSpotlightTour('locumops_tour_tax');

  const {
    profile, sessions, questions, reviewItems, loading,
    saveProfile, saveSession, saveQuestion, updateQuestion, deleteQuestion, updateReviewItem,
    saveScorpResult,
  } = useTaxAdvisor();

  const scorpResult = profile?.scorp_assessment_result ?? null;

  return (
    <div className="space-y-6">
      <div className="page-header" data-tour="tax-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Landmark className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="page-title">Tax Intelligence</h1>
            <p className="page-subtitle">Tax estimation, quarterly planning, and CPA prep</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={taxTour.startTour}
            className="ml-auto gap-1.5 text-xs text-primary hover:bg-primary/10"
          >
            <Compass className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tour</span>
          </Button>
        </div>
      </div>

      <div className="flex gap-2 sm:gap-3 flex-wrap">
        <button
          data-tour="tax-estimate"
          onClick={() => setSearchParams({ tab: 'tax-estimate' }, { replace: true })}
          className={`primary-tab-btn ${activeTab === 'tax-estimate' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Tax Estimate</span>
        </button>
        <button
          data-tour="tax-strategy"
          onClick={() => setSearchParams({ tab: 'tax-strategies' }, { replace: true })}
          className={`primary-tab-btn ${activeTab === 'tax-strategies' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Personalized Tax Strategy</span>
        </button>
        <button
          data-tour="tax-cpa"
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
      {activeTab === 'tax-strategies' && <TaxStrategiesTab />}
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

      <SpotlightTour steps={TAX_TOUR_STEPS} isOpen={taxTour.isOpen} onClose={taxTour.closeTour} />
    </div>
  );
}
