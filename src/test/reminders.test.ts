import { describe, it, expect } from 'vitest';
import {
  generateInvoiceReminders,
  generateConfirmationReminders,
  generateOutreachReminders,
  generateCredentialReminders,
  isInQuietHours,
  filterByPreferences,
} from '@/lib/reminderEngine';

const mockFacilityName = (id: string) => id === 'f1' ? 'Westside Clinic' : 'Unknown';

describe('Reminder Engine', () => {
  describe('generateInvoiceReminders', () => {
    it('creates reminder for single draft invoice', () => {
      const invoices = [{
        id: 'inv1', invoice_number: 'INV-001', status: 'draft',
        total_amount: 820, balance_due: 820, facility_id: 'f1',
        due_date: null, sent_at: null, paid_at: null,
      }] as any[];
      const result = generateInvoiceReminders(invoices, mockFacilityName);
      expect(result).toHaveLength(1);
      expect(result[0].reminder_type).toBe('invoice_draft_unsent');
      expect(result[0].title).toContain('INV-001');
    });

    it('creates grouped reminder for multiple drafts', () => {
      const invoices = [
        { id: 'inv1', invoice_number: 'INV-001', status: 'draft', total_amount: 400, balance_due: 400, facility_id: 'f1', due_date: null, sent_at: null, paid_at: null },
        { id: 'inv2', invoice_number: 'INV-002', status: 'draft', total_amount: 600, balance_due: 600, facility_id: 'f1', due_date: null, sent_at: null, paid_at: null },
      ] as any[];
      const result = generateInvoiceReminders(invoices, mockFacilityName);
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('2 invoice drafts');
    });

    it('creates reminder for overdue invoice', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const invoices = [{
        id: 'inv1', invoice_number: 'INV-042', status: 'sent',
        total_amount: 820, balance_due: 820, facility_id: 'f1',
        due_date: pastDate.toISOString(), sent_at: pastDate.toISOString(), paid_at: null,
      }] as any[];
      const result = generateInvoiceReminders(invoices, mockFacilityName);
      expect(result.some(r => r.reminder_type === 'invoice_overdue')).toBe(true);
    });
  });

  describe('generateConfirmationReminders', () => {
    it('creates manual review reminder when queued', () => {
      const result = generateConfirmationReminders(0, 3, 0, 0);
      expect(result).toHaveLength(1);
      expect(result[0].reminder_type).toBe('confirmation_manual_review');
      expect(result[0].title).toContain('3 confirmations');
    });

    it('creates needs_update reminder', () => {
      const result = generateConfirmationReminders(0, 0, 2, 0);
      expect(result).toHaveLength(1);
      expect(result[0].reminder_type).toBe('confirmation_needs_update');
    });

    it('creates missing contact reminder', () => {
      const result = generateConfirmationReminders(0, 0, 0, 1);
      expect(result).toHaveLength(1);
      expect(result[0].reminder_type).toBe('confirmation_missing_contact');
    });

    it('falls back to generic when no breakdown provided', () => {
      const result = generateConfirmationReminders(3);
      expect(result).toHaveLength(1);
      expect(result[0].reminder_type).toBe('confirmation_not_sent');
      expect(result[0].title).toContain('3 confirmations');
    });

    it('returns empty when no action needed', () => {
      expect(generateConfirmationReminders(0)).toHaveLength(0);
    });
  });

  describe('generateCredentialReminders', () => {
    it('triggers for credential due within window', () => {
      const now = new Date();
      const dueIn15 = new Date(now);
      dueIn15.setDate(dueIn15.getDate() + 15);
      const creds = [{ id: 'c1', custom_title: 'CA License', expiration_date: dueIn15.toISOString().split('T')[0] }];
      const result = generateCredentialReminders(creds, now, 30);
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('CA License');
    });

    it('does not trigger for credential far in future', () => {
      const now = new Date();
      const dueIn90 = new Date(now);
      dueIn90.setDate(dueIn90.getDate() + 90);
      const creds = [{ id: 'c1', custom_title: 'CA License', expiration_date: dueIn90.toISOString().split('T')[0] }];
      const result = generateCredentialReminders(creds, now, 30);
      expect(result).toHaveLength(0);
    });
  });

  describe('generateOutreachReminders', () => {
    it('triggers for active facility with overdue outreach', () => {
      const now = new Date();
      const tenDaysAgo = new Date(now);
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      const facilities = [{
        id: 'f1', name: 'Riverfront Animal Hospital',
        status: 'active' as const, outreach_last_sent_at: tenDaysAgo.toISOString(),
      }] as any[];
      const result = generateOutreachReminders(facilities, now);
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('Riverfront');
    });
  });

  describe('isInQuietHours', () => {
    it('detects time within overnight quiet hours', () => {
      const lateNight = new Date('2026-03-13T23:30:00');
      expect(isInQuietHours(lateNight, '22:00', '07:00')).toBe(true);
    });

    it('detects time outside quiet hours', () => {
      const midday = new Date('2026-03-13T12:00:00');
      expect(isInQuietHours(midday, '22:00', '07:00')).toBe(false);
    });

    it('returns false when no quiet hours set', () => {
      expect(isInQuietHours(new Date(), null, null)).toBe(false);
    });
  });

  describe('filterByPreferences', () => {
    it('filters out disabled categories', () => {
      const reminders = [
        { module: 'invoices', reminder_type: 'test', title: 'T', body: 'B', link: '/', urgency: 1 },
        { module: 'confirmations', reminder_type: 'test', title: 'T', body: 'B', link: '/', urgency: 1 },
      ];
      const settings = [
        { category: 'invoices', enabled: true, in_app_enabled: true },
        { category: 'confirmations', enabled: false, in_app_enabled: true },
      ];
      const result = filterByPreferences(reminders, settings);
      expect(result).toHaveLength(1);
      expect(result[0].module).toBe('invoices');
    });

    it('filters out categories with in_app disabled', () => {
      const reminders = [
        { module: 'invoices', reminder_type: 'test', title: 'T', body: 'B', link: '/', urgency: 1 },
      ];
      const settings = [
        { category: 'invoices', enabled: true, in_app_enabled: false },
      ];
      expect(filterByPreferences(reminders, settings)).toHaveLength(0);
    });
  });
});
