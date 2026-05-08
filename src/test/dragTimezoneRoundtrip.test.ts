import { describe, it, expect } from 'vitest';
import { formatInTimeZone } from 'date-fns-tz';
import { detectShiftConflictsDetailed } from '../lib/businessLogic';
import { getShiftAbsoluteRange } from '../lib/shiftTimezone';

/**
 * When a user (device tz: America/Chicago = CST) drags a shift belonging to a
 * PA clinic (America/New_York = EST) on the week grid, we compute the new
 * start/end as a Date in the device's local time and store it via
 * `.toISOString()`. That ISO is an absolute UTC moment.
 *
 * The downstream display layer renders that absolute moment in the clinic's
 * timezone via `formatInTimeZone`. So a drop at 10:00 in the CST grid should
 * read as 11:00 AM EST on the card. That's the round-trip we want to lock in.
 */
describe('Drag round-trip across timezones', () => {
  it('drag to 10:00 in device CST renders as 11:00 AM EST on a PA-clinic card', () => {
    // Simulate the drop handler's date construction:
    // user drops on 2026-06-15 at hour 10 (device-local). The page builds:
    //   const newStart = new Date(targetDate); newStart.setHours(10, 0, 0, 0);
    // We mimic that by constructing the same wall clock in CST.
    const wallClockCst = '2026-06-15T10:00:00-05:00'; // 10am CDT on that date
    const stored = new Date(wallClockCst).toISOString();

    const renderedInEst = formatInTimeZone(new Date(stored), 'America/New_York', 'h:mm a');
    expect(renderedInEst).toBe('11:00 AM');
  });

  it('an EST 9am shift and a CST 9am shift on the same date do not conflict', () => {
    // 9am EST = 13:00 UTC; 9am CST = 14:00 UTC. Non-overlapping if each is 1h.
    const estShift = {
      id: 'a',
      facility_id: 'pa',
      start_datetime: '2026-06-15T09:00:00',
      end_datetime: '2026-06-15T10:00:00',
    };
    const csShift = {
      id: 'b',
      facility_id: 'al',
      start_datetime: '2026-06-15T09:00:00',
      end_datetime: '2026-06-15T10:00:00',
    };
    const tzMap = { pa: 'America/New_York', al: 'America/Chicago' };

    const aRange = getShiftAbsoluteRange(estShift, tzMap.pa);
    const bRange = getShiftAbsoluteRange(csShift, tzMap.al);
    expect(aRange.endUtcMs).toBeLessThanOrEqual(bRange.startUtcMs);

    const conflicts = detectShiftConflictsDetailed([estShift as any], csShift as any, tzMap);
    expect(conflicts).toHaveLength(0);
  });
});
