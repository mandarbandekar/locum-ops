import { describe, it, expect } from 'vitest';
import { US_TIMEZONES, shouldAutoSyncTz } from '@/lib/usTimezones';

describe('US_TIMEZONES', () => {
  it('contains exactly the 7 supported US zones', () => {
    expect(US_TIMEZONES).toHaveLength(7);
    const values = US_TIMEZONES.map(t => t.value);
    expect(values).toContain('America/New_York');
    expect(values).toContain('America/Los_Angeles');
    expect(values).toContain('Pacific/Honolulu');
    expect(values).toContain('America/Phoenix');
    expect(values).toContain('America/Anchorage');
  });
});

describe('shouldAutoSyncTz', () => {
  it('does not sync when pinned, even if device tz differs', () => {
    expect(
      shouldAutoSyncTz({
        pinned: true,
        profileTz: 'America/Los_Angeles',
        deviceTz: 'Europe/Rome',
      }),
    ).toBe(false);
  });

  it('syncs when unpinned and device tz differs from saved', () => {
    expect(
      shouldAutoSyncTz({
        pinned: false,
        profileTz: 'America/Los_Angeles',
        deviceTz: 'America/New_York',
      }),
    ).toBe(true);
  });

  it('does not sync when unpinned but tzs already match', () => {
    expect(
      shouldAutoSyncTz({
        pinned: false,
        profileTz: 'America/Los_Angeles',
        deviceTz: 'America/Los_Angeles',
      }),
    ).toBe(false);
  });

  it('does not sync when device tz is unknown', () => {
    expect(
      shouldAutoSyncTz({
        pinned: false,
        profileTz: 'America/Los_Angeles',
        deviceTz: '',
      }),
    ).toBe(false);
  });
});
