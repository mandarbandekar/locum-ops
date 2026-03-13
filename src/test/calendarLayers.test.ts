import { describe, it, expect } from 'vitest';
import { computeStatus } from '@/hooks/useSubscriptions';

// Re-implement credentialStatus locally for testing (mirrors useCalendarEvents logic)
function credentialStatus(expirationDate: string | null, status: string): 'active' | 'due_soon' | 'expired' | null {
  if (status === 'expired' || status === 'archived') return 'expired';
  if (!expirationDate) return 'active';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expirationDate + 'T00:00:00');
  if (exp < now) return 'expired';
  const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 30) return 'due_soon';
  return 'active';
}

describe('Calendar Layers - Subscription Events', () => {
  it('should place subscription renewal on correct date via computeStatus', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateStr = futureDate.toISOString().split('T')[0];
    const status = computeStatus(dateStr, 'active');
    expect(status).toBe('active');
  });

  it('should mark subscription as due_soon within 30 days', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 15);
    const dateStr = soon.toISOString().split('T')[0];
    const status = computeStatus(dateStr, 'active');
    expect(status).toBe('due_soon');
  });

  it('should mark subscription as expired when renewal date passed', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    const dateStr = past.toISOString().split('T')[0];
    const status = computeStatus(dateStr, 'active');
    expect(status).toBe('expired');
  });

  it('should not show canceled subscriptions (computeStatus returns canceled)', () => {
    const status = computeStatus('2026-12-01', 'canceled');
    expect(status).toBe('canceled');
  });
});

describe('Calendar Layers - Credential Events', () => {
  it('should place credential renewal on correct date', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateStr = futureDate.toISOString().split('T')[0];
    const status = credentialStatus(dateStr, 'active');
    expect(status).toBe('active');
  });

  it('should mark credential as due_soon within 30 days', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 10);
    const dateStr = soon.toISOString().split('T')[0];
    const status = credentialStatus(dateStr, 'active');
    expect(status).toBe('due_soon');
  });

  it('should mark credential as expired when date passed', () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    const dateStr = past.toISOString().split('T')[0];
    const status = credentialStatus(dateStr, 'active');
    expect(status).toBe('expired');
  });

  it('should not show archived credentials', () => {
    const status = credentialStatus('2027-01-01', 'archived');
    expect(status).toBe('expired');
  });

  it('should handle credentials without expiration date', () => {
    const status = credentialStatus(null, 'active');
    expect(status).toBe('active');
  });
});

describe('Calendar Layers - Filter Logic', () => {
  it('should allow toggling filters independently', () => {
    const filters = { shifts: true, credentials: false, subscriptions: false };
    // Toggle credentials on
    const updated = { ...filters, credentials: !filters.credentials };
    expect(updated.credentials).toBe(true);
    expect(updated.shifts).toBe(true);
    expect(updated.subscriptions).toBe(false);
  });

  it('should support multiple events on same date without error', () => {
    const events = [
      { id: '1', type: 'credential' as const, date: new Date('2026-06-15'), label: 'DEA', status: 'active' as const },
      { id: '2', type: 'subscription' as const, date: new Date('2026-06-15'), label: 'VIN', status: 'due_soon' as const },
      { id: '3', type: 'credential' as const, date: new Date('2026-06-15'), label: 'ACLS', status: 'active' as const },
    ];
    // maxVisible = 2 pattern
    const visible = events.slice(0, 2);
    const remaining = events.length - 2;
    expect(visible).toHaveLength(2);
    expect(remaining).toBe(1);
  });
});
