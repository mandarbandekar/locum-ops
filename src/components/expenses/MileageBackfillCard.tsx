import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { History, Loader2, CheckCircle2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useBackfillMileage, type BackfillShift } from '@/hooks/useBackfillMileage';

const DISMISSED_KEY = 'locumops_mileage_backfill_dismissed';

interface Props {
  onComplete: () => void;
}

export default function MileageBackfillCard({ onComplete }: Props) {
  const [dismissed, setDismissed] = useState(
    () => !!localStorage.getItem(DISMISSED_KEY)
  );
  const { scan, confirm, reset, scanning, confirming, eligible, error } = useBackfillMileage(onComplete);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  const fmt = (cents: number) =>
    '$' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // When eligible shifts arrive, auto-select all
  useMemo(() => {
    if (eligible && eligible.length > 0) {
      setSelected(new Set(eligible.map(s => s.id)));
      setExpanded(true);
    }
  }, [eligible]);

  const totalMiles = useMemo(() =>
    (eligible || []).filter(s => selected.has(s.id)).reduce((a, s) => a + s.estimated_miles, 0),
  [eligible, selected]);

  const totalDeduction = useMemo(() =>
    (eligible || []).filter(s => selected.has(s.id)).reduce((a, s) => a + s.estimated_deduction_cents, 0),
  [eligible, selected]);

  if (dismissed && !eligible) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, '1');
    reset();
  };

  const toggleAll = () => {
    if (!eligible) return;
    if (selected.size === eligible.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligible.map(s => s.id)));
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  // Initial state — no scan yet
  if (!eligible) {
    return (
      <Card className="border-dashed border-primary/30">
        <CardContent className="py-4 px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <History className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Have past shifts?</p>
                <p className="text-[11px] text-muted-foreground">
                  Import mileage for previously logged shifts automatically
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5"
                onClick={scan}
                disabled={scanning}
              >
                {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <History className="h-3.5 w-3.5" />}
                {scanning ? 'Scanning…' : 'Scan Past Shifts'}
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleDismiss}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  // No eligible shifts
  if (eligible.length === 0) {
    return (
      <Card className="border-muted">
        <CardContent className="py-4 px-4 flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium">All shifts already tracked</p>
            <p className="text-[11px] text-muted-foreground">No additional mileage entries to import</p>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 ml-auto" onClick={handleDismiss}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show eligible shifts
  const displayShifts = expanded ? eligible : eligible.slice(0, 3);

  return (
    <Card className="border-primary/30">
      <CardContent className="py-4 px-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm font-medium">
              {eligible.length} shift{eligible.length !== 1 ? 's' : ''} eligible for mileage
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={toggleAll}>
              {selected.size === eligible.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleDismiss}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          {displayShifts.map(s => (
            <label
              key={s.id}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
            >
              <Checkbox
                checked={selected.has(s.id)}
                onCheckedChange={() => toggle(s.id)}
              />
              <span className="flex-1 min-w-0 truncate">{s.facility_name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(s.shift_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {s.estimated_miles} mi
              </Badge>
              <span className="text-xs font-medium shrink-0">{fmt(s.estimated_deduction_cents)}</span>
            </label>
          ))}
        </div>

        {eligible.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs w-full gap-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Show fewer' : `Show ${eligible.length - 3} more`}
          </Button>
        )}

        <div className="flex items-center justify-between pt-1 border-t">
          <div className="text-xs text-muted-foreground">
            {selected.size} selected · {totalMiles.toLocaleString()} mi · {fmt(totalDeduction)} deduction
          </div>
          <Button
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => confirm(Array.from(selected))}
            disabled={confirming || selected.size === 0}
          >
            {confirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {confirming ? 'Generating…' : 'Generate Mileage Entries'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
