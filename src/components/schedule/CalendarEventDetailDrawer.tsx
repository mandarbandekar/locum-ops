import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Shield, RefreshCw, ExternalLink, Calendar as CalendarIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { useCredentials } from '@/hooks/useCredentials';
import { useSubscriptions } from '@/hooks/useSubscriptions';

interface Props {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  due_soon: 'Due soon',
  expired: 'Expired',
};

const STATUS_CLASS: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  due_soon: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  expired: 'bg-destructive/15 text-destructive border-destructive/30',
};

export function CalendarEventDetailDrawer({ event, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { credentials } = useCredentials();
  const { activeSubscriptions } = useSubscriptions();

  if (!event) return null;

  const isCredential = event.type === 'credential';
  const credential = isCredential ? credentials?.find((c) => c.id === event.id) : null;
  const subscription = !isCredential ? activeSubscriptions?.find((s) => s.id === event.id) : null;

  const handleOpen = () => {
    onOpenChange(false);
    navigate('/credentials');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-2">
            {isCredential ? (
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <RefreshCw className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            )}
            <SheetTitle className="text-left">{event.label}</SheetTitle>
          </div>
          <SheetDescription className="text-left">
            {isCredential ? 'Credential expiry' : 'Subscription renewal'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={STATUS_CLASS[event.status]}>
              {STATUS_LABEL[event.status]}
            </Badge>
          </div>

          <div className="rounded-lg border p-3 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>{isCredential ? 'Expires' : 'Renews'}</span>
            </div>
            <div className="font-medium text-base">{format(event.date, 'EEEE, MMMM d, yyyy')}</div>
          </div>

          {credential && (
            <div className="space-y-2 text-sm">
              {credential.issuing_authority && (
                <Row label="Issuing authority" value={credential.issuing_authority} />
              )}
              {credential.jurisdiction && <Row label="Jurisdiction" value={credential.jurisdiction} />}
              {credential.credential_number && (
                <Row label="Credential #" value={credential.credential_number} />
              )}
              {credential.notes && <Row label="Notes" value={credential.notes} />}
            </div>
          )}

          {subscription && (
            <div className="space-y-2 text-sm">
              {subscription.provider && <Row label="Provider" value={subscription.provider} />}
              {subscription.category && <Row label="Category" value={subscription.category.replace(/_/g, ' ')} />}
              {subscription.billing_frequency && (
                <Row label="Billing" value={subscription.billing_frequency} />
              )}
              {subscription.cost != null && (
                <Row
                  label="Cost"
                  value={`${subscription.currency || 'USD'} ${Number(subscription.cost).toLocaleString()}`}
                />
              )}
              {subscription.notes && <Row label="Notes" value={subscription.notes} />}
            </div>
          )}

          {event.sublabel && !credential && !subscription && (
            <div className="text-sm text-muted-foreground">{event.sublabel}</div>
          )}

          <Button onClick={handleOpen} className="w-full mt-4">
            Open in {isCredential ? 'Credentials' : 'Subscriptions'}
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right break-words">{value}</span>
    </div>
  );
}
