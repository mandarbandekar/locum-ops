import { AdvisorDisclaimerBanner } from '@/components/tax-advisor/AdvisorDisclaimer';
import OpportunityReviewTab from '@/components/tax-advisor/OpportunityReviewTab';
import CPAPrepSummaryTab from '@/components/tax-advisor/CPAPrepSummaryTab';
import { IntakeCard } from '@/components/tax-advisor/IntakeCard';
import type {
  TaxAdvisorProfile,
  TaxOpportunityReviewItem,
  SavedTaxQuestion,
  ReviewStatus,
} from '@/hooks/useTaxAdvisor';

interface Props {
  profile: TaxAdvisorProfile | null;
  questions: SavedTaxQuestion[];
  reviewItems: TaxOpportunityReviewItem[];
  onSaveProfile: (data: Partial<TaxAdvisorProfile>) => Promise<void>;
  onSaveQuestion: (q: string, topic: string) => Promise<void>;
  onUpdateQuestion: (id: string, updates: Partial<SavedTaxQuestion>) => Promise<void>;
  onDeleteQuestion: (id: string) => Promise<void>;
  onUpdateReviewItem: (category: string, status: ReviewStatus, notes?: string) => Promise<void>;
}

export default function CPAPrepTab({
  profile, questions, reviewItems,
  onSaveProfile, onSaveQuestion, onUpdateQuestion, onDeleteQuestion, onUpdateReviewItem,
}: Props) {
  return (
    <div className="space-y-6">
      <AdvisorDisclaimerBanner />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-8">
          {/* Relief Deduction Guide */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Relief Deduction Guide</h3>
            <OpportunityReviewTab
              reviewItems={reviewItems}
              profile={profile}
              onUpdateItem={onUpdateReviewItem}
              onSaveQuestion={onSaveQuestion}
            />
          </div>

          {/* CPA Questions & Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-4">CPA Questions & Summary</h3>
            <CPAPrepSummaryTab
              questions={questions}
              reviewItems={reviewItems}
              profile={profile}
              onSave={onSaveQuestion}
              onUpdate={onUpdateQuestion}
              onDelete={onDeleteQuestion}
            />
          </div>
        </div>

        {/* Sidebar: Intake Profile */}
        <div className="lg:sticky lg:top-4 self-start">
          <IntakeCard profile={profile} onSave={onSaveProfile} />
        </div>
      </div>
    </div>
  );
}
