export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export type FacilityStatus = 'prospect' | 'active' | 'paused';
export interface Facility {
  id: string;
  name: string;
  status: FacilityStatus;
  address: string;
  timezone: string;
  notes: string;
  outreach_last_sent_at: string | null;
}

export type ContactRole = 'scheduler' | 'billing' | 'emergency' | 'other';
export interface FacilityContact {
  id: string;
  facility_id: string;
  name: string;
  role: ContactRole;
  email: string;
  phone: string;
  is_primary: boolean;
}

export interface TermsSnapshot {
  id: string;
  facility_id: string;
  weekday_rate: number;
  weekend_rate: number;
  cancellation_policy_text: string;
  overtime_policy_text: string;
  late_payment_policy_text: string;
  special_notes: string;
}

export type ShiftStatus = 'proposed' | 'booked' | 'completed' | 'canceled';
export interface Shift {
  id: string;
  facility_id: string;
  start_datetime: string;
  end_datetime: string;
  status: ShiftStatus;
  rate_applied: number;
  notes: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';
export interface Invoice {
  id: string;
  facility_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  status: InvoiceStatus;
  sent_at: string | null;
  paid_at: string | null;
  due_date: string | null;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  shift_id: string | null;
  description: string;
  qty: number;
  unit_rate: number;
  line_total: number;
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
