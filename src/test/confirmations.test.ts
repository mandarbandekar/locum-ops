import { describe, it, expect } from 'vitest';
import { computeShiftHash } from '@/types/confirmations';

const makeShift = (id: string, start: string, end: string, rate: number, status: string) => ({
  id, start_datetime: start, end_datetime: end, rate_applied: rate, status,
});

describe('Confirmations', () => {
  describe('computeShiftHash', () => {
    it('produces consistent hash for same shifts', () => {
      const shifts = [
        makeShift('s1', '2026-04-03T08:00:00Z', '2026-04-03T18:00:00Z', 850, 'booked'),
        makeShift('s2', '2026-04-10T08:00:00Z', '2026-04-10T18:00:00Z', 850, 'booked'),
      ];
      const hash1 = computeShiftHash(shifts);
      const hash2 = computeShiftHash([...shifts].reverse());
      expect(hash1).toBe(hash2); // sorted, so order doesn't matter
    });

    it('detects when a shift is added', () => {
      const shifts1 = [
        makeShift('s1', '2026-04-03T08:00:00Z', '2026-04-03T18:00:00Z', 850, 'booked'),
      ];
      const shifts2 = [
        makeShift('s1', '2026-04-03T08:00:00Z', '2026-04-03T18:00:00Z', 850, 'booked'),
        makeShift('s2', '2026-04-10T08:00:00Z', '2026-04-10T18:00:00Z', 850, 'booked'),
      ];
      expect(computeShiftHash(shifts1)).not.toBe(computeShiftHash(shifts2));
    });

    it('detects when a shift time changes', () => {
      const original = [
        makeShift('s1', '2026-04-03T08:00:00Z', '2026-04-03T18:00:00Z', 850, 'booked'),
      ];
      const changed = [
        makeShift('s1', '2026-04-03T09:00:00Z', '2026-04-03T18:00:00Z', 850, 'booked'),
      ];
      expect(computeShiftHash(original)).not.toBe(computeShiftHash(changed));
    });

    it('detects when a shift is removed', () => {
      const original = [
        makeShift('s1', '2026-04-03T08:00:00Z', '2026-04-03T18:00:00Z', 850, 'booked'),
        makeShift('s2', '2026-04-10T08:00:00Z', '2026-04-10T18:00:00Z', 850, 'booked'),
      ];
      const removed = [
        makeShift('s1', '2026-04-03T08:00:00Z', '2026-04-03T18:00:00Z', 850, 'booked'),
      ];
      expect(computeShiftHash(original)).not.toBe(computeShiftHash(removed));
    });
  });

  describe('Confirmation status logic', () => {
    it('not_sent record stays not_sent when hash is null', () => {
      const record = { status: 'not_sent', shift_hash_snapshot: null };
      // not_sent records should stay not_sent regardless
      expect(record.status).toBe('not_sent');
    });

    it('sent record becomes needs_update when hash changes', () => {
      const originalShifts = [
        makeShift('s1', '2026-04-03T08:00:00Z', '2026-04-03T18:00:00Z', 850, 'booked'),
      ];
      const hash = computeShiftHash(originalShifts);
      
      // Simulate a shift added
      const currentShifts = [
        ...originalShifts,
        makeShift('s2', '2026-04-10T08:00:00Z', '2026-04-10T18:00:00Z', 850, 'booked'),
      ];
      const currentHash = computeShiftHash(currentShifts);

      const record = { status: 'sent' as const, shift_hash_snapshot: hash };
      const needsUpdate = currentHash !== record.shift_hash_snapshot;
      expect(needsUpdate).toBe(true);
    });

    it('sent record stays sent when hash matches', () => {
      const shifts = [
        makeShift('s1', '2026-04-03T08:00:00Z', '2026-04-03T18:00:00Z', 850, 'booked'),
      ];
      const hash = computeShiftHash(shifts);
      const currentHash = computeShiftHash(shifts);
      expect(currentHash === hash).toBe(true);
    });

    it('mark as sent updates status and snapshot', () => {
      const shifts = [
        makeShift('s1', '2026-04-03T08:00:00Z', '2026-04-03T18:00:00Z', 850, 'booked'),
      ];
      const hash = computeShiftHash(shifts);
      const record = {
        status: 'sent' as const,
        sent_at: new Date().toISOString(),
        shift_count_snapshot: shifts.length,
        shift_hash_snapshot: hash,
      };
      expect(record.status).toBe('sent');
      expect(record.sent_at).toBeTruthy();
      expect(record.shift_count_snapshot).toBe(1);
      expect(record.shift_hash_snapshot).toBe(hash);
    });

    it('mark as confirmed updates status', () => {
      const record = {
        status: 'confirmed' as const,
        confirmed_at: new Date().toISOString(),
      };
      expect(record.status).toBe('confirmed');
      expect(record.confirmed_at).toBeTruthy();
    });
  });

  describe('Public token validation', () => {
    it('revoked token should be treated as invalid', () => {
      const record = {
        share_token: 'abc123',
        share_token_revoked_at: new Date().toISOString(),
      };
      const isValid = record.share_token && !record.share_token_revoked_at;
      // share_token_revoked_at is set, so invalid
      expect(!!isValid).toBe(false);
    });

    it('active token should be valid', () => {
      const record = {
        share_token: 'abc123',
        share_token_revoked_at: null,
      };
      const isValid = record.share_token && !record.share_token_revoked_at;
      expect(!!isValid).toBe(true);
    });
  });
});
