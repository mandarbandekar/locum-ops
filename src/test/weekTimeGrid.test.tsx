import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeekTimeGrid } from '@/components/schedule/WeekTimeGrid';
import type { Facility } from '@/types';

const facility: Facility = {
  id: 'fac-la',
  name: 'LA Clinic',
  timezone: 'America/Los_Angeles',
  status: 'active',
} as unknown as Facility;

function weekStartingMay1_2026(): Date[] {
  // Friday May 1, 2026 anchored as a 7-day window
  const start = new Date(2026, 4, 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

describe('WeekTimeGrid timezone rendering', () => {
  it('renders a same-day shift at clinic-local hour', () => {
    // 15:00Z = 08:00 PDT (LA) regardless of test runner tz
    const shifts = [{
      id: 's1',
      facility_id: 'fac-la',
      start_datetime: '2026-05-01T15:00:00Z',
      end_datetime: '2026-05-01T23:00:00Z', // 16:00 PDT
      color: 'blue',
      rate_applied: 850,
    }];

    render(
      <WeekTimeGrid
        weekDays={weekStartingMay1_2026()}
        shifts={shifts}
        getFacilityName={() => 'LA Clinic'}
        onEditShift={() => {}}
        onDropOnTime={() => {}}
        facilities={[facility]}
      />,
    );

    // Time label inside the block (start–end)
    expect(screen.getAllByText(/8:00 AM\s*–\s*4:00 PM/i).length).toBeGreaterThan(0);
  });

  it('splits an overnight clinic-tz shift into head and tail segments', () => {
    // 10pm PDT May 1 -> 6am PDT May 2
    const shifts = [{
      id: 'overnight',
      facility_id: 'fac-la',
      start_datetime: '2026-05-02T05:00:00Z', // 22:00 PDT May 1
      end_datetime: '2026-05-02T13:00:00Z',   // 06:00 PDT May 2
      color: 'blue',
      rate_applied: 1200,
    }];

    render(
      <WeekTimeGrid
        weekDays={weekStartingMay1_2026()}
        shifts={shifts}
        getFacilityName={() => 'LA Clinic'}
        onEditShift={() => {}}
        onDropOnTime={() => {}}
        facilities={[facility]}
        fullDay
      />,
    );

    // Both segments display the same start/end label
    const labels = screen.getAllByText(/10:00 PM\s*–\s*6:00 AM/i);
    expect(labels.length).toBe(2);
  });

  it('does not render a shift on a day where it does not occur in clinic tz', () => {
    // 06:00Z May 2 = 23:00 PDT May 1 — purely belongs to May 1 in LA tz
    const shifts = [{
      id: 's2',
      facility_id: 'fac-la',
      start_datetime: '2026-05-02T06:00:00Z',
      end_datetime: '2026-05-02T07:00:00Z', // still May 1 23:00–24:00 PDT
      color: 'blue',
      rate_applied: 500,
    }];

    render(
      <WeekTimeGrid
        weekDays={weekStartingMay1_2026()}
        shifts={shifts}
        getFacilityName={() => 'LA Clinic'}
        onEditShift={() => {}}
        onDropOnTime={() => {}}
        facilities={[facility]}
        fullDay
      />,
    );

    // Should render exactly one segment (head only, ends at midnight PDT)
    const labels = screen.getAllByText(/11:00 PM\s*–\s*12:00 AM/i);
    expect(labels.length).toBe(1);
  });
});
