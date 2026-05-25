// Shared helper to resolve "which timezone should drive this shift's display
// and billing math?" with a deterministic priority order.
//
// Order:
//   1. Shift-level snapshot (`timezone_at_creation`) — preserves the tz used
//      when the wall-clock was converted to UTC, so old shifts don't visually
//      move if a clinic's tz is later edited.
//   2. Facility's current `timezone`.
//   3. User profile timezone.
//   4. 'America/New_York' as a last-resort safety fallback.
//
// Whenever we have to fall past the facility row, we log a console warning so
// the user-facing app surfaces don't quietly drift.

const FALLBACK_TZ = 'America/New_York';

type ShiftLike = { id?: string; timezone_at_creation?: string | null } | null | undefined;
type FacilityLike = { id?: string; timezone?: string | null } | null | undefined;
type ProfileLike = { timezone?: string | null } | null | undefined;

function clean(tz: string | null | undefined): string | null {
  if (!tz) return null;
  const trimmed = String(tz).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Resolve the timezone for a specific shift. */
export function resolveShiftTz(
  shift: ShiftLike,
  facility: FacilityLike,
  profile: ProfileLike,
): string {
  const snapshot = clean((shift as any)?.timezone_at_creation);
  if (snapshot) return snapshot;
  const fac = clean(facility?.timezone);
  if (fac) return fac;
  const prof = clean(profile?.timezone);
  if (prof) {
    if (typeof console !== 'undefined') {
      console.warn(
        '[tz] Falling back to profile timezone for shift',
        shift?.id,
        'facility',
        facility?.id,
      );
    }
    return prof;
  }
  if (typeof console !== 'undefined') {
    console.warn(
      '[tz] No facility/profile tz; falling back to',
      FALLBACK_TZ,
      'for shift',
      shift?.id,
      'facility',
      facility?.id,
    );
  }
  return FALLBACK_TZ;
}

/** Resolve the timezone for a facility's own display (no shift context). */
export function resolveFacilityTz(facility: FacilityLike, profile: ProfileLike): string {
  const fac = clean(facility?.timezone);
  if (fac) return fac;
  const prof = clean(profile?.timezone);
  if (prof) return prof;
  return FALLBACK_TZ;
}

/** Resolve the user's home/profile timezone for dashboard-level "today". */
export function resolveProfileTz(profile: ProfileLike): string {
  const prof = clean(profile?.timezone);
  if (prof) return prof;
  return FALLBACK_TZ;
}

export const TIMEZONE_SAFETY_FALLBACK = FALLBACK_TZ;
