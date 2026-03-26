export type BillingCadence = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type WeekDay = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface FacilityBillingConfig {
  facility_id: string;
  billing_cadence: BillingCadence;
  billing_week_end_day: WeekDay;
  biweekly_anchor_date: string | null;
  auto_generate: boolean;
}

export const DEFAULT_BILLING_WEEK_END_DAY: WeekDay = 'saturday';

export function getDefaultBillingConfig(facilityId: string): FacilityBillingConfig {
  return {
    facility_id: facilityId,
    billing_cadence: 'monthly',
    billing_week_end_day: DEFAULT_BILLING_WEEK_END_DAY,
    biweekly_anchor_date: null,
    auto_generate: true,
  };
}

export interface InvoiceSenderProfile {
  first_name: string;
  last_name: string;
  company_name: string;
  company_address: string;
  email: string | null;
  phone: string | null;
}

export function validateSenderProfile(profile: InvoiceSenderProfile): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!profile.first_name && !profile.last_name) missing.push('name');
  if (!profile.company_name) missing.push('company name');
  if (!profile.email) missing.push('email');
  return { valid: missing.length === 0, missing };
}

export function hasBillingContact(facility: { invoice_name_to: string; invoice_email_to: string }): boolean {
  return !!(facility.invoice_name_to?.trim() && facility.invoice_email_to?.trim());
}
