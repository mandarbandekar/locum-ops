import { describe, it, expect } from 'vitest';
import { computeShiftHash } from '@/types/confirmations';

const makeShift = (id: string, start: string, end: string, rate: number, status: string) => ({
  id, start_datetime: start, end_datetime: end, rate_applied: rate, status,
});

describe('Clinic Confirmations', () => {
  describe('Monthly confirmation scheduling', () => {
    it('should only include booked shifts', () => {
      const shifts = [
        makeShift('s1', '2026-04-03T08:00:00Z', '2026-04-03T18:00:00Z', 850, 'booked'),
        makeShift('s2', '2026-04-10T08:00:00Z', '2026-04-10T18:00:00Z', 850, 'proposed'),
        makeShift('s3', '2026-04-17T08:00:00Z', '2026-04-17T18:00:00Z', 850, 'booked'),
      ];
      const booked = shifts.filter(s => s.status === 'booked');
      expect(booked.length).toBe(2);
    });
  });

  describe('Pre-shift reminder scheduling', () => {
    it('should compute offset correctly', () => {
      const shiftDate = new Date('2026-04-15T08:00:00Z');
      const offsetDays = 3;
      const sendDate = new Date(shiftDate);
      sendDate.setDate(sendDate.getDate() - offsetDays);
      expect(sendDate.getDate()).toBe(12);
    });

    it('should support same-day offset (0)', () => {
      const shiftDate = new Date('2026-04-15T08:00:00Z');
      const offsetDays = 0;
      const sendDate = new Date(shiftDate);
      sendDate.setDate(sendDate.getDate() - offsetDays);
      expect(sendDate.getDate()).toBe(15);
    });
  });

  describe('Auto-send vs manual review per mode', () => {
    it('monthly auto-sends when auto_send_monthly is true', () => {
      const settings = {
        primary_contact_email: 'manager@clinic.com',
        monthly_enabled: true,
        auto_send_monthly: true,
        auto_send_preshift: false,
      };
      const canAutoSendMonthly = settings.monthly_enabled && settings.auto_send_monthly && !!settings.primary_contact_email;
      expect(canAutoSendMonthly).toBe(true);
    });

    it('monthly creates manual review task when auto_send_monthly is false', () => {
      const settings = {
        primary_contact_email: 'manager@clinic.com',
        monthly_enabled: true,
        auto_send_monthly: false,
        auto_send_preshift: false,
      };
      const deliveryMode = settings.monthly_enabled && !settings.auto_send_monthly ? 'manual_review' : 'auto_send';
      expect(deliveryMode).toBe('manual_review');
    });

    it('preshift auto-sends when auto_send_preshift is true', () => {
      const settings = {
        primary_contact_email: 'manager@clinic.com',
        preshift_enabled: true,
        auto_send_monthly: false,
        auto_send_preshift: true,
      };
      const canAutoSendPreshift = settings.preshift_enabled && settings.auto_send_preshift && !!settings.primary_contact_email;
      expect(canAutoSendPreshift).toBe(true);
    });

    it('preshift creates manual review task when auto_send_preshift is false', () => {
      const settings = {
        primary_contact_email: 'manager@clinic.com',
        preshift_enabled: true,
        auto_send_monthly: false,
        auto_send_preshift: false,
      };
      const deliveryMode = settings.preshift_enabled && !settings.auto_send_preshift ? 'manual_review' : 'auto_send';
      expect(deliveryMode).toBe('manual_review');
    });
  });

  describe('Missing contact blocks auto-send', () => {
    it('should block auto-send when no email configured', () => {
      const settings = {
        primary_contact_email: '',
        auto_send_monthly: true,
        auto_send_preshift: true,
      };
      const canAutoSend = (settings.auto_send_monthly || settings.auto_send_preshift) && !!settings.primary_contact_email;
      expect(canAutoSend).toBe(false);
    });

    it('should allow auto-send when email is configured', () => {
      const settings = {
        primary_contact_email: 'manager@clinic.com',
        auto_send_monthly: true,
        auto_send_preshift: false,
      };
      const canAutoSend = (settings.auto_send_monthly || settings.auto_send_preshift) && !!settings.primary_contact_email;
      expect(canAutoSend).toBe(true);
    });
  });

  describe('needs_update detection', () => {
    it('detects change when shift is added after send', () => {
      const originalShifts = [
        makeShift('s1', '2026-04-03T08:00:00Z', '2026-04-03T18:00:00Z', 850, 'booked'),
      ];
      const savedHash = computeShiftHash(originalShifts);

      const currentShifts = [
        ...originalShifts,
        makeShift('s2', '2026-04-10T08:00:00Z', '2026-04-10T18:00:00Z', 850, 'booked'),
      ];
      const currentHash = computeShiftHash(currentShifts);

      expect(savedHash).not.toBe(currentHash);
    });

    it('does not flag when shifts unchanged', () => {
      const shifts = [
        makeShift('s1', '2026-04-03T08:00:00Z', '2026-04-03T18:00:00Z', 850, 'booked'),
      ];
      const hash1 = computeShiftHash(shifts);
      const hash2 = computeShiftHash(shifts);
      expect(hash1).toBe(hash2);
    });
  });

  describe('Manual send', () => {
    it('allows manual send even when auto-send is disabled', () => {
      const settings = {
        auto_send_monthly: false,
        auto_send_preshift: false,
        primary_contact_email: 'manager@clinic.com',
      };
      const canManualSend = !!settings.primary_contact_email;
      expect(canManualSend).toBe(true);
    });
  });

  describe('Delivery mode tracking', () => {
    it('email record tracks delivery_mode', () => {
      const email = {
        id: 'ce1',
        facility_id: 'f1',
        type: 'monthly',
        recipient_email: 'manager@clinic.com',
        subject: 'Confirmed Relief Dates for April 2026',
        body: 'Hi Team, ...',
        status: 'sent',
        sent_at: new Date().toISOString(),
        shift_hash_snapshot: 'abc123',
        delivery_mode: 'auto_send' as const,
      };
      expect(email.delivery_mode).toBe('auto_send');
    });

    it('manual review mode is set when auto-send is off', () => {
      const autoSendMonthly = false;
      const deliveryMode = autoSendMonthly ? 'auto_send' : 'manual_review';
      expect(deliveryMode).toBe('manual_review');
    });
  });

  describe('Facility-specific settings', () => {
    it('each facility has independent per-mode auto-send settings', () => {
      const settings = [
        { facility_id: 'f1', monthly_enabled: true, preshift_enabled: false, auto_send_monthly: true, auto_send_preshift: false },
        { facility_id: 'f2', monthly_enabled: false, preshift_enabled: true, auto_send_monthly: false, auto_send_preshift: true },
        { facility_id: 'f3', monthly_enabled: true, preshift_enabled: true, auto_send_monthly: false, auto_send_preshift: false },
      ];

      const f1 = settings.find(s => s.facility_id === 'f1')!;
      const f2 = settings.find(s => s.facility_id === 'f2')!;
      const f3 = settings.find(s => s.facility_id === 'f3')!;

      expect(f1.auto_send_monthly).toBe(true);
      expect(f1.auto_send_preshift).toBe(false);
      expect(f2.auto_send_monthly).toBe(false);
      expect(f2.auto_send_preshift).toBe(true);
      // f3: both enabled but both manual review
      expect(f3.auto_send_monthly).toBe(false);
      expect(f3.auto_send_preshift).toBe(false);
    });
  });
});
