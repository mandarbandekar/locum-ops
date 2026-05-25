import { describe, it, expect } from 'vitest';
import {
  US_TIMEZONES,
  shouldPromptTzMismatch,
  isSupportedUsTz,
  labelForTz,
} from '@/lib/usTimezones';

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

describe('isSupportedUsTz', () => {
  it('accepts supported US zones', () => {
    expect(isSupportedUsTz('America/New_York')).toBe(true);
    expect(isSupportedUsTz('Pacific/Honolulu')).toBe(true);
  });
  it('rejects non-US / empty / unknown', () => {
    expect(isSupportedUsTz('Europe/Rome')).toBe(false);
    expect(isSupportedUsTz('')).toBe(false);
    expect(isSupportedUsTz(null)).toBe(false);
    expect(isSupportedUsTz('Not/A_Zone')).toBe(false);
  });
});

describe('labelForTz', () => {
  it('returns the friendly label for known zones', () => {
    expect(labelForTz('America/Los_Angeles')).toBe('Pacific (Los Angeles)');
  });
  it('falls back to the raw IANA string when unknown', () => {
    expect(labelForTz('Europe/Rome')).toBe('Europe/Rome');
  });
});

describe('shouldPromptTzMismatch', () => {
  it('does NOT prompt when device tz equals saved profile tz', () => {
    expect(
      shouldPromptTzMismatch({
        pinned: false,
        profileTz: 'America/Los_Angeles',
        deviceTz: 'America/Los_Angeles',
      }),
    ).toBe(false);
  });

  it('prompts when unpinned and device tz differs (both supported)', () => {
    expect(
      shouldPromptTzMismatch({
        pinned: false,
        profileTz: 'America/Los_Angeles',
        deviceTz: 'America/New_York',
      }),
    ).toBe(true);
  });

  it('does NOT prompt when timezone_pinned is true, even if tzs differ', () => {
    expect(
      shouldPromptTzMismatch({
        pinned: true,
        profileTz: 'America/Los_Angeles',
        deviceTz: 'America/New_York',
      }),
    ).toBe(false);
  });

  it('does NOT prompt when device tz is unsupported / non-US', () => {
    expect(
      shouldPromptTzMismatch({
        pinned: false,
        profileTz: 'America/Los_Angeles',
        deviceTz: 'Europe/Rome',
      }),
    ).toBe(false);
  });

  it('does NOT prompt when device tz is empty / missing', () => {
    expect(
      shouldPromptTzMismatch({
        pinned: false,
        profileTz: 'America/Los_Angeles',
        deviceTz: '',
      }),
    ).toBe(false);
  });
});
