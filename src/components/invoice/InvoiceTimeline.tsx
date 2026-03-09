import { format, isValid } from 'date-fns';
import { FileText, Send, DollarSign, CheckCircle, Link, Eye } from 'lucide-react';

interface TimelineEvent {
  action: string;
  description: string;
  created_at: string;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  created: FileText,
  saved: Eye,
  share_link_created: Link,
  marked_sent: Send,
  payment_recorded: DollarSign,
  paid_in_full: CheckCircle,
};

export function InvoiceTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">Activity</h3>
      <div className="space-y-0">
        {events.map((event, i) => {
          const Icon = ICONS[event.action] || FileText;
          return (
            <div key={i} className="flex gap-3 pb-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                </div>
                {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              <div className="pb-1">
                <p className="text-sm">{event.description}</p>
                <p className="text-xs text-muted-foreground">
                  {isValid(new Date(event.created_at))
                    ? format(new Date(event.created_at), 'MMM d, yyyy · h:mm a')
                    : 'Unknown date'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
