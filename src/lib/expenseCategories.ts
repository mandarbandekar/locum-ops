export type DeductibilityType = 'full' | 'fifty_percent' | 'above_the_line' | 'retirement' | 'other';

export interface ExpenseSubcategory {
  key: string;
  label: string;
  deductibilityType: DeductibilityType;
  tooltip: string;
}

export interface ExpenseCategoryGroup {
  key: string;
  label: string;
  subcategories: ExpenseSubcategory[];
}

export const EXPENSE_CATEGORIES: ExpenseCategoryGroup[] = [
  {
    key: 'travel_vehicle',
    label: 'Travel & Vehicle',
    subcategories: [
      { key: 'mileage', label: 'Mileage', deductibilityType: 'full', tooltip: 'IRS standard mileage deduction for driving between clinics' },
      { key: 'tolls_parking', label: 'Tolls & Parking', deductibilityType: 'full', tooltip: 'Tolls and parking for clinic commutes are fully deductible' },
      { key: 'flights_transport', label: 'Flights / Ground Transport', deductibilityType: 'full', tooltip: 'Travel to out-of-area relief assignments' },
      { key: 'hotel_lodging', label: 'Hotel / Lodging', deductibilityType: 'full', tooltip: 'Lodging for multi-day out-of-town relief work' },
    ],
  },
  {
    key: 'professional_compliance',
    label: 'Professional Compliance',
    subcategories: [
      { key: 'dvm_license', label: 'State DVM License Renewal', deductibilityType: 'full', tooltip: 'License fees required to practice veterinary medicine' },
      { key: 'dea_registration', label: 'DEA Registration & Renewal', deductibilityType: 'full', tooltip: 'DEA registration for prescribing controlled substances' },
      { key: 'usda_accreditation', label: 'USDA Accreditation Fee', deductibilityType: 'full', tooltip: 'National Veterinary Accreditation fee for USDA work' },
      { key: 'board_certification', label: 'Board Certification Fees', deductibilityType: 'full', tooltip: 'Specialty board certification and maintenance fees' },
    ],
  },
  {
    key: 'education_development',
    label: 'Education & Development',
    subcategories: [
      { key: 'ce_conference', label: 'CE Course / Conference', deductibilityType: 'full', tooltip: 'VMX, WVC, NAVC, and other CE events are deductible' },
      { key: 'online_ce', label: 'Online CE Subscription', deductibilityType: 'full', tooltip: 'VIN, Clinician\'s Brief, and similar CE platforms' },
      { key: 'textbooks_journals', label: 'Textbooks / Journals', deductibilityType: 'full', tooltip: 'Professional reference materials for your practice' },
    ],
  },
  {
    key: 'insurance',
    label: 'Insurance',
    subcategories: [
      { key: 'malpractice_eo', label: 'Malpractice / E&O Insurance', deductibilityType: 'full', tooltip: 'Liability coverage for your veterinary work' },
      { key: 'health_insurance', label: 'Health Insurance Premium', deductibilityType: 'above_the_line', tooltip: 'Self-employed health insurance — deducted on Schedule 1, not Schedule C' },
      { key: 'disability_insurance', label: 'Disability Insurance', deductibilityType: 'full', tooltip: 'Income protection insurance for self-employed vets' },
      { key: 'workers_comp', label: 'Workers Comp', deductibilityType: 'full', tooltip: 'Workers compensation if required in your state' },
    ],
  },
  {
    key: 'business_operations',
    label: 'Business Operations',
    subcategories: [
      { key: 'cpa_tax_prep', label: 'CPA / Tax Prep Fees', deductibilityType: 'full', tooltip: 'Accounting and tax preparation services' },
      { key: 'legal_contract', label: 'Legal / Contract Review', deductibilityType: 'full', tooltip: 'Attorney fees for contract review or business advice' },
      { key: 'llc_registered_agent', label: 'LLC / Registered Agent Fees', deductibilityType: 'full', tooltip: 'Entity formation and maintenance costs' },
      { key: 'business_banking', label: 'Business Banking Fees', deductibilityType: 'full', tooltip: 'Monthly fees for your business checking account' },
      { key: 'scorp_payroll', label: 'S-Corp Payroll Processing', deductibilityType: 'full', tooltip: 'Payroll service for S-Corp reasonable salary' },
    ],
  },
  {
    key: 'technology_software',
    label: 'Technology & Software',
    subcategories: [
      { key: 'reliefvet_os', label: 'ReliefVet OS Subscription', deductibilityType: 'full', tooltip: 'Yes, this app is deductible as a business tool!' },
      { key: 'scheduling_apps', label: 'Scheduling / Invoicing Apps', deductibilityType: 'full', tooltip: 'Software used to manage your relief business' },
      { key: 'vin_platform', label: 'VIN or Specialty Platform', deductibilityType: 'full', tooltip: 'Professional veterinary platforms and memberships' },
      { key: 'phone', label: 'Phone (Business Use %)', deductibilityType: 'full', tooltip: 'Prorate your phone bill by business use percentage' },
      { key: 'internet', label: 'Internet (Business Use %)', deductibilityType: 'full', tooltip: 'Prorate your internet bill by business use percentage' },
    ],
  },
  {
    key: 'equipment_supplies',
    label: 'Equipment & Supplies',
    subcategories: [
      { key: 'medical_equipment', label: 'Medical Equipment', deductibilityType: 'full', tooltip: 'Stethoscope, otoscope, and other clinical tools' },
      { key: 'scrubs_lab_coats', label: 'Scrubs & Lab Coats', deductibilityType: 'full', tooltip: 'Work-specific clothing that isn\'t suitable for everyday wear' },
      { key: 'ppe_supplies', label: 'PPE & Supplies', deductibilityType: 'full', tooltip: 'Gloves, masks, and disposable supplies you provide' },
      { key: 'medical_bag', label: 'Medical Bag / Kit', deductibilityType: 'full', tooltip: 'Carrying case or bag for your relief supplies' },
    ],
  },
  {
    key: 'home_office',
    label: 'Home Office',
    subcategories: [
      { key: 'home_office_deduction', label: 'Home Office Deduction', deductibilityType: 'full', tooltip: 'Simplified method: $5/sq ft up to 300 sq ft (Form 8829)' },
    ],
  },
  {
    key: 'meals_entertainment',
    label: 'Meals & Entertainment',
    subcategories: [
      { key: 'business_meals', label: 'Business Meals', deductibilityType: 'fifty_percent', tooltip: 'Meals during travel or with business contacts — 50% deductible' },
    ],
  },
  {
    key: 'retirement',
    label: 'Retirement (Write-Off Tracker)',
    subcategories: [
      { key: 'sep_ira', label: 'SEP-IRA Contribution', deductibilityType: 'retirement', tooltip: 'Retirement contributions tracked separately from Schedule C' },
      { key: 'solo_401k', label: 'Solo 401(k) Contribution', deductibilityType: 'retirement', tooltip: 'Retirement contributions tracked separately from Schedule C' },
    ],
  },
  {
    key: 'uncategorized',
    label: 'Uncategorized',
    subcategories: [
      { key: 'other', label: 'Other', deductibilityType: 'other', tooltip: 'Add a note and manually assign deductibility' },
    ],
  },
];

/** Flat lookup of all subcategories */
export const ALL_SUBCATEGORIES = EXPENSE_CATEGORIES.flatMap(g =>
  g.subcategories.map(s => ({ ...s, groupKey: g.key, groupLabel: g.label }))
);

export function findSubcategory(key: string) {
  return ALL_SUBCATEGORIES.find(s => s.key === key);
}

/** Calculate deductible amount in cents */
export function calculateDeductibleCents(
  amountCents: number,
  subcategoryKey: string,
): number {
  const sub = findSubcategory(subcategoryKey);
  if (!sub) return amountCents;
  if (sub.deductibilityType === 'fifty_percent') return Math.round(amountCents * 0.5);
  return amountCents;
}

/** Calculate mileage amount in cents */
export function calculateMileageAmountCents(miles: number, rateCents: number): number {
  return Math.round(miles * rateCents);
}

/** Calculate home office amount in cents (simplified method: $5/sqft, max 300 sqft) */
export function calculateHomeOfficeAmountCents(sqft: number, rateCents: number): number {
  const cappedSqft = Math.min(sqft, 300);
  return Math.round(cappedSqft * rateCents);
}

export function getDeductibilityLabel(type: DeductibilityType): string {
  switch (type) {
    case 'full': return 'Schedule C (100%)';
    case 'fifty_percent': return '50% Deductible';
    case 'above_the_line': return 'Above-the-Line (Schedule 1)';
    case 'retirement': return 'Retirement (Tracked Separately)';
    case 'other': return 'Other';
  }
}

/** Whether this subcategory needs a prorate % slider */
export function needsProrate(subcategoryKey: string): boolean {
  return subcategoryKey === 'phone' || subcategoryKey === 'internet';
}
