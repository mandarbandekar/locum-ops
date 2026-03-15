import { Facility, FacilityContact, TermsSnapshot, Shift, Invoice, InvoiceLineItem, EmailLog } from '@/types';
import type { UserProfile } from '@/contexts/UserProfileContext';
import { Contract, ContractTerms, ContractChecklistItem } from '@/types/contracts';

const today = new Date();
const fmt = (d: Date) => d.toISOString();
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const setTime = (d: Date, h: number, m = 0) => { const r = new Date(d); r.setHours(h, m, 0, 0); return r; };

// === STARTER data (one example facility for new sign-ups) ===

export const starterFacilities: Facility[] = [
  { id: 'c1', name: 'Greenfield Medical Center', status: 'active', address: '123 Oak St, Portland, OR 97201', timezone: 'America/Los_Angeles', notes: 'Example facility — edit or delete this anytime', outreach_last_sent_at: null, tech_computer_info: '', tech_wifi_info: '', tech_pims_info: '', clinic_access_info: '', invoice_prefix: 'GMC', invoice_due_days: 15, invoice_email_to: '', invoice_email_cc: '', invoice_email_bcc: '' },
];

export const starterContacts: FacilityContact[] = [
  { id: 'ct1', facility_id: 'c1', name: 'Sarah Johnson', role: 'practice_manager', email: 'sarah@greenfield.com', phone: '503-555-0101', is_primary: true },
];

export const starterTerms: TermsSnapshot[] = [
  { id: 'cs1', facility_id: 'c1', weekday_rate: 850, weekend_rate: 1100, partial_day_rate: 500, holiday_rate: 1400, telemedicine_rate: 600, cancellation_policy_text: '48-hour notice required for cancellation without penalty.', overtime_policy_text: 'Time-and-a-half after 10 hours.', late_payment_policy_text: '1.5% monthly interest on balances over 30 days.', special_notes: 'Current credentials required.' },
];

export const starterShifts: Shift[] = [
  { id: 's5', facility_id: 'c1', start_datetime: fmt(setTime(addDays(today, 2), 8)), end_datetime: fmt(setTime(addDays(today, 2), 18)), status: 'booked', rate_applied: 850, notes: 'Example shift', color: 'blue' },
];

export const starterInvoices: Invoice[] = [];
export const starterLineItems: InvoiceLineItem[] = [];
export const starterEmailLogs: EmailLog[] = [];

// === DEMO data (full set for demo mode) ===

export const seedFacilities: Facility[] = [
  { id: 'c1', name: 'Greenfield Medical Center', status: 'active', address: '123 Oak St, Portland, OR 97201', timezone: 'America/Los_Angeles', notes: 'Great team, flexible scheduling', outreach_last_sent_at: fmt(addDays(today, -15)), tech_computer_info: 'Desktop login: locum1 / pass: Gr33nfield!', tech_wifi_info: 'Network: GFC-Staff, Password: wellness2026', tech_pims_info: 'Cornerstone — user: locum.vet / pass: temp1234', clinic_access_info: 'Front door code: 4521. Park in lot B. Keys at reception.', invoice_prefix: 'GMC', invoice_due_days: 14 },
  { id: 'c2', name: 'Evergreen Health Clinic', status: 'active', address: '456 Pine Ave, Seattle, WA 98101', timezone: 'America/Los_Angeles', notes: 'Busy facility, weekend shifts common', outreach_last_sent_at: fmt(addDays(today, -30)), tech_computer_info: '', tech_wifi_info: 'EHC-Guest / evergreen99', tech_pims_info: 'eVetPractice — ask front desk for temp login', clinic_access_info: 'Ring buzzer at side entrance. After hours use code 7890.', invoice_prefix: 'EHC', invoice_due_days: 30 },
  { id: 'c3', name: 'Sunrise Care Center', status: 'prospect', address: '789 Elm Dr, Boise, ID 83701', timezone: 'America/Boise', notes: 'Initial outreach sent, awaiting response', outreach_last_sent_at: null, tech_computer_info: '', tech_wifi_info: '', tech_pims_info: '', clinic_access_info: '', invoice_prefix: 'SCC', invoice_due_days: 15 },
  { id: 'c4', name: 'Mountain View Practice', status: 'active', address: '321 Birch Ln, Denver, CO 80201', timezone: 'America/Denver', notes: 'Monthly regular shifts', outreach_last_sent_at: fmt(addDays(today, -10)), tech_computer_info: 'Shared laptop in break room', tech_wifi_info: 'MVP-Clinic / mountain2026', tech_pims_info: 'Avimark — locum account pre-configured', clinic_access_info: 'Main entrance unlocked 7am–7pm. After hours call Rachel.', invoice_prefix: 'MVP', invoice_due_days: 14 },
  { id: 'c5', name: 'Coastal Wellness Group', status: 'paused', address: '555 Beach Blvd, San Diego, CA 92101', timezone: 'America/Los_Angeles', notes: 'Paused due to staffing changes', outreach_last_sent_at: fmt(addDays(today, -60)), tech_computer_info: '', tech_wifi_info: '', tech_pims_info: '', clinic_access_info: '', invoice_prefix: 'CWG', invoice_due_days: 15 },
];

export const seedContacts: FacilityContact[] = [
  { id: 'ct1', facility_id: 'c1', name: 'Sarah Johnson', role: 'practice_manager', email: 'sarah@greenfield.com', phone: '503-555-0101', is_primary: true },
  { id: 'ct3', facility_id: 'c2', name: 'Dr. Emily Park', role: 'practice_manager', email: 'emily@evergreen-hc.com', phone: '206-555-0201', is_primary: true },
  { id: 'ct5', facility_id: 'c3', name: 'Tom Harris', role: 'practice_manager', email: 'tom@sunrisecare.com', phone: '208-555-0301', is_primary: true },
  { id: 'ct6', facility_id: 'c4', name: 'Rachel Kim', role: 'practice_manager', email: 'rachel@mtviewpractice.com', phone: '303-555-0401', is_primary: true },
  { id: 'ct7', facility_id: 'c5', name: 'Dave Martinez', role: 'practice_manager', email: 'dave@coastalwg.com', phone: '619-555-0501', is_primary: true },
];

export const seedTerms: TermsSnapshot[] = [
  { id: 'cs1', facility_id: 'c1', weekday_rate: 850, weekend_rate: 1100, partial_day_rate: 500, holiday_rate: 1400, telemedicine_rate: 600, cancellation_policy_text: '48-hour notice required for cancellation without penalty.', overtime_policy_text: 'Time-and-a-half after 10 hours.', late_payment_policy_text: '1.5% monthly interest on balances over 30 days.', special_notes: 'Current credentials required.' },
  { id: 'cs2', facility_id: 'c2', weekday_rate: 900, weekend_rate: 1200, partial_day_rate: 550, holiday_rate: 1500, telemedicine_rate: 650, cancellation_policy_text: '72-hour cancellation notice.', overtime_policy_text: 'Flat rate, no overtime.', late_payment_policy_text: 'Net 30 terms.', special_notes: 'Prior experience preferred.' },
  { id: 'cs4', facility_id: 'c4', weekday_rate: 800, weekend_rate: 1050, partial_day_rate: 450, holiday_rate: 1300, telemedicine_rate: 0, cancellation_policy_text: '24-hour notice.', overtime_policy_text: 'Standard overtime after 8 hours.', late_payment_policy_text: 'Net 14 terms.', special_notes: '' },
];

// Next month shifts for confirmations demo
const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
const nmDay = (d: number) => new Date(nextMonth.getFullYear(), nextMonth.getMonth(), d);

export const seedShifts: Shift[] = [
  { id: 's1', facility_id: 'c1', start_datetime: fmt(setTime(addDays(today, -12), 8)), end_datetime: fmt(setTime(addDays(today, -12), 18)), status: 'completed', rate_applied: 850, notes: 'Regular day shift', color: 'blue' },
  { id: 's2', facility_id: 'c1', start_datetime: fmt(setTime(addDays(today, -5), 8)), end_datetime: fmt(setTime(addDays(today, -5), 18)), status: 'completed', rate_applied: 850, notes: '', color: 'blue' },
  { id: 's3', facility_id: 'c2', start_datetime: fmt(setTime(addDays(today, -8), 7)), end_datetime: fmt(setTime(addDays(today, -8), 19)), status: 'completed', rate_applied: 900, notes: 'Extended coverage', color: 'green' },
  { id: 's4', facility_id: 'c2', start_datetime: fmt(setTime(addDays(today, -3), 8)), end_datetime: fmt(setTime(addDays(today, -3), 16)), status: 'completed', rate_applied: 1200, notes: 'Weekend shift', color: 'orange' },
  { id: 's5', facility_id: 'c1', start_datetime: fmt(setTime(addDays(today, 2), 8)), end_datetime: fmt(setTime(addDays(today, 2), 18)), status: 'booked', rate_applied: 850, notes: '', color: 'blue' },
  { id: 's6', facility_id: 'c4', start_datetime: fmt(setTime(addDays(today, 3), 9)), end_datetime: fmt(setTime(addDays(today, 3), 17)), status: 'booked', rate_applied: 800, notes: '', color: 'purple' },
  { id: 's7', facility_id: 'c2', start_datetime: fmt(setTime(addDays(today, 5), 7)), end_datetime: fmt(setTime(addDays(today, 5), 19)), status: 'booked', rate_applied: 900, notes: 'Full day coverage', color: 'green' },
  { id: 's8', facility_id: 'c4', start_datetime: fmt(setTime(addDays(today, 10), 9)), end_datetime: fmt(setTime(addDays(today, 10), 17)), status: 'proposed', rate_applied: 800, notes: 'Tentative', color: 'purple' },
  { id: 's9', facility_id: 'c1', start_datetime: fmt(setTime(addDays(today, 14), 8)), end_datetime: fmt(setTime(addDays(today, 14), 18)), status: 'proposed', rate_applied: 850, notes: '', color: 'teal' },
  // Next month booked shifts for confirmations
  { id: 'snm1', facility_id: 'c1', start_datetime: fmt(setTime(nmDay(3), 8)), end_datetime: fmt(setTime(nmDay(3), 18)), status: 'booked', rate_applied: 850, notes: '', color: 'blue' },
  { id: 'snm2', facility_id: 'c1', start_datetime: fmt(setTime(nmDay(10), 8)), end_datetime: fmt(setTime(nmDay(10), 18)), status: 'booked', rate_applied: 850, notes: '', color: 'blue' },
  { id: 'snm3', facility_id: 'c1', start_datetime: fmt(setTime(nmDay(17), 8)), end_datetime: fmt(setTime(nmDay(17), 18)), status: 'booked', rate_applied: 850, notes: '', color: 'blue' },
  { id: 'snm4', facility_id: 'c2', start_datetime: fmt(setTime(nmDay(5), 7)), end_datetime: fmt(setTime(nmDay(5), 19)), status: 'booked', rate_applied: 900, notes: '', color: 'green' },
  { id: 'snm5', facility_id: 'c2', start_datetime: fmt(setTime(nmDay(12), 7)), end_datetime: fmt(setTime(nmDay(12), 19)), status: 'booked', rate_applied: 900, notes: '', color: 'green' },
  { id: 'snm6', facility_id: 'c4', start_datetime: fmt(setTime(nmDay(8), 9)), end_datetime: fmt(setTime(nmDay(8), 17)), status: 'booked', rate_applied: 800, notes: '', color: 'purple' },
  { id: 'snm7', facility_id: 'c4', start_datetime: fmt(setTime(nmDay(15), 9)), end_datetime: fmt(setTime(nmDay(15), 17)), status: 'booked', rate_applied: 800, notes: '', color: 'purple' },
  { id: 'snm8', facility_id: 'c4', start_datetime: fmt(setTime(nmDay(22), 9)), end_datetime: fmt(setTime(nmDay(22), 17)), status: 'booked', rate_applied: 800, notes: '', color: 'purple' },
];

export const seedInvoices: Invoice[] = [
  { id: 'i1', facility_id: 'c1', invoice_number: 'GMC-2026-001', invoice_date: fmt(addDays(today, -15)), period_start: fmt(addDays(today, -30)), period_end: fmt(addDays(today, -16)), total_amount: 850, balance_due: 0, status: 'paid', sent_at: fmt(addDays(today, -14)), paid_at: fmt(addDays(today, -7)), due_date: fmt(addDays(today, 0)), notes: '', share_token: null, share_token_created_at: null, share_token_revoked_at: null, invoice_type: 'single' },
  { id: 'i2', facility_id: 'c2', invoice_number: 'EHC-2026-001', invoice_date: fmt(addDays(today, -2)), period_start: fmt(addDays(today, -15)), period_end: fmt(addDays(today, -1)), total_amount: 2100, balance_due: 2100, status: 'sent', sent_at: fmt(addDays(today, -1)), paid_at: null, due_date: fmt(addDays(today, 13)), notes: '', share_token: null, share_token_created_at: null, share_token_revoked_at: null, invoice_type: 'bulk' },
  { id: 'i3', facility_id: 'c1', invoice_number: 'GMC-2026-002', invoice_date: fmt(today), period_start: fmt(addDays(today, -14)), period_end: fmt(addDays(today, -1)), total_amount: 850, balance_due: 850, status: 'draft', sent_at: null, paid_at: null, due_date: null, notes: '', share_token: null, share_token_created_at: null, share_token_revoked_at: null, invoice_type: 'single' },
  { id: 'i4', facility_id: 'c4', invoice_number: 'MVP-2025-042', invoice_date: fmt(addDays(today, -45)), period_start: fmt(addDays(today, -60)), period_end: fmt(addDays(today, -46)), total_amount: 1600, balance_due: 1600, status: 'sent', sent_at: fmt(addDays(today, -44)), paid_at: null, due_date: fmt(addDays(today, -30)), notes: '', share_token: null, share_token_created_at: null, share_token_revoked_at: null, invoice_type: 'single' },
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
};
