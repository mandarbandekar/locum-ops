import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  active: 'bg-success/15 text-success',
  prospect: 'bg-warning/15 text-warning',
  paused: 'bg-muted text-muted-foreground',
  proposed: 'bg-warning/15 text-warning',
  booked: 'bg-primary/15 text-primary',
  completed: 'bg-success/15 text-success',
  canceled: 'bg-muted text-muted-foreground line-through',
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-primary/15 text-primary',
  paid: 'bg-success/15 text-success',
  overdue: 'bg-destructive/15 text-destructive',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn('status-badge', statusStyles[status] || 'bg-muted text-muted-foreground', className)}>
      {status}
    </span>
  );
}
