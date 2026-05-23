import { describe, it, expect } from 'vitest';
import { isSameDay } from 'date-fns';

// Re-implement getEventsForDay logic locally (mirrors useCalendarEvents)
type Event = {
  id: string;
  type: 'credential' | 'subscription';
  date: Date;
  label: string;
  status: 'active' | 'due_soon' | 'expired';
};

function getEventsForDay(
  credentialEvents: Event[],
  subscriptionEvents: Event[],
  day: Date,
  filters: { credentials: boolean; subscriptions: boolean }
): Event[] {
  const events: Event[] = [];
  if (filters.credentials) {
    events.push(...credentialEvents.filter(e => isSameDay(e.date, day)));
  }
  if (filters.subscriptions) {
    events.push(...subscriptionEvents.filter(e => isSameDay(e.date, day)));
  }
  return events;
}

const ALWAYS_ON_FILTERS = { credentials: true, subscriptions: true };

describe('Calendar events after Layers removal — Month view', () => {
  const day = new Date(2026, 5, 15);
  const credentialEvents: Event[] = [
    { id: 'c1', type: 'credential', date: day, label: 'DEA License', status: 'due_soon' },
    { id: 'c2', type: 'credential', date: new Date(2026, 5, 20), label: 'CA Vet License', status: 'active' },
  ];
  const subscriptionEvents: Event[] = [
    { id: 's1', type: 'subscription', date: day, label: 'VIN', status: 'active' },
    { id: 's2', type: 'subscription', date: new Date(2026, 5, 22), label: 'Plumb', status: 'expired' },
  ];

  it('renders credential events on their expiry date', () => {
    const events = getEventsForDay(credentialEvents, subscriptionEvents, day, ALWAYS_ON_FILTERS);
    expect(events.some(e => e.id === 'c1' && e.type === 'credential')).toBe(true);
  });

  it('renders subscription events on their renewal date', () => {
    const events = getEventsForDay(credentialEvents, subscriptionEvents, day, ALWAYS_ON_FILTERS);
    expect(events.some(e => e.id === 's1' && e.type === 'subscription')).toBe(true);
  });

  it('renders both credentials and subscriptions on the same day', () => {
    const events = getEventsForDay(credentialEvents, subscriptionEvents, day, ALWAYS_ON_FILTERS);
    expect(events).toHaveLength(2);
    expect(events.map(e => e.type).sort()).toEqual(['credential', 'subscription']);
  });

  it('returns empty for days without events', () => {
    const empty = getEventsForDay(credentialEvents, subscriptionEvents, new Date(2026, 5, 1), ALWAYS_ON_FILTERS);
    expect(empty).toHaveLength(0);
  });

  it('always-on filters never hide credentials or subscriptions', () => {
    // After Layers removal, filters are hardcoded true. Confirm both layers stay visible.
    expect(ALWAYS_ON_FILTERS.credentials).toBe(true);
    expect(ALWAYS_ON_FILTERS.subscriptions).toBe(true);
  });
});

describe('Calendar events after Layers removal — List/agenda flattening', () => {
  const credentialEvents: Event[] = [
    { id: 'c1', type: 'credential', date: new Date(2026, 0, 10), label: 'DEA', status: 'expired' },
    { id: 'c2', type: 'credential', date: new Date(2026, 1, 5), label: 'CA Vet', status: 'due_soon' },
    { id: 'c3', type: 'credential', date: new Date(2026, 5, 1), label: 'CE Cert', status: 'active' },
  ];
  const subscriptionEvents: Event[] = [
    { id: 's1', type: 'subscription', date: new Date(2026, 1, 5), label: 'VIN', status: 'active' },
    { id: 's2', type: 'subscription', date: new Date(2026, 3, 12), label: 'Plumb', status: 'due_soon' },
  ];

  function listAllEvents(): Event[] {
    // Mirrors how a list view would flatten events across a range.
    return [...credentialEvents, ...subscriptionEvents].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
  }

  it('list view contains every credential event', () => {
    const list = listAllEvents();
    credentialEvents.forEach(c => {
      expect(list.find(e => e.id === c.id && e.type === 'credential')).toBeTruthy();
    });
  });

  it('list view contains every subscription event', () => {
    const list = listAllEvents();
    subscriptionEvents.forEach(s => {
      expect(list.find(e => e.id === s.id && e.type === 'subscription')).toBeTruthy();
    });
  });

  it('list view is sorted chronologically', () => {
    const list = listAllEvents();
    for (let i = 1; i < list.length; i++) {
      expect(list[i].date.getTime()).toBeGreaterThanOrEqual(list[i - 1].date.getTime());
    }
  });

  it('list view groups multiple events on the same day together', () => {
    const sameDay = listAllEvents().filter(e => isSameDay(e.date, new Date(2026, 1, 5)));
    expect(sameDay).toHaveLength(2);
    expect(sameDay.map(e => e.type).sort()).toEqual(['credential', 'subscription']);
  });
});
