import { X, Globe2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTimezoneAbbr } from '@/lib/shiftTimezone';

interface MixedTzLegendProps {
  tzs: string[];
  onDismiss: () => void;
}

export function MixedTzLegend({ tzs, onDismiss }: MixedTzLegendProps) {
  const abbrs = Array.from(new Set(tzs.map(tz => getTimezoneAbbr(tz)).filter(Boolean)));
  const list =
    abbrs.length === 0
      ? ''
      : abbrs.length === 1
      ? abbrs[0]
      : abbrs.slice(0, -1).join(', ') + ' and ' + abbrs[abbrs.length - 1];

  return (
    <div className="mb-2 flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-2 min-w-0">
        <Globe2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          This week: shifts in {list}. Card times shown in clinic-local time.
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={onDismiss}
      >
        Got it
        <X className="ml-1 h-3 w-3" />
      </Button>
    </div>
  );
}
