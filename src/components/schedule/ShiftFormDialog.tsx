import { useState, useMemo, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertTriangle, Trash2, CalendarDays, DollarSign, Clock, Building2, StickyNote, Palette, Plus, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { AddFacilityDialog } from '@/components/AddFacilityDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { SHIFT_COLORS, ShiftColor, TermsSnapshot, Shift, BLOCK_TYPES, BlockType, RateKind } from '@/types';
import { detectShiftConflicts } from '@/lib/businessLogic';
import { cn } from '@/lib/utils';
import { termsToRates, RateEntry } from '@/components/facilities/RatesEditor';
import { useData } from '@/contexts/DataContext';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  ENGAGEMENT_LABELS,
  THIRD_PARTY_PRESETS,
  W2_EMPLOYER_PRESETS,
  getShiftEngagementHelperText,
  type EngagementType,
} from '@/lib/engagementOptions';

interface ShiftFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  facilities: any[];
  shifts: any[];
  terms: TermsSnapshot[];
  existing?: any;
  onSave: (s: any) => void | Promise<void>;
  onDelete?: (id: string) => void;
  embedded?: boolean;
  defaultDate?: Date;
  defaultStartTime?: string;
  defaultMonth?: Date;
}

function buildRateOptions(terms: TermsSnapshot[], facilityId: string): RateEntry[] {
  const facilityTerms = terms.find(t => t.facility_id === facilityId);
  if (!facilityTerms) return [];
  return termsToRates(facilityTerms).filter(r => r.amount > 0);
}

const COLOR_MAP: Record<ShiftColor, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  teal: 'bg-teal-500',
  yellow: 'bg-yellow-500',
};

const STEP_LABELS = ['Facility', 'Schedule', 'Details'] as const;

/* ─── Step Indicator ─── */
function StepIndicator({ step, isMobile }: { step: number; isMobile: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-3">
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const isActive = num === step;
        const isDone = num < step;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <div className={cn("h-px w-5 sm:w-8", isDone ? 'bg-primary' : 'bg-border')} />}
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "flex items-center justify-center rounded-full text-xs font-semibold transition-colors shrink-0",
                "h-6 w-6",
                isDone && 'bg-primary text-primary-foreground',
                isActive && 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1 ring-offset-background',
                !isActive && !isDone && 'bg-muted text-muted-foreground',
              )}>
                {isDone ? <Check className="h-3 w-3" /> : num}
              </div>
              {!isMobile && (
                <span className={cn(
                  "text-xs font-medium",
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                )}>{label}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ShiftFormDialog({ open, onOpenChange, facilities, shifts, terms, existing, onSave, onDelete, embedded, defaultDate, defaultStartTime, defaultMonth }: ShiftFormDialogProps) {
  const [facilityId, setFacilityId] = useState(existing?.facility_id || facilities[0]?.id || '');
  const [selectedDates, setSelectedDates] = useState<Date[]>(
    existing ? [new Date(existing.start_datetime)] : defaultDate ? [defaultDate] : []
  );
  const [startTime, setStartTime] = useState(existing ? format(new Date(existing.start_datetime), 'HH:mm') : defaultStartTime || '08:00');
  const [endTime, setEndTime] = useState(existing ? format(new Date(existing.end_datetime), 'HH:mm') : defaultStartTime ? format(new Date(2026, 0, 1, parseInt(defaultStartTime.split(':')[0]) + 1, parseInt(defaultStartTime.split(':')[1] || '0')), 'HH:mm') : '18:00');
  const [rate, setRate] = useState(existing?.rate_applied?.toString() || '');
  const [selectedRateKey, setSelectedRateKey] = useState<string>('');
  const [isCustomRate, setIsCustomRate] = useState(false);
  const [customRateLabel, setCustomRateLabel] = useState('');
  const [customRateKind, setCustomRateKind] = useState<RateKind>(existing?.rate_kind === 'hourly' ? 'hourly' : 'flat');
  const [saveCustomRate, setSaveCustomRate] = useState(true);
  const [notes, setNotes] = useState(existing?.notes || '');
  const [color, setColor] = useState<ShiftColor>(existing?.color || 'blue');
  const [showNotes, setShowNotes] = useState(!!existing?.notes);
  const [showAddFacility, setShowAddFacility] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const isMobile = useIsMobile();
  const { updateTerms, timeBlocks } = useData();
  const isMultiMode = !existing;

  // Engagement override state (per-shift)
  const facilityForEngagement = facilities.find(f => f.id === facilityId);
  const facilityDefaultEngagement: EngagementType = (facilityForEngagement?.engagement_type || 'direct') as EngagementType;
  const facilityDefaultSource: string | null = facilityForEngagement?.source_name ?? null;
  const [showEngagementOverride, setShowEngagementOverride] = useState(false);
  const [engagementOverride, setEngagementOverride] = useState<EngagementType>(
    (existing?.engagement_type_override as EngagementType) || facilityDefaultEngagement,
  );
  const [sourceOverride, setSourceOverride] = useState<string>(
    existing?.source_name_override ?? facilityDefaultSource ?? '',
  );

  // Reset all form state when dialog opens, so stale values from a previous
  // session don't leak into a new shift entry (or a different shift edit).
  useEffect(() => {
    if (!open) return;
    if (existing) {
      setFacilityId(existing.facility_id || facilities[0]?.id || '');
      setSelectedDates([new Date(existing.start_datetime)]);
      setStartTime(format(new Date(existing.start_datetime), 'HH:mm'));
      setEndTime(format(new Date(existing.end_datetime), 'HH:mm'));
      setRate(existing.rate_applied?.toString() || '');
      setNotes(existing.notes || '');
      setColor(existing.color || 'blue');
      setShowNotes(!!existing.notes);
      setShowEngagementOverride(!!existing.engagement_type_override);
      const fac = facilities.find(f => f.id === existing.facility_id);
      setEngagementOverride(
        (existing.engagement_type_override as EngagementType) || (fac?.engagement_type as EngagementType) || 'direct',
      );
      setSourceOverride(existing.source_name_override ?? fac?.source_name ?? '');
    } else {
      setFacilityId(facilities[0]?.id || '');
      setSelectedDates(defaultDate ? [defaultDate] : []);
      setStartTime(defaultStartTime || '08:00');
      setEndTime(
        defaultStartTime
          ? format(new Date(2026, 0, 1, parseInt(defaultStartTime.split(':')[0]) + 1, parseInt(defaultStartTime.split(':')[1] || '0')), 'HH:mm')
          : '18:00'
      );
      setRate('');
      setNotes('');
      setColor('blue');
      setShowNotes(false);
      const fac = facilities.find(f => f.id === (facilities[0]?.id || ''));
      setShowEngagementOverride(false);
      setEngagementOverride((fac?.engagement_type as EngagementType) || 'direct');
      setSourceOverride(fac?.source_name ?? '');
    }
    setSelectedRateKey('');
    setIsCustomRate(false);
    setCustomRateLabel('');
    setCustomRateKind(existing?.rate_kind === 'hourly' ? 'hourly' : 'flat');
    setSaveCustomRate(true);
    setShowAddFacility(false);
    setIsSubmitting(false);
    setStep(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing, defaultDate, defaultStartTime]);

  const rateOptions = useMemo(() => buildRateOptions(terms, facilityId), [terms, facilityId]);

  // Currently selected rate's kind. For preset rates, derived from the selected option.
  // For custom rates, derived from `customRateKind`. Defaults to 'flat' when no rate yet.
  const selectedRateOption: RateEntry | null = useMemo(() => {
    if (isCustomRate) return null;
    if (!selectedRateKey?.startsWith('rate-')) return null;
    const idx = parseInt(selectedRateKey.replace('rate-', ''), 10);
    return rateOptions[idx] || null;
  }, [isCustomRate, selectedRateKey, rateOptions]);

  const activeRateKind: RateKind = isCustomRate
    ? customRateKind
    : (selectedRateOption?.kind || 'flat');

  // Auto-select first rate when entering step 3 if no rate set
  useEffect(() => {
    if (step === 3 && !rate && rateOptions.length > 0) {
      setRate(rateOptions[0].amount.toString());
      setSelectedRateKey('rate-0');
    }
  }, [step, rate, rateOptions]);

  // Calculated hours from current start/end times (for hourly preview).
  // Rounding rule: nearest quarter hour (0.25), the standard payroll convention.
  // Returns null when inputs are missing/invalid so callers can distinguish
  // "not entered yet" from "0 hours".
  const calculatedHours = useMemo<number | null>(() => {
    if (!startTime || !endTime) return null;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if ([sh, sm, eh, em].some(n => Number.isNaN(n))) return null;
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60; // overnight
    const rawHours = mins / 60;
    // Round to nearest quarter hour
    return Math.round(rawHours * 4) / 4;
  }, [startTime, endTime]);

  // Validation: hourly shifts require a usable duration (>0, ≤24, valid times).
  const hoursInvalidReason = useMemo<string | null>(() => {
    if (activeRateKind !== 'hourly') return null;
    if (calculatedHours === null) return 'Enter a valid start and end time.';
    if (calculatedHours <= 0) return 'End time must be after start time.';
    if (calculatedHours > 24) return 'Shift cannot exceed 24 hours.';
    return null;
  }, [activeRateKind, calculatedHours]);
  const isHoursValid = hoursInvalidReason === null;

  // For hourly rates: rate_applied = hours × hourly_rate (rounded to cents).
  // For flat: rate is the total.
  const computedRateApplied = useMemo(() => {
    const rateNum = Number(rate) || 0;
    if (activeRateKind === 'hourly') {
      const hrs = calculatedHours ?? 0;
      return Math.round(rateNum * hrs * 100) / 100;
    }
    return rateNum;
  }, [rate, activeRateKind, calculatedHours]);

  // Display helper: format hours dropping trailing zeros (e.g. 8 / 8.5 / 8.25).
  const formatHours = (h: number | null) => {
    if (h === null) return '—';
    return h % 1 === 0 ? h.toFixed(0) : h.toString();
  };

  const bookedDateObjects = useMemo(() =>
    shifts.map(s => {
      const d = new Date(s.start_datetime);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }),
  [shifts]);

  // Map of YYYY-MM-DD → block type for time-blocked days (vacation, family, etc.)
  const blockedDateIconMap = useMemo(() => {
    const map = new Map<string, BlockType>();
    (timeBlocks || []).forEach(tb => {
      const start = new Date(tb.start_datetime);
      const end = new Date(tb.end_datetime);
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (cur.getTime() <= last.getTime()) {
        const key = `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`;
        if (!map.has(key)) map.set(key, tb.block_type);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [timeBlocks]);

  const blockedDateObjects = useMemo(() => {
    return Array.from(blockedDateIconMap.keys()).map(k => {
      const [y, m, d] = k.split('-').map(Number);
      return new Date(y, m, d);
    });
  }, [blockedDateIconMap]);

  const blockTypeIconLookup = useMemo(() => {
    const m: Record<string, string> = {};
    BLOCK_TYPES.forEach(b => { m[b.value] = b.icon; });
    return m;
  }, []);

  const usedBlockTypes = useMemo(() => {
    const set = new Set<BlockType>();
    blockedDateIconMap.forEach(v => set.add(v));
    return BLOCK_TYPES.filter(b => set.has(b.value));
  }, [blockedDateIconMap]);

  const handleFacilityChange = (newFacilityId: string) => {
    setFacilityId(newFacilityId);
    setSelectedRateKey('');
    setIsCustomRate(false);
    const newOptions = buildRateOptions(terms, newFacilityId);
    if (newOptions.length > 0 && !newOptions.some(o => o.amount.toString() === rate)) {
      setRate(newOptions[0].amount.toString());
      setSelectedRateKey('rate-0');
    }
    // Reset engagement override when facility changes — defaults inherit from new facility
    const newFac = facilities.find(f => f.id === newFacilityId);
    setShowEngagementOverride(false);
    setEngagementOverride((newFac?.engagement_type as EngagementType) || 'direct');
    setSourceOverride(newFac?.source_name ?? '');
  };

  // Compute payload override values: only set if user picked something different
  // from the facility default. Otherwise clear so future facility changes propagate.
  const computeOverridePayload = () => {
    const fac = facilities.find(f => f.id === facilityId);
    const facType = (fac?.engagement_type as EngagementType) || 'direct';
    const facSource = fac?.source_name ?? null;
    if (!showEngagementOverride) {
      return { engagement_type_override: null, source_name_override: null };
    }
    const sameType = engagementOverride === facType;
    const trimmedSource = engagementOverride === 'direct' ? null : (sourceOverride.trim() || null);
    const sameSource = (trimmedSource ?? null) === (facSource ?? null);
    if (sameType && sameSource) {
      return { engagement_type_override: null, source_name_override: null };
    }
    return {
      engagement_type_override: engagementOverride,
      source_name_override: trimmedSource,
    };
  };

  const conflicts = useMemo(() => {
    if (isSubmitting || selectedDates.length === 0 || !facilityId || !startTime || !endTime) return [];
    const allConflicts: Shift[] = [];
    const seen = new Set<string>();
    for (const d of selectedDates) {
      const dateStr = format(d, 'yyyy-MM-dd');
      const startDt = `${dateStr}T${startTime}:00`;
      const endDt = `${dateStr}T${endTime}:00`;
      for (const c of detectShiftConflicts(shifts, { start_datetime: startDt, end_datetime: endDt, id: existing?.id })) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          allConflicts.push(c);
        }
      }
    }
    return allConflicts;
  }, [shifts, selectedDates, startTime, endTime, existing?.id, facilityId, isSubmitting]);

  const saveCustomRateToTerms = useCallback(async () => {
    if (!isCustomRate || !saveCustomRate || !rate || Number(rate) <= 0) return;
    const label = customRateLabel.trim() || `Custom $${Number(rate).toLocaleString()}`;
    const facilityTerms = terms.find(t => t.facility_id === facilityId);
    if (facilityTerms) {
      const existingCustom = facilityTerms.custom_rates || [];
      if (existingCustom.some(cr => cr.amount === Number(rate) && cr.label === label && (cr.kind || 'flat') === customRateKind)) return;
      await updateTerms({
        ...facilityTerms,
        custom_rates: [...existingCustom, { label, amount: Number(rate), kind: customRateKind }],
      });
      toast.success(`Custom rate "${label}" saved to facility`);
    }
  }, [isCustomRate, saveCustomRate, rate, customRateLabel, customRateKind, facilityId, terms, updateTerms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hoursInvalidReason) {
      toast.error(hoursInvalidReason);
      return;
    }
    setIsSubmitting(true);
    try {
      await saveCustomRateToTerms();
      const overridePayload = computeOverridePayload();
      const ratePayload = activeRateKind === 'hourly'
        ? { rate_kind: 'hourly' as const, hourly_rate: Number(rate) || 0, rate_applied: computedRateApplied }
        : { rate_kind: 'flat' as const, hourly_rate: null, rate_applied: Number(rate) };
      if (existing) {
        const date = format(selectedDates[0] || new Date(), 'yyyy-MM-dd');
        await onSave({
          ...existing,
          facility_id: facilityId,
          start_datetime: new Date(`${date}T${startTime}:00`).toISOString(),
          end_datetime: new Date(`${date}T${endTime}:00`).toISOString(),
          ...ratePayload,
          notes, color,
          ...overridePayload,
        });
      } else {
        const orderedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
        for (const d of orderedDates) {
          const date = format(d, 'yyyy-MM-dd');
          await onSave({
            facility_id: facilityId,
            start_datetime: new Date(`${date}T${startTime}:00`).toISOString(),
            end_datetime: new Date(`${date}T${endTime}:00`).toISOString(),
            ...ratePayload,
            notes, color,
            ...overridePayload,
          });
        }
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save shift(s):', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const facilityName = facilities.find(f => f.id === facilityId)?.name || '';

  /* ─── Engagement helper line + per-shift override ─── */
  const renderEngagementHelper = () => {
    const fac = facilities.find(f => f.id === facilityId);
    if (!fac) return null;
    const helper = getShiftEngagementHelperText({
      engagement_type: (fac.engagement_type || 'direct') as EngagementType,
      source_name: fac.source_name ?? null,
      tax_form_type: (fac.tax_form_type ?? null) as 'w2' | '1099' | null,
    });
    const presets =
      engagementOverride === 'third_party'
        ? THIRD_PARTY_PRESETS
        : engagementOverride === 'w2'
        ? W2_EMPLOYER_PRESETS
        : [];
    const isOtherSource =
      engagementOverride !== 'direct' &&
      sourceOverride !== '' &&
      !(presets as readonly string[]).includes(sourceOverride);
    return (
      <div className="rounded-md bg-muted/50 border border-border px-3 py-2 text-[11px] leading-snug">
        <div className="flex items-start justify-between gap-2">
          <p className="text-muted-foreground flex-1">{helper}</p>
          <button
            type="button"
            onClick={() => setShowEngagementOverride(s => !s)}
            className="text-primary hover:underline font-medium shrink-0"
          >
            {showEngagementOverride ? 'Hide' : 'Change for this shift only'}
          </button>
        </div>
        {showEngagementOverride && (
          <div className="mt-2 space-y-2 pt-2 border-t border-border/60">
            <div className="grid grid-cols-3 gap-1.5">
              {(['direct', 'third_party', 'w2'] as EngagementType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setEngagementOverride(t);
                    if (t === 'direct') setSourceOverride('');
                  }}
                  className={cn(
                    'rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors text-center',
                    engagementOverride === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-muted',
                  )}
                >
                  {ENGAGEMENT_LABELS[t]}
                </button>
              ))}
            </div>
            {engagementOverride !== 'direct' && (
              <div className="space-y-1.5">
                <Select
                  value={isOtherSource ? '__other__' : (sourceOverride || '')}
                  onValueChange={v => {
                    if (v === '__other__') setSourceOverride(' ');
                    else setSourceOverride(v);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={engagementOverride === 'w2' ? 'Employer name' : 'Platform / agency'} />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                    <SelectItem value="__other__">Other…</SelectItem>
                  </SelectContent>
                </Select>
                {isOtherSource && (
                  <Input
                    value={sourceOverride}
                    onChange={e => setSourceOverride(e.target.value)}
                    placeholder={engagementOverride === 'w2' ? 'Employer name' : 'Platform / agency name'}
                    className="h-8 text-xs"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ─── Step 1: Facility ─── */
  const renderStep1 = () => (
    <div className="flex flex-col gap-3">
      <div className="text-center mb-1">
        <p className="text-sm text-muted-foreground">Which facility is this shift at?</p>
      </div>
      <div>
        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" />
          Facility
        </Label>
        <Select value={facilityId} onValueChange={(v) => {
          if (v === '__add_new__') {
            setShowAddFacility(true);
            return;
          }
          handleFacilityChange(v);
        }}>
          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            {facilities.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
            <SelectItem value="__add_new__" className="text-primary font-medium">
              <span className="flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add New Facility
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <AddFacilityDialog
          open={showAddFacility}
          onOpenChange={setShowAddFacility}
          onCreated={(newId) => handleFacilityChange(newId)}
        />
      </div>
      {renderEngagementHelper()}
      <div className="flex justify-end pt-2">
        <Button type="button" onClick={() => setStep(2)} disabled={!facilityId} className="h-10 min-w-[120px]">
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );

  /* ─── Step 2: Schedule ─── */
  const renderStep2 = () => (
    <div className="flex flex-col gap-3">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Select dates for <span className="font-medium text-foreground">{facilityName}</span>
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">Tap multiple dates to batch-schedule shifts</p>
      </div>

      {/* Calendar with selected count */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="border border-border rounded-xl overflow-hidden">
          <Calendar
            mode="multiple"
            selected={selectedDates}
            onSelect={(dates) => setSelectedDates(dates || [])}
            defaultMonth={defaultMonth ?? selectedDates[0] ?? defaultDate ?? new Date()}
            modifiers={{ booked: bookedDateObjects, blocked: blockedDateObjects }}
            modifiersClassNames={{
              booked: "bg-red-100 text-red-700 font-semibold hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/50 aria-selected:!bg-primary aria-selected:!text-primary-foreground",
              blocked: "bg-amber-50 dark:bg-amber-950/30 aria-selected:!bg-primary aria-selected:!text-primary-foreground",
            }}
            components={{
              DayContent: ({ date }) => {
                const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                const blockType = blockedDateIconMap.get(key);
                if (blockType) {
                  return (
                    <span className="relative flex items-center justify-center w-full h-full">
                      <span>{date.getDate()}</span>
                      <span className="absolute -top-0.5 -right-0.5 text-[9px] leading-none pointer-events-none">
                        {blockTypeIconLookup[blockType]}
                      </span>
                    </span>
                  );
                }
                return <>{date.getDate()}</>;
              },
            }}
            className={cn("p-1 pointer-events-auto")}
          />
        </div>
        {selectedDates.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold h-5 min-w-[20px] px-1.5">{selectedDates.length}</span>
            <span className="text-xs text-muted-foreground">
              {[...selectedDates].sort((a, b) => a.getTime() - b.getTime()).map(d => format(d, 'MMM d')).join(', ')}
            </span>
          </div>
        ) : (
          <p className="text-xs text-amber-600 dark:text-amber-400">Tap dates to select</p>
        )}
        {bookedDateObjects.length > 0 && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-200 border border-red-300 dark:bg-red-900/60 dark:border-red-700" />
            <span className="text-[11px] text-muted-foreground">Already has a shift</span>
        </div>
        {activeRateKind === 'hourly' && hoursInvalidReason && (
          <p className="mt-1.5 text-[11px] text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> {hoursInvalidReason}
          </p>
        )}
        )}
        {usedBlockTypes.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-0.5">
            {usedBlockTypes.map(b => (
              <span key={b.value} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="text-sm leading-none">{b.icon}</span>
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Time row */}
      <div>
        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Time
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] text-muted-foreground">Start</span>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-10" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">End</span>
            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-10" />
          </div>
        </div>
      </div>

      {/* Conflict warnings */}
      {conflicts.length > 0 && (
        <div className="flex items-start gap-1.5 p-2 rounded-md bg-destructive/10 text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="text-[11px] leading-snug">
            <p className="font-semibold">Scheduling conflict{conflicts.length > 1 ? 's' : ''}:</p>
            {conflicts.map(c => (
              <p key={c.id} className="mt-0.5">
                {facilities.find((f: any) => f.id === c.facility_id)?.name || 'Unknown'} — {format(new Date(c.start_datetime), 'MMM d, h:mm a')} to {format(new Date(c.end_datetime), 'h:mm a')}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-10 min-w-[100px]">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button type="button" onClick={() => setStep(3)} disabled={selectedDates.length === 0} className="flex-1 h-10">
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );

  /* ─── Step 3: Details + Review ─── */
  const renderStep3 = () => (
    <div className="flex flex-col gap-3">
      {/* Rate */}
      <div>
        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5" />
          Rate
        </Label>
        {rateOptions.length > 0 && !isCustomRate ? (
          <div className="space-y-2">
            <Select
              value={selectedRateKey || (rateOptions.length > 0 && rate ? (rateOptions.findIndex(o => o.amount.toString() === rate) >= 0 ? `rate-${rateOptions.findIndex(o => o.amount.toString() === rate)}` : 'custom') : 'custom')}
              onValueChange={(v) => {
                if (v === 'custom') {
                  setIsCustomRate(true);
                  setSelectedRateKey('');
                  setRate('');
                } else {
                  const idx = parseInt(v.replace('rate-', ''));
                  const opt = rateOptions[idx];
                  if (opt) {
                    setRate(opt.amount.toString());
                    setSelectedRateKey(v);
                    setIsCustomRate(false);
                  }
                }
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select rate" />
              </SelectTrigger>
              <SelectContent>
                {rateOptions.map((opt, i) => (
                  <SelectItem key={`rate-${i}`} value={`rate-${i}`}>
                    {opt.label} — ${opt.amount.toLocaleString()}{opt.kind === 'hourly' ? '/hr' : '/day'}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {activeRateKind === 'hourly' && Number(rate) > 0 && isHoursValid && (
              <p className="text-[11px] text-muted-foreground">
                {formatHours(calculatedHours)} hrs × ${Number(rate).toLocaleString()}/hr ={' '}
                <span className="font-semibold text-foreground">${computedRateApplied.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
            )}
            {activeRateKind === 'hourly' && hoursInvalidReason && (
              <p className="text-[11px] text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {hoursInvalidReason}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              type="text"
              value={customRateLabel}
              onChange={e => setCustomRateLabel(e.target.value)}
              placeholder="Rate label (e.g. Emergency Rate)"
              className="h-9 text-sm"
            />
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md border border-border overflow-hidden h-9" role="group">
                {(['flat', 'hourly'] as RateKind[]).map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setCustomRateKind(k)}
                    className={cn(
                      'px-3 text-xs font-medium transition-colors',
                      customRateKind === k
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {k === 'flat' ? 'Flat' : 'Hourly'}
                  </button>
                ))}
              </div>
              <div className="relative flex-1">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="0" min={0} className="pl-7 pr-10 h-10" />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                  {customRateKind === 'hourly' ? '/hr' : '/day'}
                </span>
              </div>
            </div>
            {customRateKind === 'hourly' && Number(rate) > 0 && isHoursValid && (
              <p className="text-[11px] text-muted-foreground">
                {formatHours(calculatedHours)} hrs × ${Number(rate).toLocaleString()}/hr ={' '}
                <span className="font-semibold text-foreground">${computedRateApplied.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
            )}
            {customRateKind === 'hourly' && hoursInvalidReason && (
              <p className="text-[11px] text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {hoursInvalidReason}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="save-custom-rate"
                checked={saveCustomRate}
                onCheckedChange={(v) => setSaveCustomRate(!!v)}
              />
              <label htmlFor="save-custom-rate" className="text-xs text-muted-foreground cursor-pointer">
                Save to facility rates
              </label>
            </div>
            {rateOptions.length > 0 && isCustomRate && (
              <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => { setIsCustomRate(false); setCustomRateLabel(''); setSelectedRateKey('rate-0'); setRate(rateOptions[0]?.amount.toString() || ''); }}>
                ← Back to preset rates
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Color row */}
      <div>
        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5" />
          Color
        </Label>
        <div className="flex items-center gap-2">
          <div className="flex gap-2 flex-wrap">
            {SHIFT_COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={cn(
                  "w-7 h-7 rounded-full transition-all",
                  COLOR_MAP[c.value],
                  color === c.value ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110' : 'opacity-50 hover:opacity-90 hover:scale-105'
                )}
                title={c.label}
              />
            ))}
          </div>
          {!showNotes && (
            <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground shrink-0 h-7 px-2 ml-auto" onClick={() => setShowNotes(true)}>
              <StickyNote className="h-3.5 w-3.5 mr-1" />
              Add note
            </Button>
          )}
        </div>
      </div>

      {showNotes && (
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Shift notes..." className="resize-none text-sm" />
      )}

      {/* Review summary */}
      <div className="rounded-lg bg-muted/60 border border-border p-3">
        <p className="text-xs font-medium text-foreground">
          {selectedDates.length} shift{selectedDates.length !== 1 ? 's' : ''} at{' '}
          <span className="text-primary">{facilityName}</span>
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {[...selectedDates].sort((a, b) => a.getTime() - b.getTime()).map(d => format(d, 'MMM d')).join(', ')}
          {' · '}
          {startTime}–{endTime}
          {rate ? ` · $${computedRateApplied.toLocaleString(undefined, { maximumFractionDigits: 2 })}${activeRateKind === 'hourly' && isHoursValid ? ` (${formatHours(calculatedHours)} hrs × $${Number(rate)}/hr)` : ''}` : ''}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setStep(2)} className="h-11 min-w-[100px]">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button type="submit" className="flex-1 h-11" disabled={selectedDates.length === 0}>
          {isSubmitting ? 'Saving...' : selectedDates.length > 1 ? `Add ${selectedDates.length} Shifts` : 'Add Shift'}
        </Button>
      </div>
    </div>
  );

  /* ─── Edit mode: flat layout (unchanged) ─── */
  const renderEditForm = () => (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Left column: Date picker */}
        <div className="sm:w-[280px] shrink-0 flex flex-col">
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !selectedDates[0] && "text-muted-foreground")}>
                <CalendarDays className="mr-2 h-4 w-4" />
                {selectedDates[0] ? format(selectedDates[0], 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDates[0]}
                onSelect={(date) => date && setSelectedDates([date])}
                defaultMonth={selectedDates[0] ?? defaultMonth ?? defaultDate ?? new Date()}
                initialFocus
                modifiers={{ booked: bookedDateObjects }}
                modifiersClassNames={{ booked: "bg-destructive/20 text-destructive font-semibold" }}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {conflicts.length > 0 && (
            <div className="mt-2 flex items-start gap-1.5 p-2 rounded-md bg-destructive/10 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div className="text-[11px] leading-snug">
                <p className="font-semibold">Scheduling conflict{conflicts.length > 1 ? 's' : ''}:</p>
                {conflicts.map(c => (
                  <p key={c.id} className="mt-0.5">
                    {facilities.find((f: any) => f.id === c.facility_id)?.name || 'Unknown'} — {format(new Date(c.start_datetime), 'MMM d, h:mm a')} to {format(new Date(c.end_datetime), 'h:mm a')}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Facility
            </Label>
            <Select value={facilityId} onValueChange={(v) => {
              if (v === '__add_new__') { setShowAddFacility(true); return; }
              handleFacilityChange(v);
            }}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {facilities.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
                <SelectItem value="__add_new__" className="text-primary font-medium">
                  <span className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Add New Facility</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <AddFacilityDialog open={showAddFacility} onOpenChange={setShowAddFacility} onCreated={(newId) => handleFacilityChange(newId)} />
            {renderEngagementHelper()}
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Time
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-10" />
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-10" />
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Rate
            </Label>
            {rateOptions.length > 0 && !isCustomRate ? (
              <Select
                value={selectedRateKey || (rateOptions.findIndex(o => o.amount.toString() === rate) >= 0 ? `rate-${rateOptions.findIndex(o => o.amount.toString() === rate)}` : 'custom')}
                onValueChange={(v) => {
                  if (v === 'custom') { setIsCustomRate(true); setSelectedRateKey(''); setRate(''); }
                  else {
                    const idx = parseInt(v.replace('rate-', ''));
                    const opt = rateOptions[idx];
                    if (opt) { setRate(opt.amount.toString()); setSelectedRateKey(v); setIsCustomRate(false); }
                  }
                }}
              >
                <SelectTrigger className="h-10"><SelectValue placeholder="Select rate" /></SelectTrigger>
                <SelectContent>
                  {rateOptions.map((opt, i) => (
                    <SelectItem key={`rate-${i}`} value={`rate-${i}`}>{opt.label} — ${opt.amount.toLocaleString()}{opt.kind === 'hourly' ? '/hr' : '/day'}</SelectItem>
                  ))}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                <Input type="text" value={customRateLabel} onChange={e => setCustomRateLabel(e.target.value)} placeholder="Rate label" className="h-9 text-sm" />
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="0" min={0} className="pl-7 h-10" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="save-custom-rate-edit" checked={saveCustomRate} onCheckedChange={(v) => setSaveCustomRate(!!v)} />
                  <label htmlFor="save-custom-rate-edit" className="text-xs text-muted-foreground cursor-pointer">Save to facility rates</label>
                </div>
                {rateOptions.length > 0 && isCustomRate && (
                  <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => { setIsCustomRate(false); setCustomRateLabel(''); setSelectedRateKey('rate-0'); setRate(rateOptions[0]?.amount.toString() || ''); }}>
                    ← Back to preset rates
                  </Button>
                )}
              </div>
            )}
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" /> Color
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex gap-2 flex-wrap">
                {SHIFT_COLORS.map(c => (
                  <button key={c.value} type="button" onClick={() => setColor(c.value)}
                    className={cn("w-7 h-7 rounded-full transition-all", COLOR_MAP[c.value],
                      color === c.value ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110' : 'opacity-50 hover:opacity-90 hover:scale-105'
                    )} title={c.label} />
                ))}
              </div>
              {!showNotes && (
                <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground shrink-0 h-7 px-2 ml-auto" onClick={() => setShowNotes(true)}>
                  <StickyNote className="h-3.5 w-3.5 mr-1" /> Add note
                </Button>
              )}
            </div>
          </div>

          {showNotes && (
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Shift notes..." className="resize-none text-sm" />
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1 h-11" disabled={selectedDates.length === 0}>
          {isSubmitting ? 'Saving...' : 'Update Shift'}
        </Button>
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" size="icon" className="h-11 w-11"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this shift?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(existing.id)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </form>
  );

  /* ─── New shift: guided stepper ─── */
  const renderGuidedForm = () => (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <StepIndicator step={step} isMobile={isMobile} />
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </form>
  );

  const formContent = existing ? renderEditForm() : renderGuidedForm();

  if (embedded) return formContent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[calc(100dvh-2rem)] overflow-y-auto", existing ? "max-w-[680px]" : "max-w-[480px]")}>
        <DialogHeader><DialogTitle>{existing ? 'Edit Shift' : 'Add Shift'}</DialogTitle></DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
