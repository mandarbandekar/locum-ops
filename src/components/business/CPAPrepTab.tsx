import { useState, useMemo } from 'react';
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
import SectionExportMenu from '@/components/cpa-prep/SectionExportMenu';
import { useCPAPrepData } from '@/hooks/useCPAPrepData';
import {
  buildMonthlyMileageRows, buildMileageTripLog, buildMonthlyPnL,
  buildMonthlyClinicIncome, buildMonthlyExpensesByCategory,
  mileageCsv, pnlCsv, clinicIncomeCsv, expenseReviewCsv, receivablesCsv,
} from '@/lib/cpaPrepExports';
import {
  newDoc, finalize,
  appendMileageSection, appendPnLSection, appendClinicIncomeSection,
  appendExpenseReviewSection, appendReceivablesSection, appendReadinessSection,
} from '@/lib/cpaPrepPdf';
import type {
  TaxAdvisorProfile, TaxOpportunityReviewItem, SavedTaxQuestion, ReviewStatus,
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

function Section({ title, action, defaultOpen = true, children }: { title: string; action?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between gap-3">
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center gap-2 text-left flex-1 hover:opacity-80 transition-opacity">
                <CardTitle className="flex items-center gap-2 text-base">
                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {title}
                </CardTitle>
              </button>
            </CollapsibleTrigger>
            {action}
          </div>
        </CardHeader>
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
  const year = new Date().getFullYear();

  // Lazy builders shared across section + full-packet exports
  const mileage = useMemo(() => buildMonthlyMileageRows(cpd.confirmedMileageExpenses, year, cpd.irsRateCents), [cpd.confirmedMileageExpenses, year, cpd.irsRateCents]);
  const mileageTripLog = useMemo(() => buildMileageTripLog(cpd.confirmedMileageExpenses, cpd.facilities, year, cpd.irsRateCents), [cpd.confirmedMileageExpenses, cpd.facilities, year, cpd.irsRateCents]);
  const pnl = useMemo(() => buildMonthlyPnL(cpd.invoices, cpd.ytdExpenses, year), [cpd.invoices, cpd.ytdExpenses, year]);
  const clinicInc = useMemo(() => buildMonthlyClinicIncome(cpd.invoices, cpd.shifts, cpd.facilities, year), [cpd.invoices, cpd.shifts, cpd.facilities, year]);
  const expReview = useMemo(() => buildMonthlyExpensesByCategory(cpd.ytdExpenses, year), [cpd.ytdExpenses, year]);

  const mileageExport = (
    <SectionExportMenu
      label="Monthly Mileage"
      filename={`Monthly_Mileage_${year}`}
      disabled={mileage.totals.miles === 0}
      buildPdf={() => {
        const d = newDoc();
        appendMileageSection(d, year, cpd.irsRateCents, mileage.rows, mileage.totals, mileageClinic, cpd.startingMiles, cpd.startingMilesNote);
        return finalize(d);
      }}
      buildCsv={() => mileageCsv(mileage.rows, mileage.totals, mileageClinic, cpd.irsRateCents, year)}
    />
  );
  const pnlExport = (
    <SectionExportMenu
      label="Profit & Loss" filename={`Profit_Loss_${year}`}
      buildPdf={() => { const d = newDoc(); appendPnLSection(d, year, pnl.rows, pnl.totals); return finalize(d); }}
      buildCsv={() => pnlCsv(pnl.rows, pnl.totals, year)}
    />
  );
  const clinicIncomeExport = (
    <SectionExportMenu
      label="Income by Clinic" filename={`Income_by_Clinic_${year}`}
      buildPdf={() => { const d = newDoc(); appendClinicIncomeSection(d, year, clinicInc); return finalize(d); }}
      buildCsv={() => clinicIncomeCsv(clinicInc, year)}
    />
  );
  const receivablesExport = (
    <SectionExportMenu
      label="Accounts Receivable" filename={`Accounts_Receivable_${year}`}
      buildPdf={() => { const d = newDoc(); appendReceivablesSection(d, year, cpd.receivables); return finalize(d); }}
      buildCsv={() => receivablesCsv(cpd.receivables, year)}
    />
  );
  const expReviewExport = (
    <SectionExportMenu
      label="Expense Review" filename={`Expense_Review_${year}`}
      buildPdf={() => { const d = newDoc(); appendExpenseReviewSection(d, year, expReview); return finalize(d); }}
      buildCsv={() => expenseReviewCsv(expReview, year)}
    />
  );
  const readinessExport = (
    <SectionExportMenu
      label="Readiness" filename={`CPA_Readiness_${year}`}
      buildPdf={() => { const d = newDoc(); appendReadinessSection(d, year, cpd.readiness, cpd.agenda); return finalize(d); }}
      buildCsv={() => 'Status,Item\n' + cpd.readiness.map(r => `${r.status === 'ok' ? 'OK' : 'Review'},${JSON.stringify(r.label)}`).join('\n')}
    />
  );

  return (
    <div className="space-y-6">
      <AdvisorDisclaimerBanner />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Quarterly Tax Prep Dashboard</h2>
          <p className="text-sm text-muted-foreground">Everything your CPA needs — in one place.</p>
        </div>
        <ExportCPAPacket
          year={year}
          irsRateCents={cpd.irsRateCents}
          invoices={cpd.invoices}
          shifts={cpd.shifts}
          facilities={cpd.facilities}
          ytdExpenses={cpd.ytdExpenses}
          confirmedMileageExpenses={cpd.confirmedMileageExpenses}
          startingMiles={cpd.startingMiles}
          startingMilesNote={cpd.startingMilesNote}
          receivables={cpd.receivables}
          readiness={cpd.readiness}
          agenda={cpd.agenda}
        />
      </div>

      <QuarterlySnapshot snapshot={cpd.snapshot} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <Section title="📈 Profit & Loss Summary" action={pnlExport}>
            <ProfitLossSummary
              monthly={cpd.pnlMonthly}
              quarterly={cpd.pnlQuarterly}
              byCategory={cpd.pnlByCategory}
              totalIncomeCents={cpd.snapshot.ytdIncomeCents}
              totalExpenseCents={cpd.snapshot.ytdExpensesCents}
            />
          </Section>

          <Section title="🏥 Income by Clinic" action={clinicIncomeExport}>
            <IncomeByClinic rows={cpd.clinicIncome} />
          </Section>

          <Section title="💳 Accounts Receivable" action={receivablesExport}>
            <AccountsReceivable data={cpd.receivables} />
          </Section>

          <Section title="🧾 Expense Review by Tax Category" action={expReviewExport}>
            <ExpenseReview rows={cpd.expenseReview} />
          </Section>

          <Section title="🚗 Monthly Mileage Report" action={mileageExport}>
            <MileageSummary
              data={cpd.mileage}
              expenses={cpd.confirmedMileageExpenses}
              irsRateCents={cpd.irsRateCents}
              year={year}
            />
          </Section>

          <Section title="✅ CPA Readiness Checklist" action={readinessExport}>
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

        <div className="lg:sticky lg:top-4 self-start">
          <IntakeCard profile={profile} onSave={onSaveProfile} />
        </div>
      </div>
    </div>
  );
}
