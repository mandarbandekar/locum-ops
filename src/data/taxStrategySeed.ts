import type {
  TaxProfile, DeductionCategory, TaxChecklistItem, CPAQuestion, TaxQuarterStatus,
} from '@/types/taxStrategy';

const currentYear = new Date().getFullYear();

export const demoTaxProfile: TaxProfile = {
  id: 'demo-tax-profile',
  current_entity_type: 'sole_proprietor',
  projected_annual_profit: 145000,
  stable_income: true,
  payroll_active: false,
  admin_complexity_ok: true,
  retirement_interest: true,
  income_up_this_year: true,
  multi_facility_work: true,
  relief_income_major_source: true,
  reserve_percent: 30,
};

export const demoDeductionCategories: DeductionCategory[] = [
  { id: 'dc-1', name: 'CE / licensing', ytd_amount: 2400, documentation_status: 'cpa_ready', receipt_completeness_percent: 95, missing_docs_count: 0, notes: '' },
  { id: 'dc-2', name: 'DEA / certification renewals', ytd_amount: 850, documentation_status: 'cpa_ready', receipt_completeness_percent: 100, missing_docs_count: 0, notes: '' },
  { id: 'dc-3', name: 'Professional insurance / malpractice', ytd_amount: 3200, documentation_status: 'in_progress', receipt_completeness_percent: 75, missing_docs_count: 1, notes: 'Need updated COI from carrier' },
  { id: 'dc-4', name: 'Mileage between clinics / facilities', ytd_amount: 4800, documentation_status: 'needs_review', receipt_completeness_percent: 60, missing_docs_count: 3, notes: 'Review mileage log completeness with CPA' },
  { id: 'dc-5', name: 'Software / subscriptions', ytd_amount: 960, documentation_status: 'cpa_ready', receipt_completeness_percent: 100, missing_docs_count: 0, notes: '' },
  { id: 'dc-6', name: 'Travel for assignments', ytd_amount: 1800, documentation_status: 'needs_review', receipt_completeness_percent: 40, missing_docs_count: 5, notes: 'Missing hotel receipts for March and April assignments' },
];

export const demoChecklistItems: TaxChecklistItem[] = [
  { id: 'cl-1', item_key: 'entity_reviewed', label: 'Entity setup reviewed', completed: true, completed_at: `${currentYear}-02-15T00:00:00Z` },
  { id: 'cl-2', item_key: 'estimated_taxes_reviewed', label: 'Estimated taxes reviewed this quarter', completed: true, completed_at: `${currentYear}-03-01T00:00:00Z` },
  { id: 'cl-3', item_key: 'cpa_consulted', label: 'CPA consulted this year', completed: true, completed_at: `${currentYear}-01-20T00:00:00Z` },
  { id: 'cl-4', item_key: 'payroll_reviewed', label: 'Payroll reviewed (if S-corp)', completed: false, completed_at: null },
  { id: 'cl-5', item_key: 'reasonable_comp', label: 'Reasonable compensation discussed (if S-corp)', completed: false, completed_at: null },
  { id: 'cl-6', item_key: 'accountable_plan', label: 'Accountable plan discussed (if S-corp)', completed: false, completed_at: null },
  { id: 'cl-7', item_key: 'deductions_reviewed', label: 'Deduction categories reviewed', completed: true, completed_at: `${currentYear}-02-20T00:00:00Z` },
  { id: 'cl-8', item_key: 'receipts_organized', label: 'Receipts / docs organized', completed: false, completed_at: null },
  { id: 'cl-9', item_key: 'mileage_reviewed', label: 'Multi-clinic mileage tracking reviewed', completed: false, completed_at: null },
  { id: 'cl-10', item_key: 'ce_organized', label: 'CE / licensing costs organized', completed: true, completed_at: `${currentYear}-02-10T00:00:00Z` },
  { id: 'cl-11', item_key: 'travel_docs', label: 'Travel / lodging documentation reviewed', completed: false, completed_at: null },
  { id: 'cl-12', item_key: 'cpa_packet_ready', label: 'Year-end CPA packet ready', completed: false, completed_at: null },
];

export const demoCPAQuestions: CPAQuestion[] = [
  { id: 'cq-1', question: 'My relief income increased this year. Should we revisit entity structure?', source: 'default', resolved: false },
  { id: 'cq-2', question: 'I work across multiple clinics. What should I be tracking more carefully?', source: 'default', resolved: false },
  { id: 'cq-3', question: 'Should we discuss an accountable plan for mileage, CE, licensing, and other reimbursable business expenses?', source: 'default', resolved: false },
  { id: 'cq-4', question: 'Which categories need better documentation before year-end?', source: 'default', resolved: true },
  { id: 'cq-5', question: 'Should we review retirement contribution options this year?', source: 'default', resolved: false },
];

export const demoQuarterStatuses: TaxQuarterStatus[] = [
  { id: 'qs-1', tax_year: currentYear, quarter: 1, due_date: `${currentYear}-04-15`, status: 'paid', notes: '' },
  { id: 'qs-2', tax_year: currentYear, quarter: 2, due_date: `${currentYear}-06-15`, status: 'reviewed', notes: '' },
  { id: 'qs-3', tax_year: currentYear, quarter: 3, due_date: `${currentYear}-09-15`, status: 'not_started', notes: '' },
  { id: 'qs-4', tax_year: currentYear, quarter: 4, due_date: `${currentYear + 1}-01-15`, status: 'not_started', notes: '' },
];
