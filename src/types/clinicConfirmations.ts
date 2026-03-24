export interface FacilityConfirmationSettings {
  id: string;
  facility_id: string;
  primary_contact_name: string;
  primary_contact_email: string;
  secondary_contact_email: string;
  monthly_enabled: boolean;
  monthly_send_offset_days: number;
  preshift_enabled: boolean;
  preshift_send_offset_days: number;
  auto_send_enabled: boolean;
}

export type ConfirmationEmailType = 'monthly' | 'preshift' | 'update';
export type ConfirmationEmailStatus = 'scheduled' | 'sent' | 'confirmed' | 'needs_update' | 'failed';

export interface ConfirmationEmail {
  id: string;
  facility_id: string;
  shift_id: string | null;
  month_key: string | null;
  type: ConfirmationEmailType;
  recipient_email: string;
  subject: string;
  body: string;
  status: ConfirmationEmailStatus;
  scheduled_for: string | null;
  sent_at: string | null;
  confirmed_at: string | null;
  shift_hash_snapshot: string | null;
  created_at?: string;
}

export interface ConfirmationSnapshot {
  id: string;
  confirmation_email_id: string;
  shift_count_snapshot: number;
  shift_data_snapshot: any;
  last_shift_snapshot_at: string;
}

export const MONTHLY_OFFSET_OPTIONS = [
  { value: 7, label: '7 days before month starts' },
  { value: 5, label: '5 days before month starts' },
  { value: 3, label: '3 days before month starts' },
];

export const PRESHIFT_OFFSET_OPTIONS = [
  { value: 7, label: '7 days before' },
  { value: 3, label: '3 days before' },
  { value: 1, label: '1 day before' },
  { value: 0, label: 'Same day morning' },
];
