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

export function isSupportedUsTimezone(tz: string): boolean {
  return US_TIMEZONES.some(t => t.value === tz);
}

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

/** True when we should prompt the user to switch profile tz to device tz.
 *  Only prompts when the device tz is a supported US zone. */
export function shouldPromptTzChange(args: {
  pinned: boolean;
  profileTz: string;
  deviceTz: string;
}): boolean {
  if (!shouldAutoSyncTz(args)) return false;
  return isSupportedUsTimezone(args.deviceTz);
}

/** Returns a Google-Calendar-style label, e.g.
 *  "(GMT-07:00) Pacific Time – Los Angeles". */
export function formatTzLabel(tz: string, at: Date = new Date()): string {
  let offset = '';
  let longName = '';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'longOffset',
    }).formatToParts(at);
    offset = parts.find(p => p.type === 'timeZoneName')?.value || '';
    // Normalize "GMT-7" → "GMT-07:00"
    offset = offset.replace(/^GMT([+-])(\d)(?!\d)/, 'GMT$10$2');
    if (offset && !offset.includes(':')) offset = offset + ':00';
  } catch {}
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'long',
    }).formatToParts(at);
    longName = parts.find(p => p.type === 'timeZoneName')?.value || '';
  } catch {}
  const city = tz.split('/').pop()?.replace(/_/g, ' ') || tz;
  const prefix = offset ? `(${offset}) ` : '';
  const name = longName ? `${longName} – ${city}` : city;
  return `${prefix}${name}`;
}
