/**
 * Reminder engine: pure functions for generating reminders from application state.
 * These functions can be used both client-side (for dashboard) and server-side (for scheduled jobs).
 */

import { computeInvoiceStatus } from '@/lib/businessLogic';
import { differenceInDays } from 'date-fns';
import type { Invoice, Facility } from '@/types';

export interface GeneratedReminder {
  module: string;
  reminder_type: string;
  title: string;
  body: string;
  link: string;
  urgency: number;
  related_entity_type?: string;
  related_entity_id?: string;
}

export function generateInvoiceReminders(
  invoices: Invoice[],
  getFacilityName: (id: string) => string
): GeneratedReminder[] {
  const items: GeneratedReminder[] = [];

  // Draft invoices not sent
  const drafts = invoices.filter(i => i.status === 'draft');
  if (drafts.length === 1) {
    const inv = drafts[0];
    items.push({
      module: 'invoices',
      reminder_type: 'invoice_draft_unsent',
      title: `Send invoice draft ${inv.invoice_number}`,
      body: `$${inv.total_amount.toLocaleString()} ready to bill · ${getFacilityName(inv.facility_id)}`,
      link: `/invoices/${inv.id}`,
      urgency: 2,
      related_entity_type: 'invoice',
      related_entity_id: inv.id,
    });
  } else if (drafts.length > 1) {
    items.push({
      module: 'invoices',
      reminder_type: 'invoice_draft_unsent',
      title: `You have ${drafts.length} invoice drafts ready to review and send`,
      body: `$${drafts.reduce((s, i) => s + i.total_amount, 0).toLocaleString()} total`,
      link: '/invoices',
      urgency: 2,
    });
  }

  // Overdue invoices
  invoices.filter(i => computeInvoiceStatus(i) === 'overdue').forEach(inv => {
    items.push({
      module: 'invoices',
      reminder_type: 'invoice_overdue',
      title: `Invoice ${inv.invoice_number} is overdue`,
      body: `$${inv.balance_due.toLocaleString()} is still outstanding · ${getFacilityName(inv.facility_id)}`,
      link: `/invoices/${inv.id}`,
      urgency: 1,
      related_entity_type: 'invoice',
      related_entity_id: inv.id,
    });
  });

  return items;
}

export function generateConfirmationReminders(
  needingActionCount: number,
  manualReviewCount = 0,
  needsUpdateCount = 0,
  missingContactCount = 0,
): GeneratedReminder[] {
  const items: GeneratedReminder[] = [];

  if (manualReviewCount > 0) {
    items.push({
      module: 'confirmations',
      reminder_type: 'confirmation_manual_review',
      title: `${manualReviewCount} confirmation${manualReviewCount > 1 ? 's' : ''} queued for manual review`,
      body: 'Review and send confirmations to clinic contacts',
      link: '/schedule',
      urgency: 3,
    });
  }

  if (needsUpdateCount > 0) {
    items.push({
      module: 'confirmations',
      reminder_type: 'confirmation_needs_update',
      title: `${needsUpdateCount} confirmation${needsUpdateCount > 1 ? 's' : ''} need${needsUpdateCount === 1 ? 's' : ''} update`,
      body: 'Schedule changed after confirmation was sent',
      link: '/schedule',
      urgency: 2,
    });
  }

  if (missingContactCount > 0) {
    items.push({
      module: 'confirmations',
      reminder_type: 'confirmation_missing_contact',
      title: `${missingContactCount} facilit${missingContactCount > 1 ? 'ies' : 'y'} missing scheduling contact`,
      body: 'Add a contact email to enable confirmations',
      link: '/schedule',
      urgency: 5,
    });
  }

  // Fallback: generic needing-action count (backward compat)
  if (items.length === 0 && needingActionCount > 0) {
    items.push({
      module: 'confirmations',
      reminder_type: 'confirmation_not_sent',
      title: `${needingActionCount} confirmation${needingActionCount > 1 ? 's' : ''} need action`,
      body: 'Review and send monthly shift confirmations',
      link: '/schedule',
      urgency: 4,
    });
  }

  return items;
}

export function generateOutreachReminders(
  facilities: Facility[],
  now: Date
): GeneratedReminder[] {
  const items: GeneratedReminder[] = [];
  facilities
    .filter(f => f.status === 'active' && f.outreach_last_sent_at)
    .forEach(f => {
      if (f.outreach_last_sent_at) {
        const daysSince = differenceInDays(now, new Date(f.outreach_last_sent_at));
        if (daysSince >= 7) {
          items.push({
            module: 'outreach',
            reminder_type: 'outreach_followup',
            title: `Follow up with ${f.name}`,
            body: `Last outreach was ${daysSince} days ago`,
            link: `/facilities/${f.id}`,
            urgency: 7,
            related_entity_type: 'facility',
            related_entity_id: f.id,
          });
        }
      }
    });
  return items;
}

export function generateCredentialReminders(
  credentials: Array<{ id: string; custom_title: string; expiration_date: string | null }>,
  now: Date,
  windowDays = 30
): GeneratedReminder[] {
  const items: GeneratedReminder[] = [];
  credentials.forEach(cred => {
    if (!cred.expiration_date) return;
    const daysUntil = differenceInDays(new Date(cred.expiration_date), now);
    if (daysUntil >= 0 && daysUntil <= windowDays) {
      items.push({
        module: 'credentials',
        reminder_type: 'credential_renewal_due',
        title: `${cred.custom_title} renewal due`,
        body: daysUntil === 0 ? 'Due today' : `Due in ${daysUntil} days`,
        link: '/credentials',
        urgency: daysUntil <= 7 ? 3 : 6,
        related_entity_type: 'credential',
        related_entity_id: cred.id,
      });
    }
  });
  return items;
}

export interface UninvoicedShiftGroup {
  facility_id: string;
  facility_name: string;
  shift_count: number;
  total_amount: number;
  oldest_shift_date: string;
}

/**
 * Detect shifts that ended >24h ago with no linked invoice line item.
 * Groups by facility and returns reminder items.
 */
export function generateUninvoicedShiftReminders(
  shifts: Array<{ id: string; facility_id: string; start_datetime: string; end_datetime: string; rate_applied: number }>,
  invoiceLineItems: Array<{ shift_id: string | null }>,
  getFacilityName: (id: string) => string,
  now: Date,
): GeneratedReminder[] {
  const invoicedShiftIds = new Set(
    invoiceLineItems.filter(li => li.shift_id).map(li => li.shift_id!)
  );

  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h ago

  const uninvoiced = shifts.filter(s => {
    const endDate = new Date(s.end_datetime);
    return endDate < cutoff && !invoicedShiftIds.has(s.id);
  });

  if (uninvoiced.length === 0) return [];

  // Group by facility
  const byFacility = new Map<string, typeof uninvoiced>();
  uninvoiced.forEach(s => {
    const arr = byFacility.get(s.facility_id) || [];
    arr.push(s);
    byFacility.set(s.facility_id, arr);
  });

  const items: GeneratedReminder[] = [];
  byFacility.forEach((facilityShifts, facilityId) => {
    const total = facilityShifts.reduce((sum, s) => sum + (s.rate_applied || 0), 0);
    const count = facilityShifts.length;
    const name = getFacilityName(facilityId);
    items.push({
      module: 'invoices',
      reminder_type: 'uninvoiced_shifts',
      title: `${count} uninvoiced shift${count > 1 ? 's' : ''} at ${name}`,
      body: `$${total.toLocaleString()} ready to invoice`,
      link: '/invoices',
      urgency: 2,
      related_entity_type: 'facility',
      related_entity_id: facilityId,
    });
  });

  return items;
}

/**
 * Detect shifts ending within a time window (for pre-shift-end reminders).
 * Returns shifts ending between `now` and `now + windowMinutes`.
 */
export function getShiftsEndingSoon(
  shifts: Array<{ id: string; facility_id: string; end_datetime: string; rate_applied: number }>,
  now: Date,
  windowMinutes = 65,
): Array<{ id: string; facility_id: string; end_datetime: string; rate_applied: number }> {
  const windowEnd = new Date(now.getTime() + windowMinutes * 60 * 1000);
  return shifts.filter(s => {
    const end = new Date(s.end_datetime);
    return end > now && end <= windowEnd;
  });
}

/** Check if a send_at time falls within quiet hours */
export function isInQuietHours(
  sendAt: Date,
  quietStart: string | null,
  quietEnd: string | null
): boolean {
  if (!quietStart || !quietEnd) return false;
  const [sh, sm] = quietStart.split(':').map(Number);
  const [eh, em] = quietEnd.split(':').map(Number);
  const h = sendAt.getHours();
  const m = sendAt.getMinutes();
  const sendMinutes = h * 60 + m;
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  if (startMinutes <= endMinutes) {
    return sendMinutes >= startMinutes && sendMinutes < endMinutes;
  }
  // Overnight range (e.g., 22:00 - 07:00)
  return sendMinutes >= startMinutes || sendMinutes < endMinutes;
}

/** Filter reminders based on user preferences */
export function filterByPreferences(
  reminders: GeneratedReminder[],
  categorySettings: Array<{ category: string; enabled: boolean; in_app_enabled: boolean }>,
): GeneratedReminder[] {
  return reminders.filter(r => {
    const setting = categorySettings.find(c => c.category === r.module);
    if (!setting) return true; // no setting = show by default
    return setting.enabled && setting.in_app_enabled;
  });
}
