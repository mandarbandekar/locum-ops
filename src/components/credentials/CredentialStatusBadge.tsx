import { CREDENTIAL_STATUS_LABELS, getStatusColor } from '@/lib/credentialTypes';
import { Badge } from '@/components/ui/badge';

interface Props {
  status: string;
}

export function CredentialStatusBadge({ status }: Props) {
  return (
    <Badge variant="outline" className={`${getStatusColor(status)} border-0 font-medium`}>
      {CREDENTIAL_STATUS_LABELS[status] || status}
    </Badge>
  );
}
