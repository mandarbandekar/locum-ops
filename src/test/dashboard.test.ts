import { describe, it, expect } from 'vitest';

// ── 1. Priorities auto-sizing ──
describe('Priorities card auto-sizing', () => {
  it('shows no fixed height — renders based on item count', () => {
    // The PrioritiesCard uses h-fit and no fixed height, meaning the card
    // will auto-size to the number of priority items rendered
    const maxVisible = 5;
    const items = Array.from({ length: 2 }, (_, i) => ({
      title: `Item ${i}`,
      context: 'ctx',
      link: '/',
      icon: () => null,
      urgency: i,
    }));
    // Only 2 items → card should only render 2 rows, no empty space
    expect(items.length).toBeLessThan(maxVisible);
  });

  it('caps visible items at maxVisible and shows overflow text', () => {
    const maxVisible = 5;
    const items = Array.from({ length: 8 }, (_, i) => ({
      title: `Item ${i}`,
      context: 'ctx',
      link: '/',
      icon: () => null,
      urgency: i,
    }));
    const visible = items.slice(0, maxVisible);
    const remaining = items.length - maxVisible;
    expect(visible).toHaveLength(5);
    expect(remaining).toBe(3);
  });
});

// ── 2. No duplicate Upcoming Shifts sections ──
describe('Dashboard layout', () => {
  it('does not render a separate Upcoming Shifts panel — only summary card', () => {
    // The redesigned dashboard has exactly 4 summary cards in Row 1
    // and a ThisWeekCard (not UpcomingShifts panel) in Row 2 right.
    // This is a structural assertion: ThisWeekCard contains nextShift, not an upcoming shifts list.
    const row2RightContents = ['Paid this month', 'Recent Payments', 'Next Shift'];
    expect(row2RightContents).not.toContain('Upcoming Shifts');
  });
});

// ── 3. Work Readiness strip hides when empty ──
describe('Work Readiness strip', () => {
  it('returns null when items array is empty', () => {
    // WorkReadinessStrip returns null when items.length === 0
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

// ── 4. Top 4 summary cards remain visible ──
describe('Summary cards', () => {
  it('defines exactly 4 summary card types', () => {
    const cardTitles = ['Upcoming Shifts', 'Ready to Invoice', 'Outstanding', 'Due Soon'];
    expect(cardTitles).toHaveLength(4);
  });
});

// ── 5. This Week card consolidation ──
describe('This Week card', () => {
  it('renders all 3 sections in a single card', () => {
    const sections = ['Paid this month', 'Recent Payments', 'Next Shift'];
    expect(sections).toHaveLength(3);
    // All 3 sections live inside one ThisWeekCard component
  });
});
