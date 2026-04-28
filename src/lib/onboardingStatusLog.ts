/**
 * Onboarding Status Log
 *
 * Lightweight in-memory + sessionStorage log of clinic creation and per-clinic
 * rate-saving outcomes during a single onboarding session. Powers the
 * Onboarding Status page (`/onboarding/status`) so the user can see exactly
 * which steps succeeded and which need attention — with actionable error
 * detail when something failed.
 *
 * Intentionally framework-free so it can be called from anywhere in the
 * onboarding flow without adding a context provider.
 */

export type OnboardingStatusEventType =
  | 'clinic_create_succeeded'
  | 'clinic_create_failed'
  | 'rates_save_succeeded'
  | 'rates_save_failed';

export interface OnboardingStatusEvent {
  /** ISO timestamp */
  at: string;
  type: OnboardingStatusEventType;
  /** Display name of the clinic this event refers to */
  clinicName: string;
  /** Facility id when known (post clinic-create) */
  facilityId?: string | null;
  /** Number of rates the user attempted to save (rates events only) */
  rateCount?: number;
  /** Friendly error message for failure events */
  errorMessage?: string;
  /** Optional Postgres error code (e.g. PGRST204) */
  errorCode?: string;
}

const STORAGE_KEY = 'lo_onboarding_status_log_v1';

function read(): OnboardingStatusEvent[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OnboardingStatusEvent[]) : [];
  } catch {
    return [];
  }
}

function write(events: OnboardingStatusEvent[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-100)));
  } catch {
    // sessionStorage unavailable — silently no-op.
  }
}

export function recordOnboardingStatusEvent(
  event: Omit<OnboardingStatusEvent, 'at'>,
): void {
  const all = read();
  all.push({ ...event, at: new Date().toISOString() });
  write(all);
}

export function getOnboardingStatusEvents(): OnboardingStatusEvent[] {
  return read();
}

export function clearOnboardingStatusLog(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export interface ClinicStatusSummary {
  clinicName: string;
  facilityId: string | null;
  clinicCreated: boolean;
  clinicError?: { message: string; code?: string };
  ratesAttempted: boolean;
  ratesSaved: boolean;
  rateCount: number;
  ratesError?: { message: string; code?: string };
  lastEventAt: string;
}

/**
 * Reduce the raw event log into one summary row per clinic the user attempted
 * to create during this session. Keyed by clinic name (case-insensitive).
 */
export function summarizeOnboardingStatus(
  events: OnboardingStatusEvent[],
): ClinicStatusSummary[] {
  const byKey = new Map<string, ClinicStatusSummary>();
  const keyOf = (name: string) => name.trim().toLowerCase();

  for (const e of events) {
    const key = keyOf(e.clinicName);
    if (!key) continue;
    const existing = byKey.get(key) ?? {
      clinicName: e.clinicName.trim(),
      facilityId: null,
      clinicCreated: false,
      ratesAttempted: false,
      ratesSaved: false,
      rateCount: 0,
      lastEventAt: e.at,
    };
    if (e.facilityId) existing.facilityId = e.facilityId;
    existing.lastEventAt = e.at;

    switch (e.type) {
      case 'clinic_create_succeeded':
        existing.clinicCreated = true;
        existing.clinicError = undefined;
        break;
      case 'clinic_create_failed':
        existing.clinicCreated = false;
        existing.clinicError = {
          message: e.errorMessage ?? 'Unknown error',
          code: e.errorCode,
        };
        break;
      case 'rates_save_succeeded':
        existing.ratesAttempted = true;
        existing.ratesSaved = true;
        existing.rateCount = e.rateCount ?? existing.rateCount;
        existing.ratesError = undefined;
        break;
      case 'rates_save_failed':
        existing.ratesAttempted = true;
        existing.ratesSaved = false;
        existing.rateCount = e.rateCount ?? existing.rateCount;
        existing.ratesError = {
          message: e.errorMessage ?? 'Unknown error',
          code: e.errorCode,
        };
        break;
    }
    byKey.set(key, existing);
  }
  return [...byKey.values()].sort((a, b) =>
    a.lastEventAt < b.lastEventAt ? 1 : -1,
  );
}
