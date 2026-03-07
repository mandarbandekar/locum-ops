export type ContractStatus = 'draft' | 'active' | 'expired';

export interface Contract {
  id: string;
  facility_id: string;
  title: string;
  status: ContractStatus;
  effective_date: string | null;
  end_date: string | null;
  auto_renew: boolean;
  file_url: string | null;
  external_link_url: string | null;
  notes: string;
}

export interface ContractTerms {
  id: string;
  contract_id: string;
  weekday_rate: number | null;
  weekend_rate: number | null;
  holiday_rate: number | null;
  payment_terms_days: number | null;
  cancellation_policy_text: string;
  overtime_policy_text: string;
  late_payment_policy_text: string;
  invoicing_instructions_text: string;
}

export type ChecklistItemType = 'w9' | 'coi' | 'direct_deposit' | 'credentialing' | 'other';
export type ChecklistItemStatus = 'needed' | 'in_progress' | 'done';

export interface ContractChecklistItem {
  id: string;
  facility_id: string;
  type: ChecklistItemType;
  title: string;
  status: ChecklistItemStatus;
  due_date: string | null;
  notes: string;
}

export const DEFAULT_CHECKLIST_ITEMS: { type: ChecklistItemType; title: string }[] = [
  { type: 'w9', title: 'W-9' },
  { type: 'coi', title: 'Certificate of Insurance (COI)' },
  { type: 'direct_deposit', title: 'Direct Deposit Form' },
  { type: 'credentialing', title: 'Credentialing Packet' },
];

export function getChecklistBadge(item: ContractChecklistItem): 'due_soon' | 'overdue' | null {
  if (item.status === 'done' || !item.due_date) return null;
  const now = new Date();
  const due = new Date(item.due_date);
  if (due < now) return 'overdue';
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) return 'due_soon';
  return null;
}
