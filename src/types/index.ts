export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export type FacilityStatus = 'active' | 'archived';
export type BillingCadence = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export interface Facility {
  id: string;
  name: string;
  status: FacilityStatus;
  address: string;
  timezone: string;
  notes: string;
  outreach_last_sent_at: string | null;
  tech_computer_info: string;
  tech_wifi_info: string;
  tech_pims_info: string;
  clinic_access_info: string;
  invoice_prefix: string;
  invoice_due_days: number;
  invoice_name_to: string;
  invoice_email_to: string;
  invoice_name_cc: string;
  invoice_email_cc: string;
  invoice_name_bcc: string;
  invoice_email_bcc: string;
  billing_cadence: BillingCadence;
  billing_cycle_anchor_date: string | null;
  billing_week_end_day: string;
  auto_generate_invoices: boolean;
  engagement_type?: 'direct' | 'third_party' | 'w2';
  source_name?: string | null;
  tax_form_type?: '1099' | 'w2' | null;
}

export type ContactRole = string;
export interface FacilityContact {
  id: string;
  facility_id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  is_primary: boolean;
}

export type RateKind = 'flat' | 'hourly';

export type PredefinedRateKey = 'weekday' | 'weekend' | 'partial_day' | 'holiday' | 'telemedicine';

export interface TermsSnapshot {
  id: string;
  facility_id: string;
  weekday_rate: number;
  weekend_rate: number;
  partial_day_rate: number;
  holiday_rate: number;
  telemedicine_rate: number;
  cancellation_policy_text: string;
  /** Free-text contract clause describing overtime terms. Not used for calculation. */
  overtime_policy_text: string;
  late_payment_policy_text: string;
  special_notes: string;
  custom_rates?: Array<{
    label: string;
    amount: number;
    kind?: RateKind;
  }>;
  rate_kinds?: Partial<Record<PredefinedRateKey, RateKind>>;
}

export type ShiftColor = 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'pink' | 'teal' | 'yellow';
export const SHIFT_COLORS: { value: ShiftColor; label: string; bg: string; text: string }[] = [
  { value: 'blue', label: 'Pacific', bg: 'bg-[#E8F3F5] dark:bg-[#1A3840]', text: 'text-[#0E3A44] dark:text-[#B0DDE5]' },
  { value: 'green', label: 'Kelp', bg: 'bg-[#EBF3EE] dark:bg-[#1A2E22]', text: 'text-[#17382A] dark:text-[#A3D6B5]' },
  { value: 'red', label: 'Ochre', bg: 'bg-[#F4EDE2] dark:bg-[#332818]', text: 'text-[#54401C] dark:text-[#EBD9C2]' },
  { value: 'orange', label: 'Sandstone', bg: 'bg-[#F5E8D6] dark:bg-[#3A2D1A]', text: 'text-[#6B4A1F] dark:text-[#E8C898]' },
  { value: 'purple', label: 'Driftwood', bg: 'bg-[#EFE9E2] dark:bg-[#2E2820]', text: 'text-[#4A3E32] dark:text-[#D4C4B0]' },
  { value: 'pink', label: 'Coral Mist', bg: 'bg-[#F2E4DE] dark:bg-[#3A2620]', text: 'text-[#6B3D2E] dark:text-[#E5B8A5]' },
  { value: 'teal', label: 'Tidepool', bg: 'bg-[#DDEDEA] dark:bg-[#1A3530]', text: 'text-[#1F4F47] dark:text-[#9FCDC0]' },
  { value: 'yellow', label: 'Sandy Amber', bg: 'bg-[#FDF5E6] dark:bg-[#3A2E14]', text: 'text-[#7A5A14] dark:text-[#E8C66B]' },
];
export interface Shift {
  id: string;
  facility_id: string;
  start_datetime: string;
  end_datetime: string;
  rate_applied: number;
  notes: string;
  color: ShiftColor;
  rate_kind?: RateKind;
  hourly_rate?: number | null;
  engagement_type_override?: 'direct' | 'third_party' | 'w2' | null;
  source_name_override?: string | null;
}

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid';
export type InvoiceType = 'single' | 'bulk';
export type InvoiceGenerationType = 'manual' | 'automatic';
export interface Invoice {
  id: string;
  facility_id: string;
  invoice_number: string;
  invoice_date: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  balance_due: number;
  status: InvoiceStatus;
  sent_at: string | null;
  paid_at: string | null;
  due_date: string | null;
  notes: string;
  share_token: string | null;
  share_token_created_at: string | null;
  share_token_revoked_at: string | null;
  invoice_type: InvoiceType;
  generation_type: InvoiceGenerationType;
  billing_cadence: BillingCadence | null;
}

export type InvoiceLineKind = 'regular' | 'flat';
export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  shift_id: string | null;
  description: string;
  service_date: string | null;
  qty: number;
  unit_rate: number;
  line_total: number;
  /** Distinguishes hourly (regular) lines from flat day-rate lines. */
  line_kind?: InvoiceLineKind;
}

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  method: string;
  account: string;
  memo: string;
}

export interface InvoiceActivity {
  id: string;
  invoice_id: string;
  action: string;
  description: string;
  created_at: string;
}

export type BlockType = 'vacation' | 'family' | 'appointment' | 'training' | 'other';
export const BLOCK_TYPES: { value: BlockType; label: string; icon: string }[] = [
  { value: 'vacation', label: 'Vacation', icon: '🌴' },
  { value: 'family', label: 'Family Time', icon: '👨‍👩‍👧' },
  { value: 'appointment', label: 'Appointment', icon: '🏥' },
  { value: 'training', label: 'Training', icon: '📚' },
  { value: 'other', label: 'Other', icon: '🔒' },
];
export const BLOCK_COLORS: { value: string; label: string; bg: string; text: string }[] = [
  { value: 'gray', label: 'Fog', bg: 'bg-[#E9E5DC] dark:bg-[#2A2D32]', text: 'text-[#5C5850] dark:text-[#B0B5BA]' },
  { value: 'purple', label: 'Driftwood', bg: 'bg-[#EFE9E2] dark:bg-[#2E2820]', text: 'text-[#4A3E32] dark:text-[#D4C4B0]' },
  { value: 'teal', label: 'Pacific', bg: 'bg-[#E8F3F5] dark:bg-[#1A3840]', text: 'text-[#0E3A44] dark:text-[#B0DDE5]' },
  { value: 'pink', label: 'Coral Mist', bg: 'bg-[#F2E4DE] dark:bg-[#3A2620]', text: 'text-[#6B3D2E] dark:text-[#E5B8A5]' },
];
export interface TimeBlock {
  id: string;
  title: string;
  block_type: BlockType;
  start_datetime: string;
  end_datetime: string;
  all_day: boolean;
  notes: string;
  color: string;
}

export type EmailLogType = 'outreach_open' | 'monthly_confirm' | 'invoice' | 'reminder';
export interface EmailLog {
  id: string;
  facility_id: string;
  type: EmailLogType;
  subject: string;
  body: string;
  recipients: string;
  sent_at: string;
}
