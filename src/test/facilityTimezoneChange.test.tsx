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
