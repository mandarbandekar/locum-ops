import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { useNavigate } from 'react-router-dom';

const STATUS_STYLES: Record<string, { credential: string; subscription: string }> = {
  active: {
    credential: 'bg-[#EBF3EE] dark:bg-[#1A2E22] text-[#17382A] dark:text-[#A3D6B5] border-[#C8DDD0] dark:border-[#2D5A3F]',
    subscription: 'bg-[#E8F3F5] dark:bg-[#1A3840] text-[#0E3A44] dark:text-[#B0DDE5] border-[#C5DDE3] dark:border-[#2D5560]',
  },
  due_soon: {
    credential: 'bg-[#FDF5E6] dark:bg-[#3A2E14] text-[#7A5A14] dark:text-[#E8C66B] border-[#E8D8B0] dark:border-[#5C4820]',
    subscription: 'bg-[#FDF5E6] dark:bg-[#3A2E14] text-[#7A5A14] dark:text-[#E8C66B] border-[#E8D8B0] dark:border-[#5C4820]',
  },
  expired: {
    credential: 'bg-[#F4EDE2] dark:bg-[#332818] text-[#54401C] dark:text-[#EBD9C2] border-[#E0D0B0] dark:border-[#5C4820]',
    subscription: 'bg-[#F4EDE2] dark:bg-[#332818] text-[#54401C] dark:text-[#EBD9C2] border-[#E0D0B0] dark:border-[#5C4820]',
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
