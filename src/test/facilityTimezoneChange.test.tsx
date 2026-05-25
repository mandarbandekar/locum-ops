import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FacilityTimezoneChangeDialog } from '@/components/facilities/FacilityTimezoneChangeDialog';
import { resolveShiftTz } from '@/lib/resolveTimezone';

afterEach(() => cleanup());

describe('FacilityTimezoneChangeDialog', () => {
  it('renders title, body, and both timezone labels', () => {
    render(
      <FacilityTimezoneChangeDialog
        open
        oldTz="America/Los_Angeles"
        newTz="America/New_York"
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText('Change clinic timezone?')).toBeInTheDocument();
    expect(
      screen.getByText(/By default, existing shifts and invoices keep their original timezone/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Future shifts for this clinic will use the new timezone/i)).toBeInTheDocument();
    expect(screen.getByText('Pacific (Los Angeles)')).toBeInTheDocument();
    expect(screen.getByText('Eastern (New York)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Confirm timezone change' }),
    ).toBeInTheDocument();
  });

  it('does not render dialog content when closed', () => {
    render(
      <FacilityTimezoneChangeDialog
        open={false}
        oldTz="America/Los_Angeles"
        newTz="America/New_York"
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.queryByText('Change clinic timezone?')).toBeNull();
  });

  it('Cancel fires onCancel and not onConfirm', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <FacilityTimezoneChangeDialog
        open
        oldTz="America/Los_Angeles"
        newTz="America/New_York"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('Confirm fires onConfirm and not onCancel', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <FacilityTimezoneChangeDialog
        open
        oldTz="America/Los_Angeles"
        newTz="America/New_York"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm timezone change' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({ rebaseExisting: false });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('shows rebase checkbox when existingShiftCount > 0 and passes rebaseExisting: true on confirm', () => {
    const onConfirm = vi.fn();
    render(
      <FacilityTimezoneChangeDialog
        open
        oldTz="America/Los_Angeles"
        newTz="America/Chicago"
        existingShiftCount={4}
        onCancel={() => {}}
        onConfirm={onConfirm}
      />,
    );
    const cb = screen.getByLabelText(/Also rebase 4 existing shifts/i);
    fireEvent.click(cb);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm timezone change' }));
    expect(onConfirm).toHaveBeenCalledWith({ rebaseExisting: true });
  });

  it('hides rebase checkbox when there are no existing shifts', () => {
    render(
      <FacilityTimezoneChangeDialog
        open
        oldTz="America/Los_Angeles"
        newTz="America/Chicago"
        existingShiftCount={0}
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.queryByLabelText(/Also rebase/i)).toBeNull();
  });
});

// Trigger logic mirrors the page-level guard in FacilityDetailPage:
// only prompt when the user actually changed the timezone.
function shouldConfirmTzChange(oldTz: string, newTz: string): boolean {
  return (oldTz || 'America/New_York') !== (newTz || 'America/New_York');
}

describe('facility timezone change trigger', () => {
  it('does NOT trigger confirmation when timezone is unchanged', () => {
    expect(shouldConfirmTzChange('America/Los_Angeles', 'America/Los_Angeles')).toBe(false);
  });
  it('triggers confirmation when timezone is changed', () => {
    expect(shouldConfirmTzChange('America/Los_Angeles', 'America/New_York')).toBe(true);
  });
});

describe('facility timezone change does not rewrite history', () => {
  const existingShift = {
    id: 's-old',
    timezone_at_creation: 'America/Los_Angeles',
  };
  const newShift = {
    id: 's-new',
    timezone_at_creation: null, // newly created after the change
  };

  it('existing shift continues to resolve to its original timezone after the facility tz changes', () => {
    const facilityAfter = { id: 'f1', timezone: 'America/New_York' };
    expect(resolveShiftTz(existingShift as any, facilityAfter as any, null)).toBe(
      'America/Los_Angeles',
    );
  });

  it('new shift after the change uses the updated facility timezone', () => {
    const facilityAfter = { id: 'f1', timezone: 'America/New_York' };
    expect(resolveShiftTz(newShift as any, facilityAfter as any, null)).toBe(
      'America/New_York',
    );
  });
});

// Mirrors the rebase math in FacilityDetailPage when the user opts in to
// "Also rebase existing shifts": keep the wall-clock the user typed, reinterpret
// in the new tz.
import { zonedWallClockToUtc, formatYMDInTz, formatHHMMInTz } from '@/lib/tzTime';
function rebaseShift(shift: any, oldTz: string, newTz: string) {
  const stampTz = shift.timezone_at_creation || oldTz;
  const ymd = formatYMDInTz(shift.start_datetime, stampTz);
  const startHHMM = formatHHMMInTz(shift.start_datetime, stampTz);
  const endHHMM = formatHHMMInTz(shift.end_datetime, stampTz);
  const newStart = zonedWallClockToUtc(ymd, startHHMM, newTz);
  let newEnd = zonedWallClockToUtc(ymd, endHHMM, newTz);
  if (newEnd.getTime() <= newStart.getTime()) {
    newEnd = new Date(newEnd.getTime() + 24 * 60 * 60 * 1000);
  }
  return { start_datetime: newStart.toISOString(), end_datetime: newEnd.toISOString(), timezone_at_creation: newTz };
}

describe('facility timezone rebase (opt-in backfill)', () => {
  it('keeps wall-clock the same and shifts UTC by the tz delta (LA→Chicago)', () => {
    // Original: typed 8 AM PT on May 27 → 15:00Z
    const shift = {
      id: 's1',
      start_datetime: '2026-05-27T15:00:00.000Z',
      end_datetime: '2026-05-28T00:00:00.000Z', // 5 PM PT
      timezone_at_creation: 'America/Los_Angeles',
    };
    const out = rebaseShift(shift, 'America/Los_Angeles', 'America/Chicago');
    // 8 AM CT on May 27 → 13:00Z (CDT, UTC-5)
    expect(out.start_datetime).toBe('2026-05-27T13:00:00.000Z');
    expect(out.end_datetime).toBe('2026-05-27T22:00:00.000Z');
    expect(out.timezone_at_creation).toBe('America/Chicago');
    // Round-trip: wall-clock in new tz still reads 08:00 / 17:00
    expect(formatHHMMInTz(out.start_datetime, 'America/Chicago')).toBe('08:00');
    expect(formatHHMMInTz(out.end_datetime, 'America/Chicago')).toBe('17:00');
  });
});

