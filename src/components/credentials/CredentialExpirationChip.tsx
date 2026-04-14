import { getDaysUntilExpiration } from '@/lib/credentialTypes';
import { Clock, AlertTriangle, XCircle } from 'lucide-react';

interface Props {
  expirationDate: string | null;
}

export function CredentialExpirationChip({ expirationDate }: Props) {
  if (!expirationDate) return <span className="text-xs text-muted-foreground">No expiry</span>;

  const days = getDaysUntilExpiration(expirationDate);
  if (days === null) return null;

  if (days < 0) {
    return (
      <span className="status-badge pill-overdue gap-1">
        <XCircle className="h-3.5 w-3.5" />
        Expired {Math.abs(days)}d ago
      </span>
    );
  }

  if (days <= 30) {
    return (
      <span className="status-badge pill-pending gap-1">
        <AlertTriangle className="h-3.5 w-3.5" />
        {days}d left
      </span>
    );
  }

  return (
    <span className="status-badge pill-sent gap-1">
      <Clock className="h-3.5 w-3.5" />
      {days}d left
    </span>
  );
}
