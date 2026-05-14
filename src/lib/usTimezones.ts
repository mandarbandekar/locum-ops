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

/** True when the saved profile tz should be replaced by the device tz on
 *  session load. Pinning suppresses auto-sync; matching tzs are a no-op. */
export function shouldAutoSyncTz(args: {
  pinned: boolean;
  profileTz: string;
  deviceTz: string;
}): boolean {
  if (args.pinned) return false;
  if (!args.deviceTz) return false;
  return args.profileTz !== args.deviceTz;
}
