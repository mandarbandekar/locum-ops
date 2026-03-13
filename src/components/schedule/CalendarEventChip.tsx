import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { useNavigate } from 'react-router-dom';

const STATUS_STYLES: Record<string, { credential: string; subscription: string }> = {
  active: {
    credential: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    subscription: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  },
  due_soon: {
    credential: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    subscription: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
  expired: {
    credential: 'bg-destructive/10 text-destructive border-destructive/20',
    subscription: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

const TYPE_ICONS: Record<string, string> = {
  credential: '🛡️',
  subscription: '🔄',
};

interface CalendarEventChipProps {
  event: CalendarEvent;
  compact?: boolean;
}

export function CalendarEventChip({ event, compact = false }: CalendarEventChipProps) {
  const navigate = useNavigate();

  const style = STATUS_STYLES[event.status]?.[event.type] || STATUS_STYLES.active[event.type];

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.type === 'credential') {
      navigate('/credentials');
    } else {
      navigate('/credentials');
    }
  };

  if (compact) {
    return (
      <div
        className={`text-[9px] px-1 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity ${style}`}
        onClick={handleClick}
        title={`${event.label}${event.sublabel ? ` — ${event.sublabel}` : ''} (${event.status.replace('_', ' ')})`}
      >
        {TYPE_ICONS[event.type]} {event.label}
      </div>
    );
  }

  return (
    <div
      className={`text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity ${style}`}
      onClick={handleClick}
      title={`${event.label}${event.sublabel ? ` — ${event.sublabel}` : ''} (${event.status.replace('_', ' ')})`}
    >
      {TYPE_ICONS[event.type]} {event.label}
    </div>
  );
}

interface CalendarEventStackProps {
  events: CalendarEvent[];
  maxVisible?: number;
}

export function CalendarEventStack({ events, maxVisible = 2 }: CalendarEventStackProps) {
  if (events.length === 0) return null;

  const visible = events.slice(0, maxVisible);
  const remaining = events.length - maxVisible;

  return (
    <div className="space-y-0.5">
      {visible.map(event => (
        <CalendarEventChip key={`${event.type}-${event.id}`} event={event} compact />
      ))}
      {remaining > 0 && (
        <div className="text-[9px] text-muted-foreground pl-1">
          +{remaining} more
        </div>
      )}
    </div>
  );
}
