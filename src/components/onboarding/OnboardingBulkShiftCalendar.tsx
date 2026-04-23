import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Check, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Facility, Shift, ShiftColor, RateKind, TermsSnapshot } from '@/types';
import { useData } from '@/contexts/DataContext';
import { termsToRates } from '@/components/facilities/RatesEditor';
import { buildBulkRateOptions, type DefaultRate, type BulkRateOption } from '@/lib/onboardingRateMapping';
import { trackOnboarding } from '@/lib/onboardingAnalytics';

interface Props {
  facility: Facility;
  defaultRates: DefaultRate[];
  /** Already-created shifts in this onboarding session (so we can highlight them post-create). */
  createdShiftIds: string[];
  onShiftsCreated: (newIds: string[]) => void;
  /** Called when user clicks "See my invoices →" in the success state. */
  onContinue: () => void;
  /** Sticky-footer renderer: parent-controlled. We expose props for the footer via render-prop. */
  renderFooter: (footer: {
    primaryLabel: string;
    primaryDisabled: boolean;
    onPrimary: () => void;
  }) => React.ReactNode;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildIso(date: Date, time: string): string {
  const [hh, mm] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d.toISOString();
}

function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh + em / 60) - (sh + sm / 60));
}

export function OnboardingBulkShiftCalendar({
  facility,
  defaultRates,
  createdShiftIds,
  onShiftsCreated,
  onContinue,
  renderFooter,
}: Props) {
  const { addShift, terms, shifts } = useData();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [submitting, setSubmitting] = useState(false);
  const [justCreatedCount, setJustCreatedCount] = useState(0);
  const [justCreatedTotal, setJustCreatedTotal] = useState(0);
  const submitGuardRef = useRef(false);

  // Fire view event once on mount.
  useEffect(() => {
    trackOnboarding('onboarding_bulk_shifts_viewed', {
      facility_id: facility.id,
      already_in_session: createdShiftIds.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pull terms snapshot for this facility (set by AddClinicStepper save)
  const facilityTerms: TermsSnapshot | undefined = useMemo(
    () => terms.find(t => t.facility_id === facility.id),
    [terms, facility.id],
  );
  const rateEntries = useMemo(
    () => (facilityTerms ? termsToRates(facilityTerms) : []),
    [facilityTerms],
  );

  const rateOptions: BulkRateOption[] = useMemo(
    () => buildBulkRateOptions({ rateEntries, defaultRates }),
    [rateEntries, defaultRates],
  );

  const [selectedRateId, setSelectedRateId] = useState<string>(() => rateOptions[0]?.id ?? '');
  const selectedRate = rateOptions.find(r => r.id === selectedRateId) ?? rateOptions[0];

  const hours = hoursBetween(startTime, endTime);
  const projectedGross = useMemo(() => {
    if (!selectedRate) return 0;
    if (selectedRate.basis === 'daily') return selectedDates.length * selectedRate.amount;
    return selectedDates.length * hours * selectedRate.amount;
  }, [selectedRate, selectedDates.length, hours]);

  const created = createdShiftIds.length > 0;
  const validTimes = hours > 0;

  // Highlight created shifts on the calendar (read-only secondary highlight)
  const createdShiftDates = useMemo(() => {
    const set = new Set(createdShiftIds);
    return shifts
      .filter(s => set.has(s.id))
      .map(s => new Date(s.start_datetime));
  }, [shifts, createdShiftIds]);

  const handleSelectDates = (d: Date[] | undefined) => {
    const next = d ?? [];
    const wentEmpty = selectedDates.length > 0 && next.length === 0;
    const wentNonEmpty = selectedDates.length === 0 && next.length > 0;
    setSelectedDates(next);
    if (wentNonEmpty || (next.length > 0 && next.length !== selectedDates.length)) {
      // Only fire when a real selection edit happens (not on init).
      trackOnboarding('onboarding_shift_dates_selected', {
        selected_dates_count: next.length,
        rate_basis: selectedRate?.basis ?? null,
      });
    }
    if (wentEmpty) {
      // No-op event; the inline guidance UI already shows. Keep silent.
    }
  };

  const handleSubmit = async () => {
    if (submitGuardRef.current || submitting) return;
    if (selectedDates.length === 0) {
      toast.error('Pick at least one date to add shifts');
      return;
    }
    if (!selectedRate) {
      toast.error('Please choose a rate');
      return;
    }
    if (!validTimes) {
      toast.error('End time must be after start time');
      return;
    }
    submitGuardRef.current = true;
    setSubmitting(true);
    const newIds: string[] = [];
    let totalAdded = 0;
    try {
      // Sort to add chronologically
      const sorted = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      for (const date of sorted) {
        const start = buildIso(date, startTime);
        const end = buildIso(date, endTime);
        const rateApplied = selectedRate.basis === 'daily'
          ? selectedRate.amount
          : selectedRate.amount * hours;
        const rateKind: RateKind = selectedRate.basis === 'daily' ? 'flat' : 'hourly';

        const newShift: Omit<Shift, 'id'> = {
          facility_id: facility.id,
          start_datetime: start,
          end_datetime: end,
          rate_applied: rateApplied,
          notes: '',
          color: 'green' as ShiftColor,
          rate_kind: rateKind,
          hourly_rate: selectedRate.basis === 'hourly' ? selectedRate.amount : null,
          engagement_type_override: null,
          source_name_override: null,
        };
        const created = await addShift(newShift);
        newIds.push(created.id);
        totalAdded += rateApplied;
      }
      setJustCreatedCount(newIds.length);
      setJustCreatedTotal(totalAdded);
      onShiftsCreated(newIds);
      setSelectedDates([]);
      toast.success(`${newIds.length} shift${newIds.length === 1 ? '' : 's'} added`);
      trackOnboarding('onboarding_bulk_shifts_created', {
        shifts_created: newIds.length,
        selected_rate_name: selectedRate.label,
        selected_rate_basis: selectedRate.basis,
        selected_rate_amount: selectedRate.amount,
        hours_per_shift: hours,
        projected_gross: Math.round(totalAdded),
        facility_id: facility.id,
      });
    } catch (e) {
      console.error('bulk shift create failed', e);
      toast.error('Failed to add shifts. Please try again.');
    } finally {
      setSubmitting(false);
      submitGuardRef.current = false;
    }
  };

  // Footer wiring
  const footer = created
    ? {
        primaryLabel: 'See my invoices →',
        primaryDisabled: false,
        onPrimary: onContinue,
      }
    : {
        primaryLabel: submitting
          ? 'Adding…'
          : `Add ${selectedDates.length} shift${selectedDates.length === 1 ? '' : 's'}`,
        primaryDisabled: submitting || selectedDates.length === 0 || !selectedRate || !validTimes,
        onPrimary: handleSubmit,
      };

  return (
    <>
      <div className="space-y-5">
        {/* Aha #1 callout */}
        <div className="rounded-xl border border-primary/30 bg-primary/[0.06] px-4 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            You can add multiple shifts in one go
          </p>
        </div>

        {/* Success banner (after creation) */}
        {created && (
          <div className="rounded-xl border border-primary/40 bg-primary/[0.08] px-4 py-3">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">
                {justCreatedCount} shift{justCreatedCount === 1 ? '' : 's'} saved · Projected ${justCreatedTotal.toLocaleString()}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Your shifts are saved. Next, see how Locum Ops prepares invoices for you.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground font-[Manrope]">
            Pick the dates you'll work at <span className="text-primary">{facility.name}</span>
          </h2>
          {!created && (
            <p className="text-sm text-muted-foreground">
              Select one or many dates. We'll create a shift for each — same time, same rate.
            </p>
          )}
        </div>

        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="flex justify-center">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(d) => setSelectedDates(d ?? [])}
                modifiers={{ created: createdShiftDates }}
                modifiersClassNames={{
                  created: 'bg-primary/15 text-foreground font-semibold',
                }}
                className={cn('p-3 pointer-events-auto rounded-md border-0')}
              />
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Selected:{' '}
              <span className="font-semibold text-foreground">
                {selectedDates.length} date{selectedDates.length === 1 ? '' : 's'}
              </span>
            </div>
          </CardContent>
        </Card>

        {!created && (
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Start time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End time</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              {rateOptions.length > 0 ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Rate</Label>
                  <Select value={selectedRateId} onValueChange={setSelectedRateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a rate" />
                    </SelectTrigger>
                    <SelectContent>
                      {rateOptions.map(opt => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-xs text-destructive">
                  No rates available. Go back to set up your Rate Card.
                </p>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                <span className="text-sm text-muted-foreground">Projected gross</span>
                <span className="text-lg font-bold text-foreground tabular-nums">
                  ${projectedGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {renderFooter(footer)}
    </>
  );
}
