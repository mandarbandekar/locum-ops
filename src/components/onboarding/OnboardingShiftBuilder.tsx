import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, subDays, parseISO } from 'date-fns';
import { Check, Plus, Sparkles, Trash2 } from 'lucide-react';
import { BreakPolicySelector } from '@/components/facilities/BreakPolicySelector';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { mapDefaultRatesToRateEntries } from '@/lib/onboardingRateMapping';
import type { Facility, Shift, TermsSnapshot } from '@/types';

interface Props {
  facilities: Facility[];
  shifts: Shift[];
  terms: TermsSnapshot[];
  addShift: (shift: Omit<Shift, 'id'>) => Promise<Shift>;
  deleteShift: (id: string) => Promise<void>;
  /** Shifts created during this onboarding session (used for the "Running total" + list). */
  sessionShiftIds: string[];
  /** Push a new shift id onto the session list. */
  onShiftAdded: (id: string) => void;
}

export function OnboardingShiftBuilder({
  facilities,
  shifts,
  terms,
  addShift,
  deleteShift,
  sessionShiftIds,
  onShiftAdded,
}: Props) {
  const { profile } = useUserProfile();
  const defaultFacility = facilities[0];
  const rateCardFirst = useMemo(() => {
    const entries = mapDefaultRatesToRateEntries((profile?.default_rates ?? []) as any);
    return entries[0]?.amount ?? null;
  }, [profile?.default_rates]);
  const defaultRate = defaultFacility
    ? (terms.find(t => t.facility_id === defaultFacility.id)?.weekday_rate || rateCardFirst || 650)
    : (rateCardFirst || 650);

  const sessionShifts = useMemo(
    () =>
      sessionShiftIds
        .map(id => shifts.find(s => s.id === id))
        .filter((s): s is Shift => !!s)
        .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime)),
    [sessionShiftIds, shifts],
  );

  // Derive next default date: most recent shift date − 1, otherwise yesterday.
  const nextDefaultDate = useMemo(() => {
    if (sessionShifts.length === 0) return format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const earliest = sessionShifts[0].start_datetime.slice(0, 10);
    return format(subDays(parseISO(earliest), 1), 'yyyy-MM-dd');
  }, [sessionShifts]);

  const [selectedFacilityId, setSelectedFacilityId] = useState(defaultFacility?.id || '');
  const [shiftDate, setShiftDate] = useState(nextDefaultDate);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [rate, setRate] = useState(defaultRate.toString());
  const [breakMinutes, setBreakMinutes] = useState<number | null>(
    defaultFacility?.default_break_minutes ?? null,
  );
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const selectedFacility = facilities.find(f => f.id === selectedFacilityId) || defaultFacility;

  // When the user switches facility, sync the break default to that clinic's policy.
  useEffect(() => {
    setBreakMinutes(selectedFacility?.default_break_minutes ?? null);
  }, [selectedFacility?.id]);

  // Keep the date input in sync with the next default after each save.
  // We only push it forward when the user hasn't manually changed it from the previous default.
  const lastAutoDateRef = useRef(nextDefaultDate);
  if (lastAutoDateRef.current !== nextDefaultDate && shiftDate === lastAutoDateRef.current) {
    lastAutoDateRef.current = nextDefaultDate;
    setShiftDate(nextDefaultDate);
  }

  const runningTotal = sessionShifts.reduce((sum, s) => sum + (s.rate_applied || 0), 0);

  const handleAdd = async () => {
    if (!selectedFacility || submitting) return;
    setSubmitting(true);
    try {
      const startDt = new Date(`${shiftDate}T${startTime}:00`);
      const endDt = new Date(`${shiftDate}T${endTime}:00`);
      const created = await addShift({
        facility_id: selectedFacility.id,
        start_datetime: startDt.toISOString(),
        end_datetime: endDt.toISOString(),
        rate_applied: parseFloat(rate) || 650,
        notes: '',
        color: 'blue',
        break_minutes: breakMinutes,
      });
      onShiftAdded(created.id);
      // Reset just the date forward; keep rate/time so users rapid-fire.
      const nextDate = format(subDays(parseISO(shiftDate), 1), 'yyyy-MM-dd');
      lastAutoDateRef.current = nextDate;
      setShiftDate(nextDate);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
      console.error('Failed to save shift', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await deleteShift(id);
    } catch (e) {
      console.error('Failed to delete shift', e);
    }
  };

  const formatShiftRow = (s: Shift) => {
    const start = new Date(s.start_datetime);
    const end = new Date(s.end_datetime);
    return {
      date: format(start, 'MMM d'),
      time: `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`,
      amount: `$${(s.rate_applied || 0).toLocaleString()}`,
    };
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground font-[Manrope]">
          Log shifts at {selectedFacility?.name || 'this clinic'}
        </h2>
        <p className="text-muted-foreground">
          Add every shift you've worked here recently — each one becomes a billable line on your invoice.
          Most relief vets log 3–5 to start.
        </p>
      </div>

      {/* Logged shifts list */}
      {sessionShifts.length > 0 && (
        <div className="space-y-2">
          {sessionShifts.map((s, i) => {
            const r = formatShiftRow(s);
            return (
              <Card
                key={s.id}
                className="border-primary/30 bg-primary/[0.04] animate-slide-up"
                style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
              >
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {r.date} · {r.time}
                    </p>
                    <p className="text-xs text-muted-foreground">Shift {i + 1}</p>
                  </div>
                  <span className="font-semibold text-foreground tabular-nums">{r.amount}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(s.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    aria-label="Remove shift"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add-shift form */}
      <Card ref={formRef as any} className="border-dashed">
        <CardContent className="py-4 px-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Plus className="h-3 w-3" /> Add {sessionShifts.length === 0 ? 'shift' : `shift ${sessionShifts.length + 1}`}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Shift date</Label>
              <Input type="date" value={shiftDate} onChange={e => setShiftDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Day rate ($)</Label>
              <Input
                type="number"
                value={rate}
                onChange={e => setRate(e.target.value)}
                placeholder="650"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start time</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End time</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Break policy</Label>
            <BreakPolicySelector
              value={breakMinutes}
              onChange={setBreakMinutes}
              compact
              helper={
                selectedFacility?.default_break_minutes != null
                  ? `Defaulted from ${selectedFacility.name}'s clinic policy. Adjust if this shift was different.`
                  : 'Unpaid breaks are deducted from billable time.'
              }
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleAdd}
            disabled={!selectedFacility || submitting}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {submitting ? 'Saving…' : sessionShifts.length === 0 ? 'Add shift' : 'Add another shift'}
          </Button>
        </CardContent>
      </Card>

      {/* Running total */}
      {sessionShifts.length > 0 && (
        <div
          key={sessionShifts.length}
          className="flex items-center justify-between rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3 animate-slide-up"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Running total</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary">
              {sessionShifts.length} {sessionShifts.length === 1 ? 'shift' : 'shifts'}
            </Badge>
            <span className="text-lg font-bold text-foreground tabular-nums animate-scale-up">
              ${runningTotal.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Hidden marker so OnboardingPage can read shift count without prop drilling */}
      <input
        type="hidden"
        id="onboarding-shift-builder-count"
        data-count={sessionShifts.length}
        data-total={runningTotal}
      />
    </div>
  );
}
