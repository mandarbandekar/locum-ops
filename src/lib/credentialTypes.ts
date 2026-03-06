export const CREDENTIAL_TYPE_LABELS: Record<string, string> = {
  veterinary_license: 'Veterinary License',
  dea_registration: 'DEA Registration',
  state_controlled_substance: 'State Controlled Substance Permit',
  usda_accreditation: 'USDA Accreditation',
  malpractice_insurance: 'Malpractice Insurance',
  professional_liability_insurance: 'Professional Liability Insurance',
  workers_comp_policy: "Workers' Comp Policy",
  business_license: 'Business License',
  llc_scorp_registration: 'LLC / S-Corp Registration',
  w9: 'W-9',
  ce_certificate: 'CE Certificate',
  background_check: 'Background Check',
  contractor_onboarding: 'Contractor Onboarding Form',
  vaccination_health_record: 'Vaccination / Health Record',
  custom: 'Custom',
};

export const CREDENTIAL_TYPES = Object.keys(CREDENTIAL_TYPE_LABELS);

export const CREDENTIAL_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  renewing: 'Renewing',
  archived: 'Archived',
};

export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  license: 'License Documents',
  registration: 'Registrations',
  insurance: 'Insurance',
  tax: 'Tax Docs',
  onboarding: 'Onboarding',
  ce: 'CE Docs',
  legal_business: 'Legal / Business',
  identity: 'Identity',
  custom: 'Custom',
};

export const RENEWAL_FREQUENCIES = [
  { value: 'annually', label: 'Annually' },
  { value: 'biannually', label: 'Every 2 Years' },
  { value: 'triannually', label: 'Every 3 Years' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'none', label: 'No Renewal' },
];

export const REMINDER_LEAD_TIMES = [
  { value: '120', label: '120 days before' },
  { value: '90', label: '90 days before' },
  { value: '60', label: '60 days before' },
  { value: '30', label: '30 days before' },
  { value: '14', label: '14 days before' },
  { value: '7', label: '7 days before' },
  { value: '1', label: '1 day before' },
];

export function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'expiring_soon': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'renewing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'archived': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function getDaysUntilExpiration(expirationDate: string | null): number | null {
  if (!expirationDate) return null;
  const now = new Date();
  const exp = new Date(expirationDate);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function computeCredentialStatus(expirationDate: string | null, currentStatus: string): string {
  if (currentStatus === 'archived' || currentStatus === 'renewing') return currentStatus;
  if (!expirationDate) return 'active';
  const days = getDaysUntilExpiration(expirationDate);
  if (days === null) return 'active';
  if (days < 0) return 'expired';
  if (days <= 60) return 'expiring_soon';
  return 'active';
}
