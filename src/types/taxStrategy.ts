export interface TaxProfile {
  id?: string;
  user_id?: string;
  current_entity_type: string;
  projected_annual_profit: number | null;
  stable_income: boolean | null;
  payroll_active: boolean | null;
  admin_complexity_ok: boolean | null;
  retirement_interest: boolean | null;
  income_up_this_year: boolean | null;
  multi_facility_work: boolean | null;
  relief_income_major_source: boolean | null;
  reserve_percent: number | null;
}

export interface DeductionCategory {
  id?: string;
  user_id?: string;
  name: string;
  ytd_amount: number;
  documentation_status: string;
  receipt_completeness_percent: number;
  missing_docs_count: number;
  notes: string;
}

export interface TaxChecklistItem {
  id?: string;
  user_id?: string;
  item_key: string;
  label: string;
  completed: boolean;
  completed_at: string | null;
}

export interface CPAQuestion {
  id?: string;
  user_id?: string;
  question: string;
  source: string;
  resolved: boolean;
}

export interface TaxQuarterStatus {
  id?: string;
  user_id?: string;
  tax_year: number;
  quarter: number;
  due_date: string;
  status: string;
  notes: string;
}

export const DEFAULT_CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: 'entity_reviewed', label: 'Entity setup reviewed' },
  { key: 'estimated_taxes_reviewed', label: 'Estimated taxes reviewed this quarter' },
  { key: 'cpa_consulted', label: 'CPA consulted this year' },
  { key: 'payroll_reviewed', label: 'Payroll reviewed (if S-corp)' },
  { key: 'reasonable_comp', label: 'Reasonable compensation discussed (if S-corp)' },
  { key: 'accountable_plan', label: 'Accountable plan discussed (if S-corp)' },
  { key: 'deductions_reviewed', label: 'Deduction categories reviewed' },
  { key: 'receipts_organized', label: 'Receipts / docs organized' },
  { key: 'mileage_reviewed', label: 'Multi-clinic mileage tracking reviewed' },
  { key: 'ce_organized', label: 'CE / licensing costs organized' },
  { key: 'travel_docs', label: 'Travel / lodging documentation reviewed' },
  { key: 'cpa_packet_ready', label: 'Year-end CPA packet ready' },
];

export const DEFAULT_DEDUCTION_CATEGORIES = [
  'CE / licensing',
  'DEA / certification renewals',
  'Professional insurance / malpractice',
  'Mileage between clinics / facilities',
  'Travel for assignments',
  'Lodging for away assignments',
  'Meals while traveling for work',
  'Scrubs / work gear / supplies',
  'Equipment / supplies',
  'Software / subscriptions',
  'Phone / internet business portion',
  'Home office / business admin space',
  'Payroll / contractor help',
  'Retirement / benefits discussion',
  'Banking / payment processing fees',
  'Legal / accounting fees',
];

export const ENTITY_LABELS: Record<string, string> = {
  sole_proprietor: '1099 / Sole Proprietor',
  llc: 'LLC',
  s_corp: 'S-Corp',
};

export const QUARTER_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not started' },
  { value: 'reviewed', label: 'Reviewed with CPA' },
  { value: 'scheduled', label: 'Payment scheduled' },
  { value: 'paid', label: 'Paid' },
];

export const DOC_STATUS_OPTIONS = [
  { value: 'needs_review', label: 'Needs review', variant: 'secondary' as const },
  { value: 'in_progress', label: 'In progress', variant: 'outline' as const },
  { value: 'cpa_ready', label: 'CPA-ready', variant: 'default' as const },
];

export function evaluateCPAChecker(form: {
  projected_profit: number;
  entity: string;
  stable: boolean;
  payroll: boolean;
  admin_ok: boolean;
  retirement: boolean;
  income_up: boolean;
  multi_facility: boolean;
  relief_major: boolean;
}): string[] {
  const messages: string[] = [];

  if (form.projected_profit > 80000 && form.entity === 'sole_proprietor' && form.stable) {
    messages.push('With consistent income at this level, reviewing entity options with your CPA may be worthwhile.');
  }
  if (form.entity === 's_corp' && !form.payroll) {
    messages.push('Review payroll complexity and compensation planning with your CPA.');
  }
  if (form.entity === 's_corp') {
    messages.push('Discuss reasonable compensation requirements with your CPA.');
  }
  if (form.retirement) {
    messages.push('Retirement contribution options may be worth reviewing with your CPA, especially in context of your entity type.');
  }
  if (form.income_up) {
    messages.push('A significant income increase this year may be worth discussing with your CPA for planning purposes.');
  }
  if (form.multi_facility) {
    messages.push('Because you work across multiple facilities, documentation and reimbursement structure may be worth reviewing.');
  }
  if (form.relief_major && form.projected_profit > 50000) {
    messages.push('Since relief/locum work is a major income source, long-term entity and tax planning may be worth discussing.');
  }
  if (!form.admin_ok && form.entity !== 's_corp') {
    messages.push('You may want to keep things simple for now given your admin preferences.');
  }
  if (messages.length === 0) {
    messages.push('This may be worth discussing with your CPA to confirm your current setup still fits your situation.');
  }

  return messages;
}
