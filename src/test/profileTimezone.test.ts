import { describe, it, expect } from 'vitest';
import { US_TIMEZONES, shouldAutoSyncTz, shouldPromptTzChange, formatTzLabel } from '@/lib/usTimezones';

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

describe('shouldPromptTzChange', () => {
  it('prompts when unpinned and device is a supported US zone differing from profile', () => {
    expect(shouldPromptTzChange({
      pinned: false,
      profileTz: 'America/Los_Angeles',
      deviceTz: 'America/New_York',
    })).toBe(true);
  });

  it('does not prompt when device tz is non-US', () => {
    expect(shouldPromptTzChange({
      pinned: false,
      profileTz: 'America/Los_Angeles',
      deviceTz: 'Europe/Rome',
    })).toBe(false);
  });

  it('does not prompt when pinned', () => {
    expect(shouldPromptTzChange({
      pinned: true,
      profileTz: 'America/Los_Angeles',
      deviceTz: 'America/New_York',
    })).toBe(false);
  });

  it('does not prompt when tzs already match', () => {
    expect(shouldPromptTzChange({
      pinned: false,
      profileTz: 'America/New_York',
      deviceTz: 'America/New_York',
    })).toBe(false);
  });
});

describe('formatTzLabel', () => {
  it('produces a label with offset and city for Los Angeles', () => {
    const label = formatTzLabel('America/Los_Angeles', new Date('2026-07-15T12:00:00Z'));
    expect(label).toMatch(/GMT-07:00/);
    expect(label).toMatch(/Los Angeles/);
  });

  it('produces a label for New York', () => {
    const label = formatTzLabel('America/New_York', new Date('2026-07-15T12:00:00Z'));
    expect(label).toMatch(/GMT-04:00/);
    expect(label).toMatch(/New York/);
  });
});
