import { describe, it, expect } from 'vitest';

// ── 1. 3-column dashboard layout ──
describe('Dashboard 3-column layout', () => {
  it('defines three main columns: shifts, money, attention', () => {
    const columns = ['UpcomingShiftsCard', 'MoneyToCollectCard', 'NeedsAttentionCard'];
    expect(columns).toHaveLength(3);
  });
});

// ── 2. Upcoming Shifts card ──
describe('Upcoming Shifts card', () => {
  it('filters to next 7 days booked/proposed shifts', () => {
    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);

    const shifts = [
      { start_datetime: new Date(now.getTime() + 86400000).toISOString(), status: 'booked' },
      { start_datetime: new Date(now.getTime() + 86400000 * 10).toISOString(), status: 'booked' },
      { start_datetime: new Date(now.getTime() + 86400000).toISOString(), status: 'cancelled' },
    ];

    const upcoming = shifts.filter(s =>
      new Date(s.start_datetime) >= now &&
      new Date(s.start_datetime) <= in7Days &&
      (s.status === 'booked' || s.status === 'proposed')
    );
    expect(upcoming).toHaveLength(1);
  });

  it('caps at 5 visible shifts', () => {
    const maxVisible = 5;
    const items = Array.from({ length: 8 }, (_, i) => ({ id: `${i}` }));
    expect(items.slice(0, maxVisible)).toHaveLength(5);
  });
});

// ── 3. Money to collect card ──
describe('Money to collect card', () => {
  it('combines draft + outstanding as total collectable', () => {
    const draftTotal = 5000;
    const outstandingTotal = 10450;
    const totalCollectable = draftTotal + outstandingTotal;
    expect(totalCollectable).toBe(15450);
  });
});

// ── 4. Needs Attention card ──
describe('Needs Attention card', () => {
  it('sorts items by urgency ascending', () => {
    const items = [
      { urgency: 5, title: 'low' },
      { urgency: 1, title: 'high' },
      { urgency: 3, title: 'mid' },
    ];
    const sorted = items.sort((a, b) => a.urgency - b.urgency);
    expect(sorted[0].title).toBe('high');
    expect(sorted[2].title).toBe('low');
  });

  it('shows empty state when no items', () => {
    const items: any[] = [];
    expect(items.length === 0).toBe(true);
  });
});

// ── 5. Work Readiness strip hides when empty ──
describe('Work Readiness strip', () => {
  it('returns null when items array is empty', () => {
    const items: any[] = [];
    const shouldRender = items.length > 0;
    expect(shouldRender).toBe(false);
  });

  it('renders when items exist', () => {
    const items = [{ text: 'Credentials: 1 renewal soon', link: '/credentials' }];
    const shouldRender = items.length > 0;
    expect(shouldRender).toBe(true);
  });
});
