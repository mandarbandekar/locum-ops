import { Clinic, ClinicContact, ContractSnapshot, Shift, Invoice, InvoiceLineItem, EmailLog } from '@/types';

const today = new Date();
const fmt = (d: Date) => d.toISOString();
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const setTime = (d: Date, h: number, m = 0) => { const r = new Date(d); r.setHours(h, m, 0, 0); return r; };

export const seedClinics: Clinic[] = [
  { id: 'c1', name: 'Pawsitive Care Veterinary', status: 'active', address: '123 Oak St, Portland, OR 97201', timezone: 'America/Los_Angeles', notes: 'Great team, flexible scheduling', outreach_last_sent_at: fmt(addDays(today, -15)) },
  { id: 'c2', name: 'Evergreen Animal Hospital', status: 'active', address: '456 Pine Ave, Seattle, WA 98101', timezone: 'America/Los_Angeles', notes: 'Busy ER clinic, weekend shifts common', outreach_last_sent_at: fmt(addDays(today, -30)) },
  { id: 'c3', name: 'Sunrise Pet Clinic', status: 'prospect', address: '789 Elm Dr, Boise, ID 83701', timezone: 'America/Boise', notes: 'Initial outreach sent, awaiting response', outreach_last_sent_at: null },
  { id: 'c4', name: 'Mountain View Vet', status: 'active', address: '321 Birch Ln, Denver, CO 80201', timezone: 'America/Denver', notes: 'Monthly regular shifts', outreach_last_sent_at: fmt(addDays(today, -10)) },
  { id: 'c5', name: 'Coastal Animal Care', status: 'paused', address: '555 Beach Blvd, San Diego, CA 92101', timezone: 'America/Los_Angeles', notes: 'Paused due to staffing changes', outreach_last_sent_at: fmt(addDays(today, -60)) },
];

export const seedContacts: ClinicContact[] = [
  { id: 'ct1', clinic_id: 'c1', name: 'Sarah Johnson', role: 'manager', email: 'sarah@pawsitive.com', phone: '503-555-0101', is_primary: true },
  { id: 'ct2', clinic_id: 'c1', name: 'Mike Chen', role: 'billing', email: 'billing@pawsitive.com', phone: '503-555-0102', is_primary: false },
  { id: 'ct3', clinic_id: 'c2', name: 'Dr. Emily Park', role: 'manager', email: 'emily@evergreen-ah.com', phone: '206-555-0201', is_primary: true },
  { id: 'ct4', clinic_id: 'c2', name: 'Lisa Wong', role: 'emergency', email: 'lisa@evergreen-ah.com', phone: '206-555-0202', is_primary: false },
  { id: 'ct5', clinic_id: 'c3', name: 'Tom Harris', role: 'manager', email: 'tom@sunrisepet.com', phone: '208-555-0301', is_primary: true },
  { id: 'ct6', clinic_id: 'c4', name: 'Rachel Kim', role: 'manager', email: 'rachel@mtviewvet.com', phone: '303-555-0401', is_primary: true },
  { id: 'ct7', clinic_id: 'c5', name: 'Dave Martinez', role: 'manager', email: 'dave@coastalac.com', phone: '619-555-0501', is_primary: true },
];

export const seedContracts: ContractSnapshot[] = [
  { id: 'cs1', clinic_id: 'c1', weekday_rate: 850, weekend_rate: 1100, cancellation_policy_text: '48-hour notice required for cancellation without penalty.', overtime_policy_text: 'Time-and-a-half after 10 hours.', late_payment_policy_text: '1.5% monthly interest on balances over 30 days.', special_notes: 'DEA license must be current.' },
  { id: 'cs2', clinic_id: 'c2', weekday_rate: 900, weekend_rate: 1200, cancellation_policy_text: '72-hour cancellation notice.', overtime_policy_text: 'Flat rate, no overtime.', late_payment_policy_text: 'Net 30 terms.', special_notes: 'ER experience required.' },
  { id: 'cs4', clinic_id: 'c4', weekday_rate: 800, weekend_rate: 1050, cancellation_policy_text: '24-hour notice.', overtime_policy_text: 'Standard overtime after 8 hours.', late_payment_policy_text: 'Net 14 terms.', special_notes: '' },
];

export const seedShifts: Shift[] = [
  // Past completed shifts
  { id: 's1', clinic_id: 'c1', start_datetime: fmt(setTime(addDays(today, -12), 8)), end_datetime: fmt(setTime(addDays(today, -12), 18)), status: 'completed', rate_applied: 850, notes: 'Regular day shift' },
  { id: 's2', clinic_id: 'c1', start_datetime: fmt(setTime(addDays(today, -5), 8)), end_datetime: fmt(setTime(addDays(today, -5), 18)), status: 'completed', rate_applied: 850, notes: '' },
  { id: 's3', clinic_id: 'c2', start_datetime: fmt(setTime(addDays(today, -8), 7)), end_datetime: fmt(setTime(addDays(today, -8), 19)), status: 'completed', rate_applied: 900, notes: 'ER coverage' },
  { id: 's4', clinic_id: 'c2', start_datetime: fmt(setTime(addDays(today, -3), 8)), end_datetime: fmt(setTime(addDays(today, -3), 16)), status: 'completed', rate_applied: 1200, notes: 'Weekend shift' },
  // Upcoming booked
  { id: 's5', clinic_id: 'c1', start_datetime: fmt(setTime(addDays(today, 2), 8)), end_datetime: fmt(setTime(addDays(today, 2), 18)), status: 'booked', rate_applied: 850, notes: '' },
  { id: 's6', clinic_id: 'c4', start_datetime: fmt(setTime(addDays(today, 3), 9)), end_datetime: fmt(setTime(addDays(today, 3), 17)), status: 'booked', rate_applied: 800, notes: '' },
  { id: 's7', clinic_id: 'c2', start_datetime: fmt(setTime(addDays(today, 5), 7)), end_datetime: fmt(setTime(addDays(today, 5), 19)), status: 'booked', rate_applied: 900, notes: 'Full day ER' },
  // Proposed
  { id: 's8', clinic_id: 'c4', start_datetime: fmt(setTime(addDays(today, 10), 9)), end_datetime: fmt(setTime(addDays(today, 10), 17)), status: 'proposed', rate_applied: 800, notes: 'Tentative' },
  { id: 's9', clinic_id: 'c1', start_datetime: fmt(setTime(addDays(today, 14), 8)), end_datetime: fmt(setTime(addDays(today, 14), 18)), status: 'proposed', rate_applied: 850, notes: '' },
];

export const seedInvoices: Invoice[] = [
  { id: 'i1', clinic_id: 'c1', invoice_number: 'INV-2026-001', period_start: fmt(addDays(today, -30)), period_end: fmt(addDays(today, -16)), total_amount: 850, status: 'paid', sent_at: fmt(addDays(today, -14)), paid_at: fmt(addDays(today, -7)), due_date: fmt(addDays(today, 0)) },
  { id: 'i2', clinic_id: 'c2', invoice_number: 'INV-2026-002', period_start: fmt(addDays(today, -15)), period_end: fmt(addDays(today, -1)), total_amount: 2100, status: 'sent', sent_at: fmt(addDays(today, -1)), paid_at: null, due_date: fmt(addDays(today, 13)) },
  { id: 'i3', clinic_id: 'c1', invoice_number: 'INV-2026-003', period_start: fmt(addDays(today, -14)), period_end: fmt(addDays(today, -1)), total_amount: 850, status: 'draft', sent_at: null, paid_at: null, due_date: null },
  { id: 'i4', clinic_id: 'c4', invoice_number: 'INV-2025-042', period_start: fmt(addDays(today, -60)), period_end: fmt(addDays(today, -46)), total_amount: 1600, status: 'sent', sent_at: fmt(addDays(today, -44)), paid_at: null, due_date: fmt(addDays(today, -30)) },
];

export const seedLineItems: InvoiceLineItem[] = [
  { id: 'li1', invoice_id: 'i1', shift_id: 's1', description: 'Weekday shift - Pawsitive Care', qty: 1, unit_rate: 850, line_total: 850 },
  { id: 'li2', invoice_id: 'i2', shift_id: 's3', description: 'Weekday shift - Evergreen Animal Hospital', qty: 1, unit_rate: 900, line_total: 900 },
  { id: 'li3', invoice_id: 'i2', shift_id: 's4', description: 'Weekend shift - Evergreen Animal Hospital', qty: 1, unit_rate: 1200, line_total: 1200 },
  { id: 'li4', invoice_id: 'i3', shift_id: 's2', description: 'Weekday shift - Pawsitive Care', qty: 1, unit_rate: 850, line_total: 850 },
  { id: 'li5', invoice_id: 'i4', shift_id: null, description: 'Weekday shifts x2 - Mountain View Vet', qty: 2, unit_rate: 800, line_total: 1600 },
];

export const seedEmailLogs: EmailLog[] = [
  { id: 'e1', clinic_id: 'c1', type: 'invoice', subject: 'Invoice INV-2026-001', body: 'Please find attached invoice for services rendered.', recipients: 'billing@pawsitive.com', sent_at: fmt(addDays(today, -14)) },
  { id: 'e2', clinic_id: 'c2', type: 'outreach_open', subject: 'Relief Vet Availability - March 2026', body: 'I am available for relief shifts next month.', recipients: 'emily@evergreen-ah.com', sent_at: fmt(addDays(today, -30)) },
];
