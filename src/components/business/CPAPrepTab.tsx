import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AdvisorDisclaimerBanner } from '@/components/tax-advisor/AdvisorDisclaimer';
import OpportunityReviewTab from '@/components/tax-advisor/OpportunityReviewTab';
import CPAPrepSummaryTab from '@/components/tax-advisor/CPAPrepSummaryTab';
import { IntakeCard } from '@/components/tax-advisor/IntakeCard';
import QuarterlySnapshot from '@/components/cpa-prep/QuarterlySnapshot';
import ProfitLossSummary from '@/components/cpa-prep/ProfitLossSummary';
import IncomeByClinic from '@/components/cpa-prep/IncomeByClinic';
import AccountsReceivable from '@/components/cpa-prep/AccountsReceivable';
import ExpenseReview from '@/components/cpa-prep/ExpenseReview';
import MileageSummary from '@/components/cpa-prep/MileageSummary';
import ReadinessChecklist from '@/components/cpa-prep/ReadinessChecklist';
import DiscussionAgenda from '@/components/cpa-prep/DiscussionAgenda';
import ExportCPAPacket from '@/components/cpa-prep/ExportCPAPacket';
import { useCPAPrepData } from '@/hooks/useCPAPrepData';
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

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {title}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function CPAPrepTab({
  profile, questions, reviewItems,
  onSaveProfile, onSaveQuestion, onUpdateQuestion, onDeleteQuestion, onUpdateReviewItem,
}: Props) {
  const cpd = useCPAPrepData();

  return (
    <div className="space-y-6">
      <AdvisorDisclaimerBanner />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Quarterly Tax Prep Dashboard</h2>
          <p className="text-sm text-muted-foreground">Everything your CPA needs — in one place.</p>
        </div>
        <ExportCPAPacket
          snapshot={cpd.snapshot}
          quarterly={cpd.pnlQuarterly}
          clinicIncome={cpd.clinicIncome}
          receivables={cpd.receivables}
          expenseReview={cpd.expenseReview}
          mileage={cpd.mileage}
          readiness={cpd.readiness}
          agenda={cpd.agenda}
        />
      </div>

      {/* Snapshot — always visible */}
      <QuarterlySnapshot snapshot={cpd.snapshot} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <Section title="📈 Profit & Loss Summary">
            <ProfitLossSummary
              monthly={cpd.pnlMonthly}
              quarterly={cpd.pnlQuarterly}
              byCategory={cpd.pnlByCategory}
              totalIncomeCents={cpd.snapshot.ytdIncomeCents}
              totalExpenseCents={cpd.snapshot.ytdExpensesCents}
            />
          </Section>

          <Section title="🏥 Income by Clinic">
            <IncomeByClinic rows={cpd.clinicIncome} />
          </Section>

          <Section title="💳 Accounts Receivable">
            <AccountsReceivable data={cpd.receivables} />
          </Section>

          <Section title="🧾 Expense Review by Tax Category">
            <ExpenseReview rows={cpd.expenseReview} />
          </Section>

          <Section title="🚗 Mileage & Travel Summary">
            <MileageSummary data={cpd.mileage} />
          </Section>

          <Section title="✅ CPA Readiness Checklist">
            <ReadinessChecklist items={cpd.readiness} />
          </Section>

          <Section title="💬 CPA Discussion Agenda">
            <DiscussionAgenda topics={cpd.agenda} />
          </Section>

          <Section title="📋 Relief Deduction Guide" defaultOpen={false}>
            <OpportunityReviewTab
              reviewItems={reviewItems}
              profile={profile}
              onUpdateItem={onUpdateReviewItem}
              onSaveQuestion={onSaveQuestion}
            />
          </Section>

          <Section title="📝 CPA Questions & Summary" defaultOpen={false}>
            <CPAPrepSummaryTab
              questions={questions}
              reviewItems={reviewItems}
              profile={profile}
              onSave={onSaveQuestion}
              onUpdate={onUpdateQuestion}
              onDelete={onDeleteQuestion}
            />
          </Section>
        </div>

        {/* Sidebar: Intake Profile */}
        <div className="lg:sticky lg:top-4 self-start">
          <IntakeCard profile={profile} onSave={onSaveProfile} />
        </div>
      </div>
    </div>
  );
}
