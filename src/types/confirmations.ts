export type ConfirmationStatus = 'not_sent' | 'sent' | 'confirmed' | 'needs_update';

export interface ConfirmationRecord {
  id: string;
  facility_id: string;
  month_key: string; // e.g. '2026-04'
  status: ConfirmationStatus;
  sent_at: string | null;
  confirmed_at: string | null;
  share_token: string | null;
  share_token_created_at: string | null;
  share_token_revoked_at: string | null;
  shift_count_snapshot: number | null;
  shift_hash_snapshot: string | null;
  last_shift_snapshot_at: string | null;
  message_body: string;
  notes: string;
}

export interface ConfirmationShiftLink {
  id: string;
  confirmation_record_id: string;
  shift_id: string;
}

export interface ConfirmationActivity {
  id: string;
  confirmation_record_id: string;
  action: string;
  description: string;
  created_at: string;
}

export function computeShiftHash(shifts: { id: string; start_datetime: string; end_datetime: string; rate_applied: number }[]): string {
  return shifts
    .map(s => `${s.id}|${s.start_datetime}|${s.end_datetime}|${s.rate_applied}`)
    .sort()
    .join(',');
}
