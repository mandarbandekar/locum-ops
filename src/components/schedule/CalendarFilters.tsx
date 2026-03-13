import { Badge } from '@/components/ui/badge';
import { ShieldCheck, RefreshCw, CalendarDays, FileText, CheckSquare } from 'lucide-react';

export interface CalendarLayerFilters {
  shifts: boolean;
  credentials: boolean;
  subscriptions: boolean;
}

interface CalendarFiltersProps {
  filters: CalendarLayerFilters;
  onToggle: (key: keyof CalendarLayerFilters) => void;
}

const FILTER_CONFIG: { key: keyof CalendarLayerFilters; label: string; icon: React.ElementType; activeClass: string; dotClass: string }[] = [
  { key: 'shifts', label: 'Shifts', icon: CalendarDays, activeClass: 'border-primary bg-primary/10 text-primary', dotClass: 'bg-primary' },
  { key: 'credentials', label: 'Credentials', icon: ShieldCheck, activeClass: 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', dotClass: 'bg-emerald-500' },
  { key: 'subscriptions', label: 'Subscriptions', icon: RefreshCw, activeClass: 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-400', dotClass: 'bg-violet-500' },
];

export function CalendarFilters({ filters, onToggle }: CalendarFiltersProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-muted-foreground mr-1">Layers:</span>
      {FILTER_CONFIG.map(({ key, label, icon: Icon, activeClass, dotClass }) => (
        <button
          key={key}
          onClick={() => onToggle(key)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
            filters[key]
              ? activeClass
              : 'border-border text-muted-foreground hover:bg-muted/50 opacity-60'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${filters[key] ? dotClass : 'bg-muted-foreground/40'}`} />
          {label}
        </button>
      ))}
    </div>
  );
}
