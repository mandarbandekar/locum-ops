// Single source of truth for the US timezone selector. Used by Settings →
// Profile and the facility detail page so both selects stay in lockstep.
// Project rule: timezone selection is restricted to US regions.
export interface UsTimezoneOption {
  value: string;
  label: string;
}

export const US_TIMEZONES: UsTimezoneOption[] = [
  { value: 'America/New_York',    label: 'Eastern (New York)' },
  { value: 'America/Chicago',     label: 'Central (Chicago)' },
  { value: 'America/Denver',      label: 'Mountain (Denver)' },
  { value: 'America/Phoenix',     label: 'Mountain — no DST (Phoenix)' },
  { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { value: 'America/Anchorage',   label: 'Alaska (Anchorage)' },
  { value: 'Pacific/Honolulu',    label: 'Hawaii (Honolulu)' },
];

/** True when the given IANA value is one of our supported US zones. */
export function isSupportedUsTz(tz: string | null | undefined): boolean {
  if (!tz) return false;
  return US_TIMEZONES.some(t => t.value === tz);
}

/** Human label for a saved tz, falling back to the raw IANA value. */
export function labelForTz(tz: string | null | undefined): string {
  if (!tz) return '';
  return US_TIMEZONES.find(t => t.value === tz)?.label || tz;
}

/**
 * Decide whether to show the "your device tz differs from your saved business
 * tz" prompt. Replaces the older silent auto-sync. We only prompt when:
 *  - the profile tz is NOT pinned,
 *  - we have a real device tz string,
 *  - the device tz is one of our supported US zones (we never offer to save
 *    a non-US tz into the US-only picker), and
 *  - the device tz actually differs from the saved profile tz.
 */
export function shouldPromptTzMismatch(args: {
  pinned: boolean;
  profileTz: string;
  deviceTz: string;
}): boolean {
  if (args.pinned) return false;
  if (!args.deviceTz) return false;
  if (!isSupportedUsTz(args.deviceTz)) return false;
  return args.profileTz !== args.deviceTz;
}
