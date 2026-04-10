import { Facility, FacilityContact, TermsSnapshot, Shift, Invoice, InvoiceLineItem, EmailLog } from '@/types';
import type { UserProfile } from '@/contexts/UserProfileContext';
import { Contract, ContractTerms, ContractChecklistItem } from '@/types/contracts';

const today = new Date();
const fmt = (d: Date) => d.toISOString();
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const setTime = (d: Date, h: number, m = 0) => { const r = new Date(d); r.setHours(h, m, 0, 0); return r; };

// === STARTER data (one example facility for new sign-ups) ===

export const starterFacilities: Facility[] = [
  { id: 'c1', name: 'Greenfield Medical Center', status: 'active', address: '123 Oak St, Portland, OR 97201', timezone: 'America/Los_Angeles', notes: 'Example facility — edit or delete this anytime', outreach_last_sent_at: null, tech_computer_info: '', tech_wifi_info: '', tech_pims_info: '', clinic_access_info: '', invoice_prefix: 'GMC', invoice_due_days: 15, invoice_name_to: '', invoice_email_to: '', invoice_name_cc: '', invoice_email_cc: '', invoice_name_bcc: '', invoice_email_bcc: '', billing_cadence: 'monthly', billing_cycle_anchor_date: null, billing_week_end_day: 'saturday', auto_generate_invoices: true },
];

export const starterContacts: FacilityContact[] = [
  { id: 'ct1', facility_id: 'c1', name: 'Sarah Johnson', role: 'practice_manager', email: 'sarah@greenfield.com', phone: '503-555-0101', is_primary: true },
];

export const starterTerms: TermsSnapshot[] = [
  { id: 'cs1', facility_id: 'c1', weekday_rate: 850, weekend_rate: 1100, partial_day_rate: 500, holiday_rate: 1400, telemedicine_rate: 600, cancellation_policy_text: '48-hour notice required for cancellation without penalty.', overtime_policy_text: 'Time-and-a-half after 10 hours.', late_payment_policy_text: '1.5% monthly interest on balances over 30 days.', special_notes: 'Current credentials required.', custom_rates: [] },
];

export const starterShifts: Shift[] = [
  { id: 's5', facility_id: 'c1', start_datetime: fmt(setTime(addDays(today, 2), 8)), end_datetime: fmt(setTime(addDays(today, 2), 18)), rate_applied: 850, notes: 'Example shift', color: 'blue' },
];

export const starterInvoices: Invoice[] = [];
export const starterLineItems: InvoiceLineItem[] = [];
export const starterEmailLogs: EmailLog[] = [];

// === DEMO data (full set for demo mode) ===

const facDefaults = { billing_cadence: 'monthly' as const, billing_cycle_anchor_date: null, billing_week_end_day: 'saturday', auto_generate_invoices: true };
export const seedFacilities: Facility[] = [
  { id: 'c1', name: 'Greenfield Medical Center', status: 'active', address: '123 Oak St, Portland, OR 97201', timezone: 'America/Los_Angeles', notes: 'Great team, flexible scheduling', outreach_last_sent_at: fmt(addDays(today, -15)), tech_computer_info: 'Desktop login: locum1 / pass: Gr33nfield!', tech_wifi_info: 'Network: GFC-Staff, Password: wellness2026', tech_pims_info: 'Cornerstone — user: locum.vet / pass: temp1234', clinic_access_info: 'Front door code: 4521. Park in lot B. Keys at reception.', invoice_prefix: 'GMC', invoice_due_days: 14, invoice_name_to: 'Billing Dept', invoice_email_to: 'billing@greenfield.com', invoice_name_cc: '', invoice_email_cc: '', invoice_name_bcc: '', invoice_email_bcc: '', ...facDefaults },
  { id: 'c2', name: 'Evergreen Health Clinic', status: 'active', address: '456 Pine Ave, Seattle, WA 98101', timezone: 'America/Los_Angeles', notes: 'Busy facility, weekend shifts common', outreach_last_sent_at: fmt(addDays(today, -30)), tech_computer_info: '', tech_wifi_info: 'EHC-Guest / evergreen99', tech_pims_info: 'eVetPractice — ask front desk for temp login', clinic_access_info: 'Ring buzzer at side entrance. After hours use code 7890.', invoice_prefix: 'EHC', invoice_due_days: 30, invoice_name_to: 'Dr. Emily Park', invoice_email_to: 'emily@evergreen-hc.com', invoice_name_cc: '', invoice_email_cc: '', invoice_name_bcc: '', invoice_email_bcc: '', ...facDefaults, billing_cadence: 'weekly' as const },
  { id: 'c3', name: 'Sunrise Care Center', status: 'active', address: '789 Elm Dr, Boise, ID 83701', timezone: 'America/Boise', notes: 'Initial outreach sent, awaiting response', outreach_last_sent_at: null, tech_computer_info: '', tech_wifi_info: '', tech_pims_info: '', clinic_access_info: '', invoice_prefix: 'SCC', invoice_due_days: 15, invoice_name_to: '', invoice_email_to: '', invoice_name_cc: '', invoice_email_cc: '', invoice_name_bcc: '', invoice_email_bcc: '', ...facDefaults },
  { id: 'c4', name: 'Mountain View Practice', status: 'active', address: '321 Birch Ln, Denver, CO 80201', timezone: 'America/Denver', notes: 'Monthly regular shifts', outreach_last_sent_at: fmt(addDays(today, -10)), tech_computer_info: 'Shared laptop in break room', tech_wifi_info: 'MVP-Clinic / mountain2026', tech_pims_info: 'Avimark — locum account pre-configured', clinic_access_info: 'Main entrance unlocked 7am–7pm. After hours call Rachel.', invoice_prefix: 'MVP', invoice_due_days: 14, invoice_name_to: '', invoice_email_to: '', invoice_name_cc: '', invoice_email_cc: '', invoice_name_bcc: '', invoice_email_bcc: '', ...facDefaults },
  { id: 'c5', name: 'Coastal Wellness Group', status: 'archived', address: '555 Beach Blvd, San Diego, CA 92101', timezone: 'America/Los_Angeles', notes: 'Archived due to staffing changes', outreach_last_sent_at: fmt(addDays(today, -60)), tech_computer_info: '', tech_wifi_info: '', tech_pims_info: '', clinic_access_info: '', invoice_prefix: 'CWG', invoice_due_days: 15, invoice_name_to: '', invoice_email_to: '', invoice_name_cc: '', invoice_email_cc: '', invoice_name_bcc: '', invoice_email_bcc: '', ...facDefaults },
];

export const seedContacts: FacilityContact[] = [
  { id: 'ct1', facility_id: 'c1', name: 'Sarah Johnson', role: 'practice_manager', email: 'sarah@greenfield.com', phone: '503-555-0101', is_primary: true },
  { id: 'ct3', facility_id: 'c2', name: 'Dr. Emily Park', role: 'practice_manager', email: 'emily@evergreen-hc.com', phone: '206-555-0201', is_primary: true },
  { id: 'ct5', facility_id: 'c3', name: 'Tom Harris', role: 'practice_manager', email: 'tom@sunrisecare.com', phone: '208-555-0301', is_primary: true },
  { id: 'ct6', facility_id: 'c4', name: 'Rachel Kim', role: 'practice_manager', email: 'rachel@mtviewpractice.com', phone: '303-555-0401', is_primary: true },
  { id: 'ct7', facility_id: 'c5', name: 'Dave Martinez', role: 'practice_manager', email: 'dave@coastalwg.com', phone: '619-555-0501', is_primary: true },
];

export const seedTerms: TermsSnapshot[] = [
  { id: 'cs1', facility_id: 'c1', weekday_rate: 850, weekend_rate: 1100, partial_day_rate: 500, holiday_rate: 1400, telemedicine_rate: 600, cancellation_policy_text: '48-hour notice required for cancellation without penalty.', overtime_policy_text: 'Time-and-a-half after 10 hours.', late_payment_policy_text: '1.5% monthly interest on balances over 30 days.', special_notes: 'Current credentials required.', custom_rates: [] },
  { id: 'cs2', facility_id: 'c2', weekday_rate: 900, weekend_rate: 1200, partial_day_rate: 550, holiday_rate: 1500, telemedicine_rate: 650, cancellation_policy_text: '72-hour cancellation notice.', overtime_policy_text: 'Flat rate, no overtime.', late_payment_policy_text: 'Net 30 terms.', special_notes: 'Prior experience preferred.', custom_rates: [] },
  { id: 'cs4', facility_id: 'c4', weekday_rate: 800, weekend_rate: 1050, partial_day_rate: 450, holiday_rate: 1300, telemedicine_rate: 0, cancellation_policy_text: '24-hour notice.', overtime_policy_text: 'Standard overtime after 8 hours.', late_payment_policy_text: 'Net 14 terms.', special_notes: '', custom_rates: [] },
];

// Next month shifts for confirmations demo
const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
const nmDay = (d: number) => new Date(nextMonth.getFullYear(), nextMonth.getMonth(), d);

export const seedShifts: Shift[] = [
  { id: 's1', facility_id: 'c1', start_datetime: fmt(setTime(addDays(today, -12), 8)), end_datetime: fmt(setTime(addDays(today, -12), 18)), rate_applied: 850, notes: 'Regular day shift', color: 'blue' },
  { id: 's2', facility_id: 'c1', start_datetime: fmt(setTime(addDays(today, -5), 8)), end_datetime: fmt(setTime(addDays(today, -5), 18)), rate_applied: 850, notes: '', color: 'blue' },
  { id: 's3', facility_id: 'c2', start_datetime: fmt(setTime(addDays(today, -8), 7)), end_datetime: fmt(setTime(addDays(today, -8), 19)), rate_applied: 900, notes: 'Extended coverage', color: 'green' },
  { id: 's4', facility_id: 'c2', start_datetime: fmt(setTime(addDays(today, -3), 8)), end_datetime: fmt(setTime(addDays(today, -3), 16)), rate_applied: 1200, notes: 'Weekend shift', color: 'orange' },
  { id: 's5', facility_id: 'c1', start_datetime: fmt(setTime(addDays(today, 2), 8)), end_datetime: fmt(setTime(addDays(today, 2), 18)), rate_applied: 850, notes: '', color: 'blue' },
  { id: 's6', facility_id: 'c4', start_datetime: fmt(setTime(addDays(today, 3), 9)), end_datetime: fmt(setTime(addDays(today, 3), 17)), rate_applied: 800, notes: '', color: 'purple' },
  { id: 's7', facility_id: 'c2', start_datetime: fmt(setTime(addDays(today, 5), 7)), end_datetime: fmt(setTime(addDays(today, 5), 19)), rate_applied: 900, notes: 'Full day coverage', color: 'green' },
  { id: 's8', facility_id: 'c4', start_datetime: fmt(setTime(addDays(today, 10), 9)), end_datetime: fmt(setTime(addDays(today, 10), 17)), rate_applied: 800, notes: 'Tentative', color: 'purple' },
  { id: 's9', facility_id: 'c1', start_datetime: fmt(setTime(addDays(today, 14), 8)), end_datetime: fmt(setTime(addDays(today, 14), 18)), rate_applied: 850, notes: '', color: 'teal' },
  // Next month shifts for confirmations
  { id: 'snm1', facility_id: 'c1', start_datetime: fmt(setTime(nmDay(3), 8)), end_datetime: fmt(setTime(nmDay(3), 18)), rate_applied: 850, notes: '', color: 'blue' },
  { id: 'snm2', facility_id: 'c1', start_datetime: fmt(setTime(nmDay(10), 8)), end_datetime: fmt(setTime(nmDay(10), 18)), rate_applied: 850, notes: '', color: 'blue' },
  { id: 'snm3', facility_id: 'c1', start_datetime: fmt(setTime(nmDay(17), 8)), end_datetime: fmt(setTime(nmDay(17), 18)), rate_applied: 850, notes: '', color: 'blue' },
  { id: 'snm4', facility_id: 'c2', start_datetime: fmt(setTime(nmDay(5), 7)), end_datetime: fmt(setTime(nmDay(5), 19)), rate_applied: 900, notes: '', color: 'green' },
  { id: 'snm5', facility_id: 'c2', start_datetime: fmt(setTime(nmDay(12), 7)), end_datetime: fmt(setTime(nmDay(12), 19)), rate_applied: 900, notes: '', color: 'green' },
  { id: 'snm6', facility_id: 'c4', start_datetime: fmt(setTime(nmDay(8), 9)), end_datetime: fmt(setTime(nmDay(8), 17)), rate_applied: 800, notes: '', color: 'purple' },
  { id: 'snm7', facility_id: 'c4', start_datetime: fmt(setTime(nmDay(15), 9)), end_datetime: fmt(setTime(nmDay(15), 17)), rate_applied: 800, notes: '', color: 'purple' },
  { id: 'snm8', facility_id: 'c4', start_datetime: fmt(setTime(nmDay(22), 9)), end_datetime: fmt(setTime(nmDay(22), 17)), rate_applied: 800, notes: '', color: 'purple' },
];

const invDefaults = { generation_type: 'manual' as const, billing_cadence: null };
export const seedInvoices: Invoice[] = [
  { id: 'i1', facility_id: 'c1', invoice_number: 'GMC-2026-001', invoice_date: fmt(addDays(today, -15)), period_start: fmt(addDays(today, -30)), period_end: fmt(addDays(today, -16)), total_amount: 850, balance_due: 0, status: 'paid', sent_at: fmt(addDays(today, -14)), paid_at: fmt(addDays(today, -7)), due_date: fmt(addDays(today, 0)), notes: '', share_token: null, share_token_created_at: null, share_token_revoked_at: null, invoice_type: 'single', ...invDefaults },
  { id: 'i2', facility_id: 'c2', invoice_number: 'EHC-2026-001', invoice_date: fmt(addDays(today, -2)), period_start: fmt(addDays(today, -15)), period_end: fmt(addDays(today, -1)), total_amount: 2100, balance_due: 2100, status: 'sent', sent_at: fmt(addDays(today, -1)), paid_at: null, due_date: fmt(addDays(today, 13)), notes: '', share_token: null, share_token_created_at: null, share_token_revoked_at: null, invoice_type: 'bulk', ...invDefaults },
  { id: 'i3', facility_id: 'c1', invoice_number: 'GMC-2026-002', invoice_date: fmt(today), period_start: fmt(addDays(today, -14)), period_end: fmt(addDays(today, -1)), total_amount: 850, balance_due: 850, status: 'draft', sent_at: null, paid_at: null, due_date: null, notes: '', share_token: null, share_token_created_at: null, share_token_revoked_at: null, invoice_type: 'single', ...invDefaults },
  { id: 'i4', facility_id: 'c4', invoice_number: 'MVP-2025-042', invoice_date: fmt(addDays(today, -45)), period_start: fmt(addDays(today, -60)), period_end: fmt(addDays(today, -46)), total_amount: 1600, balance_due: 1600, status: 'sent', sent_at: fmt(addDays(today, -44)), paid_at: null, due_date: fmt(addDays(today, -30)), notes: '', share_token: null, share_token_created_at: null, share_token_revoked_at: null, invoice_type: 'single', ...invDefaults },
];

export const seedLineItems: InvoiceLineItem[] = [
  { id: 'li1', invoice_id: 'i1', shift_id: 's1', description: 'Weekday shift - Greenfield Medical Center', service_date: addDays(today, -12).toISOString().split('T')[0], qty: 1, unit_rate: 850, line_total: 850 },
  { id: 'li2', invoice_id: 'i2', shift_id: 's3', description: 'Weekday shift - Evergreen Health Clinic', service_date: addDays(today, -8).toISOString().split('T')[0], qty: 1, unit_rate: 900, line_total: 900 },
  { id: 'li3', invoice_id: 'i2', shift_id: 's4', description: 'Weekend shift - Evergreen Health Clinic', service_date: addDays(today, -3).toISOString().split('T')[0], qty: 1, unit_rate: 1200, line_total: 1200 },
  { id: 'li4', invoice_id: 'i3', shift_id: 's2', description: 'Weekday shift - Greenfield Medical Center', service_date: addDays(today, -5).toISOString().split('T')[0], qty: 1, unit_rate: 850, line_total: 850 },
  { id: 'li5', invoice_id: 'i4', shift_id: null, description: 'Weekday shifts x2 - Mountain View Practice', service_date: null, qty: 2, unit_rate: 800, line_total: 1600 },
];

export const seedEmailLogs: EmailLog[] = [
  { id: 'e1', facility_id: 'c1', type: 'invoice', subject: 'Invoice INV-2026-001', body: 'Please find attached invoice for services rendered.', recipients: 'billing@greenfield.com', sent_at: fmt(addDays(today, -14)) },
  { id: 'e2', facility_id: 'c2', type: 'outreach_open', subject: 'Locum Availability - March 2026', body: 'I am available for locum shifts next month.', recipients: 'emily@evergreen-hc.com', sent_at: fmt(addDays(today, -30)) },
];

// === CONTRACTS seed data ===

export const seedContracts: Contract[] = [
  { id: 'con1', facility_id: 'c1', title: 'MSA 2026', status: 'active', effective_date: '2026-01-01', end_date: '2026-12-31', auto_renew: true, file_url: null, external_link_url: null, notes: 'Master service agreement for 2026' },
  { id: 'con2', facility_id: 'c1', title: 'MSA 2025', status: 'expired', effective_date: '2025-01-01', end_date: '2025-12-31', auto_renew: false, file_url: null, external_link_url: null, notes: 'Previous year agreement' },
  { id: 'con3', facility_id: 'c2', title: 'Locum Agreement 2026', status: 'active', effective_date: '2026-02-01', end_date: '2027-01-31', auto_renew: false, file_url: null, external_link_url: null, notes: '' },
  { id: 'con4', facility_id: 'c4', title: 'Service Contract Q1-Q2', status: 'draft', effective_date: '2026-03-01', end_date: '2026-06-30', auto_renew: false, file_url: null, external_link_url: null, notes: 'Pending review' },
];

export const seedContractTerms: ContractTerms[] = [
  { id: 'ct1', contract_id: 'con1', weekday_rate: 850, weekend_rate: 1100, holiday_rate: 1400, payment_terms_days: 14, cancellation_policy_text: '48-hour notice required.', overtime_policy_text: 'Time-and-a-half after 10 hours.', late_payment_policy_text: '1.5% monthly interest after 30 days.', invoicing_instructions_text: 'Submit invoices to billing@greenfield.com by the 15th.' },
  { id: 'ct2', contract_id: 'con3', weekday_rate: 900, weekend_rate: 1200, holiday_rate: 1500, payment_terms_days: 30, cancellation_policy_text: '72-hour notice.', overtime_policy_text: 'Flat rate, no overtime.', late_payment_policy_text: 'Net 30 terms.', invoicing_instructions_text: 'Email PDF invoice to accounts@evergreen-hc.com.' },
];

export const seedChecklistItems: ContractChecklistItem[] = [
  { id: 'cli1', facility_id: 'c1', type: 'w9', title: 'W-9', status: 'done', due_date: null, notes: 'Filed Jan 2026' },
  { id: 'cli2', facility_id: 'c1', type: 'coi', title: 'Certificate of Insurance (COI)', status: 'needed', due_date: fmt(addDays(today, 20)), notes: 'Renewal needed' },
  { id: 'cli3', facility_id: 'c1', type: 'direct_deposit', title: 'Direct Deposit Form', status: 'done', due_date: null, notes: '' },
  { id: 'cli4', facility_id: 'c1', type: 'credentialing', title: 'Credentialing Packet', status: 'in_progress', due_date: fmt(addDays(today, 10)), notes: 'Waiting on references' },
  { id: 'cli5', facility_id: 'c2', type: 'w9', title: 'W-9', status: 'done', due_date: null, notes: '' },
  { id: 'cli6', facility_id: 'c2', type: 'coi', title: 'Certificate of Insurance (COI)', status: 'needed', due_date: fmt(addDays(today, -5)), notes: 'Overdue!' },
  { id: 'cli7', facility_id: 'c2', type: 'direct_deposit', title: 'Direct Deposit Form', status: 'needed', due_date: fmt(addDays(today, 45)), notes: '' },
  { id: 'cli8', facility_id: 'c2', type: 'credentialing', title: 'Credentialing Packet', status: 'done', due_date: null, notes: '' },
  { id: 'cli9', facility_id: 'c4', type: 'w9', title: 'W-9', status: 'needed', due_date: fmt(addDays(today, 15)), notes: '' },
  { id: 'cli10', facility_id: 'c4', type: 'coi', title: 'Certificate of Insurance (COI)', status: 'needed', due_date: fmt(addDays(today, 15)), notes: '' },
];

// === EXPENSES seed data (demo mode) ===

export interface SeedExpense {
  id: string;
  user_id: string;
  expense_date: string;
  amount_cents: number;
  category: string;
  subcategory: string;
  description: string;
  facility_id: string | null;
  shift_id: string | null;
  receipt_url: string | null;
  deductible_amount_cents: number;
  deductibility_type: string;
  mileage_miles: number | null;
  home_office_sqft: number | null;
  prorate_percent: number | null;
  is_auto_mileage: boolean;
  mileage_status: string;
  route_description: string;
  created_at: string;
  updated_at: string;
}

const irsRate = 70; // cents per mile
const mile = (m: number) => Math.round(m * irsRate);

export const seedExpenses: SeedExpense[] = [
  // Draft mileage (pending review) — from recent shifts
  { id: 'exp-m1', user_id: 'demo-user', expense_date: addDays(today, -5).toISOString().split('T')[0], amount_cents: mile(44), category: 'travel', subcategory: 'mileage', description: 'Round-trip to Greenfield Medical Center', facility_id: 'c1', shift_id: 's2', receipt_url: null, deductible_amount_cents: mile(44), deductibility_type: 'full', mileage_miles: 44, home_office_sqft: null, prorate_percent: null, is_auto_mileage: true, mileage_status: 'draft', route_description: 'Home → Greenfield Medical Center → Home', created_at: fmt(addDays(today, -5)), updated_at: fmt(addDays(today, -5)) },
  { id: 'exp-m2', user_id: 'demo-user', expense_date: addDays(today, -3).toISOString().split('T')[0], amount_cents: mile(62), category: 'travel', subcategory: 'mileage', description: 'Round-trip to Evergreen Health Clinic', facility_id: 'c2', shift_id: 's4', receipt_url: null, deductible_amount_cents: mile(62), deductibility_type: 'full', mileage_miles: 62, home_office_sqft: null, prorate_percent: null, is_auto_mileage: true, mileage_status: 'draft', route_description: 'Home → Evergreen Health Clinic → Home', created_at: fmt(addDays(today, -3)), updated_at: fmt(addDays(today, -3)) },
  { id: 'exp-m3', user_id: 'demo-user', expense_date: addDays(today, -8).toISOString().split('T')[0], amount_cents: mile(62), category: 'travel', subcategory: 'mileage', description: 'Round-trip to Evergreen Health Clinic', facility_id: 'c2', shift_id: 's3', receipt_url: null, deductible_amount_cents: mile(62), deductibility_type: 'full', mileage_miles: 62, home_office_sqft: null, prorate_percent: null, is_auto_mileage: true, mileage_status: 'draft', route_description: 'Home → Evergreen Health Clinic → Home', created_at: fmt(addDays(today, -8)), updated_at: fmt(addDays(today, -8)) },

  // Confirmed mileage — older trips
  { id: 'exp-m4', user_id: 'demo-user', expense_date: addDays(today, -12).toISOString().split('T')[0], amount_cents: mile(44), category: 'travel', subcategory: 'mileage', description: 'Round-trip to Greenfield Medical Center', facility_id: 'c1', shift_id: 's1', receipt_url: null, deductible_amount_cents: mile(44), deductibility_type: 'full', mileage_miles: 44, home_office_sqft: null, prorate_percent: null, is_auto_mileage: true, mileage_status: 'confirmed', route_description: 'Home → Greenfield Medical Center → Home', created_at: fmt(addDays(today, -12)), updated_at: fmt(addDays(today, -11)) },
  { id: 'exp-m5', user_id: 'demo-user', expense_date: addDays(today, -20).toISOString().split('T')[0], amount_cents: mile(38), category: 'travel', subcategory: 'mileage', description: 'Round-trip to Mountain View Practice', facility_id: 'c4', shift_id: null, receipt_url: null, deductible_amount_cents: mile(38), deductibility_type: 'full', mileage_miles: 38, home_office_sqft: null, prorate_percent: null, is_auto_mileage: true, mileage_status: 'confirmed', route_description: 'Home → Mountain View Practice → Home', created_at: fmt(addDays(today, -20)), updated_at: fmt(addDays(today, -19)) },
  { id: 'exp-m6', user_id: 'demo-user', expense_date: addDays(today, -30).toISOString().split('T')[0], amount_cents: mile(62), category: 'travel', subcategory: 'mileage', description: 'Round-trip to Evergreen Health Clinic', facility_id: 'c2', shift_id: null, receipt_url: null, deductible_amount_cents: mile(62), deductibility_type: 'full', mileage_miles: 62, home_office_sqft: null, prorate_percent: null, is_auto_mileage: true, mileage_status: 'confirmed', route_description: 'Home → Evergreen Health Clinic → Home', created_at: fmt(addDays(today, -30)), updated_at: fmt(addDays(today, -29)) },

  // Regular expenses
  { id: 'exp-r1', user_id: 'demo-user', expense_date: addDays(today, -2).toISOString().split('T')[0], amount_cents: 4500, category: 'travel', subcategory: 'parking_tolls', description: 'Parking at Evergreen Health Clinic', facility_id: 'c2', shift_id: 's4', receipt_url: null, deductible_amount_cents: 4500, deductibility_type: 'full', mileage_miles: null, home_office_sqft: null, prorate_percent: null, is_auto_mileage: false, mileage_status: 'confirmed', route_description: '', created_at: fmt(addDays(today, -2)), updated_at: fmt(addDays(today, -2)) },
  { id: 'exp-r2', user_id: 'demo-user', expense_date: addDays(today, -7).toISOString().split('T')[0], amount_cents: 2850, category: 'travel', subcategory: 'meals_travel', description: 'Lunch during shift at Greenfield', facility_id: 'c1', shift_id: null, receipt_url: null, deductible_amount_cents: 1425, deductibility_type: 'half', mileage_miles: null, home_office_sqft: null, prorate_percent: null, is_auto_mileage: false, mileage_status: 'confirmed', route_description: '', created_at: fmt(addDays(today, -7)), updated_at: fmt(addDays(today, -7)) },
  { id: 'exp-r3', user_id: 'demo-user', expense_date: addDays(today, -15).toISOString().split('T')[0], amount_cents: 35000, category: 'professional_compliance', subcategory: 'license_renewal', description: 'Oregon veterinary license renewal', facility_id: null, shift_id: null, receipt_url: null, deductible_amount_cents: 35000, deductibility_type: 'full', mileage_miles: null, home_office_sqft: null, prorate_percent: null, is_auto_mileage: false, mileage_status: 'confirmed', route_description: '', created_at: fmt(addDays(today, -15)), updated_at: fmt(addDays(today, -15)) },
  { id: 'exp-r4', user_id: 'demo-user', expense_date: addDays(today, -22).toISOString().split('T')[0], amount_cents: 19900, category: 'ce', subcategory: 'ce_courses', description: 'AVMA CE webinar – Dental Radiology', facility_id: null, shift_id: null, receipt_url: null, deductible_amount_cents: 19900, deductibility_type: 'full', mileage_miles: null, home_office_sqft: null, prorate_percent: null, is_auto_mileage: false, mileage_status: 'confirmed', route_description: '', created_at: fmt(addDays(today, -22)), updated_at: fmt(addDays(today, -22)) },
  { id: 'exp-r5', user_id: 'demo-user', expense_date: addDays(today, -35).toISOString().split('T')[0], amount_cents: 8900, category: 'equipment', subcategory: 'stethoscope_instruments', description: 'Replacement stethoscope tubing', facility_id: null, shift_id: null, receipt_url: null, deductible_amount_cents: 8900, deductibility_type: 'full', mileage_miles: null, home_office_sqft: null, prorate_percent: null, is_auto_mileage: false, mileage_status: 'confirmed', route_description: '', created_at: fmt(addDays(today, -35)), updated_at: fmt(addDays(today, -35)) },
  { id: 'exp-r6', user_id: 'demo-user', expense_date: addDays(today, -40).toISOString().split('T')[0], amount_cents: 14999, category: 'technology', subcategory: 'software_subscriptions', description: 'Practice management app annual subscription', facility_id: null, shift_id: null, receipt_url: null, deductible_amount_cents: 14999, deductibility_type: 'full', mileage_miles: null, home_office_sqft: null, prorate_percent: null, is_auto_mileage: false, mileage_status: 'confirmed', route_description: '', created_at: fmt(addDays(today, -40)), updated_at: fmt(addDays(today, -40)) },
];

export const seedUserProfile: UserProfile = {
  id: 'demo-profile',
  user_id: 'demo-user',
  profession: 'vet',
  work_style_label: 'Independent contractor (1099)',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  currency: 'USD',
  current_tools: ['sheets_excel', 'calendar'],
  facilities_count_band: 'band_4_8',
  invoices_per_month_band: 'inv_4_10',
  invoice_due_default_days: 14,
  invoice_prefix: 'INV',
  email_tone: 'neutral',
  terms_fields_enabled: {
    weekday_rate: true, weekend_rate: true, cancellation_policy: true,
    overtime_policy: true, late_payment_policy: true, special_notes: true,
  },
  onboarding_completed_at: new Date().toISOString(),
  first_name: 'Dr. Jane',
  last_name: 'Smith',
  company_name: 'Smith Veterinary Services LLC',
  company_address: '100 Main St, Suite 200\nPortland, OR 97201',
  invoice_email: 'jane@smithvet.com',
  invoice_phone: '503-555-1234',
  home_address: '742 Evergreen Terrace\nPortland, OR 97201',
  completed_tours: [],
};
