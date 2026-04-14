import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  active: 'pill-sent',
  archived: 'pill-draft',
  draft: 'pill-draft',
  sent: 'pill-sent',
  paid: 'pill-paid',
  overdue: 'pill-overdue',
  pending: 'pill-pending',
  scheduled: 'pill-sent',
  confirmed: 'pill-paid',
  'needs action': 'pill-overdue',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn('status-badge', statusStyles[status] || 'pill-draft', className)}>
      {status}
    </span>
  );
}
