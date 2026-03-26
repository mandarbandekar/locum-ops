export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export type FacilityStatus = 'prospect' | 'active' | 'paused';
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

export interface TermsSnapshot {
  id: string;
  facility_id: string;
  weekday_rate: number;
  weekend_rate: number;
  partial_day_rate: number;
  holiday_rate: number;
  telemedicine_rate: number;
  cancellation_policy_text: string;
  overtime_policy_text: string;
  late_payment_policy_text: string;
  special_notes: string;
  custom_rates?: Array<{ label: string; amount: number }>;
}

export type ShiftStatus = 'proposed' | 'booked' | 'completed' | 'canceled';
export type ShiftColor = 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'pink' | 'teal' | 'yellow';
export const SHIFT_COLORS: { value: ShiftColor; label: string; bg: string; text: string }[] = [
  { value: 'blue', label: 'Blue', bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-400' },
  { value: 'green', label: 'Green', bg: 'bg-green-500/15', text: 'text-green-700 dark:text-green-400' },
  { value: 'red', label: 'Red', bg: 'bg-red-500/15', text: 'text-red-700 dark:text-red-400' },
  { value: 'orange', label: 'Orange', bg: 'bg-orange-500/15', text: 'text-orange-700 dark:text-orange-400' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-500/15', text: 'text-purple-700 dark:text-purple-400' },
  { value: 'pink', label: 'Pink', bg: 'bg-pink-500/15', text: 'text-pink-700 dark:text-pink-400' },
  { value: 'teal', label: 'Teal', bg: 'bg-teal-500/15', text: 'text-teal-700 dark:text-teal-400' },
  { value: 'yellow', label: 'Yellow', bg: 'bg-yellow-500/15', text: 'text-yellow-700 dark:text-yellow-400' },
];
export interface Shift {
  id: string;
  facility_id: string;
  start_datetime: string;
  end_datetime: string;
  status: ShiftStatus;
  rate_applied: number;
  notes: string;
  color: ShiftColor;
}

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';
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

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  shift_id: string | null;
  description: string;
  service_date: string | null;
  qty: number;
  unit_rate: number;
  line_total: number;
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
