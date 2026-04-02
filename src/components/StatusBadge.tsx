import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  active: 'chip-success',
  archived: 'bg-muted text-muted-foreground',
  draft: 'bg-muted text-muted-foreground',
  sent: 'chip-info',
  paid: 'chip-success',
  overdue: 'chip-error',
  pending: 'chip-warning',
  scheduled: 'chip-info',
  confirmed: 'chip-success',
  'needs action': 'chip-warning',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn('status-badge', statusStyles[status] || 'bg-muted text-muted-foreground', className)}>
      {status}
    </span>
  );
}
