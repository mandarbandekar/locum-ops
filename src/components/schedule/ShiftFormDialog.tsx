import { useState, useMemo, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimePicker, formatTimeLabel } from '@/components/ui/time-picker';
import { AlertTriangle, Trash2, CalendarDays, DollarSign, Clock, Building2, StickyNote, Palette, Plus, ChevronRight, ChevronLeft, Check, Pencil, Eye } from 'lucide-react';
import { GuidedStep } from '@/components/onboarding/GuidedStep';
import { AddFacilityDialog } from '@/components/AddFacilityDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { SHIFT_COLORS, ShiftColor, TermsSnapshot, Shift, BLOCK_TYPES, BlockType, RateKind } from '@/types';
import { BreakPolicySelector } from '@/components/facilities/BreakPolicySelector';
import { getBreakPolicyLabel, formatBillableHours, formatHoursMinutes, getScheduledMinutes, getBillableMinutes, isBreakFeatureNew } from '@/lib/shiftBreak';
import { Switch } from '@/components/ui/switch';
import { detectShiftConflicts } from '@/lib/businessLogic';
import { cn } from '@/lib/utils';
import { termsToRates, RateEntry } from '@/components/facilities/RatesEditor';
import { useData } from '@/contexts/DataContext';
import { useUserProfile, type DefaultRate } from '@/contexts/UserProfileContext';
import { mapDefaultRatesToRateEntries } from '@/lib/onboardingRateMapping';
import { getBillingPeriod } from '@/lib/invoiceAutoGeneration';
import type { BillingCadence } from '@/lib/invoiceBillingDefaults';
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

function buildRateOptions(
  terms: TermsSnapshot[],
  facilityId: string,
  defaultRates: DefaultRate[] = [],
): RateEntry[] {
  const facilityTerms = terms.find(t => t.facility_id === facilityId);
  const fromFacility = facilityTerms
    ? termsToRates(facilityTerms).filter(r => r.amount > 0)
    : [];
  if (fromFacility.length > 0) return fromFacility;
  // Fallback: the user's saved Rate Card so users aren't forced to retype
  // rates for clinics that were added before they configured terms.
  return mapDefaultRatesToRateEntries(defaultRates);
}



export function ShiftFormDialog({ open, onOpenChange, facilities, shifts, terms, existing, onSave, onDelete, embedded, defaultDate, defaultStartTime, defaultMonth }: ShiftFormDialogProps) {
  const [facilityId, setFacilityId] = useState(existing?.facility_id || facilities[0]?.id || '');
  const [selectedDates, setSelectedDates] = useState<Date[]>(
    existing ? [new Date(existing.start_datetime)] : defaultDate ? [defaultDate] : []
  );
  const [startTime, setStartTime] = useState(existing ? format(new Date(existing.start_datetime), 'HH:mm') : (defaultStartTime || ''));
  const [endTime, setEndTime] = useState(existing ? format(new Date(existing.end_datetime), 'HH:mm') : '');
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
  const facilityForBreak = facilities.find(f => f.id === facilityId);
  const clinicDefaultBreak: number | null = facilityForBreak?.default_break_minutes ?? null;
  const [breakMinutes, setBreakMinutes] = useState<number | null>(
    existing?.break_minutes !== undefined ? existing.break_minutes : clinicDefaultBreak,
  );
  const [workedThroughBreak, setWorkedThroughBreak] = useState<boolean>(!!existing?.worked_through_break);

  const isMobile = useIsMobile();
  const { updateTerms, timeBlocks } = useData();
  const { profile } = useUserProfile();
  const userDefaultRates: DefaultRate[] = (profile?.default_rates ?? []) as DefaultRate[];
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
      setStartTime(defaultStartTime || '');
      setEndTime('');
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
    if (existing) {
      setBreakMinutes(existing.break_minutes !== undefined ? existing.break_minutes : null);
      setWorkedThroughBreak(!!existing.worked_through_break);
    } else {
      const fac = facilities.find(f => f.id === (facilities[0]?.id || ''));
      setBreakMinutes(fac?.default_break_minutes ?? null);
      setWorkedThroughBreak(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing, defaultDate, defaultStartTime]);

  const rateOptions = useMemo(
    () => buildRateOptions(terms, facilityId, userDefaultRates),
    [terms, facilityId, userDefaultRates],
  );

  // For new shifts, seed `rate` from the first available option (facility terms
  // OR the user's saved Rate Card) so the field isn't blank when the user opens
  // the dialog. Skip when editing an existing shift or when the user already typed.
  useEffect(() => {
    if (!open || existing) return;
    if (rate || isCustomRate) return;
    const first = rateOptions[0];
    if (first) {
      setRate(first.amount.toString());
      setSelectedRateKey('rate-0');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facilityId, rateOptions.length]);

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

  // Calculated hours (rounded to nearest quarter hour).
  const calculatedHours = useMemo<number | null>(() => {
    if (!startTime || !endTime) return null;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if ([sh, sm, eh, em].some(n => Number.isNaN(n))) return null;
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    const rawHours = mins / 60;
    return Math.round(rawHours * 4) / 4;
  }, [startTime, endTime]);

  const hoursInvalidReason = useMemo<string | null>(() => {
    if (activeRateKind !== 'hourly') return null;
    if (calculatedHours === null) return 'Enter a valid start and end time.';
    if (calculatedHours <= 0) return 'End time must be after start time.';
    if (calculatedHours > 24) return 'Shift cannot exceed 24 hours.';
    return null;
  }, [activeRateKind, calculatedHours]);
  const isHoursValid = hoursInvalidReason === null;

  // Compute total for live preview / save payload.
  const computedRateApplied = useMemo(() => {
    const rateNum = Number(rate) || 0;
    if (activeRateKind === 'hourly') {
      const hours = Math.max(0, calculatedHours ?? 0);
      return Math.round(hours * rateNum * 100) / 100;
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
    setRate('');
    const newFac = facilities.find(f => f.id === newFacilityId);
    setShowEngagementOverride(false);
    setEngagementOverride((newFac?.engagement_type as EngagementType) || 'direct');
    setSourceOverride(newFac?.source_name ?? '');
    if (!existing) {
      setBreakMinutes(newFac?.default_break_minutes ?? null);
      setWorkedThroughBreak(false);
    }
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

  // Build start/end ISO timestamps for a given date, rolling end into the next
  // day when end time is on/before start time (overnight shift).
  const buildStartEndIso = useCallback((d: Date) => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const start = new Date(`${dateStr}T${startTime}:00`);
    let end = new Date(`${dateStr}T${endTime}:00`);
    if (end.getTime() <= start.getTime()) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }, [startTime, endTime]);

  const isOvernight = useMemo(() => {
    if (!startTime || !endTime) return false;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    return (eh * 60 + em) <= (sh * 60 + sm);
  }, [startTime, endTime]);

  const conflicts = useMemo(() => {
    if (isSubmitting || selectedDates.length === 0 || !facilityId || !startTime || !endTime) return [];
    const allConflicts: Shift[] = [];
    const seen = new Set<string>();
    for (const d of selectedDates) {
      const { startIso, endIso } = buildStartEndIso(d);
      for (const c of detectShiftConflicts(shifts, {
        start_datetime: startIso,
        end_datetime: endIso,
        id: existing?.id,
        break_minutes: breakMinutes,
        worked_through_break: workedThroughBreak,
      })) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          allConflicts.push(c);
        }
      }
    }
    return allConflicts;
  }, [shifts, selectedDates, startTime, endTime, existing?.id, facilityId, isSubmitting, buildStartEndIso, breakMinutes, workedThroughBreak]);

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

  // Combined required-field validation. Note + color are intentionally optional.
  const rateIsValid = Number(rate) > 0;
  const timeIsSet = !!startTime && !!endTime;
  const datesPicked = selectedDates.length > 0;
  const missingFields: string[] = [];
  if (!facilityId) missingFields.push('a clinic');
  if (!datesPicked) missingFields.push('a date');
  if (!timeIsSet) missingFields.push('a start and end time');
  if (!rateIsValid) missingFields.push('a rate');
  const canFinalize = !missingFields.length && !hoursInvalidReason;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hoursInvalidReason) {
      toast.error(hoursInvalidReason);
      return;
    }
    if (!canFinalize) {
      toast.error(`Please add ${missingFields.join(', ')} before saving.`);
      return;
    }
    setIsSubmitting(true);
    try {
      await saveCustomRateToTerms();
      const overridePayload = computeOverridePayload();
      const breakPayload = {
        break_minutes: workedThroughBreak ? (breakMinutes ?? null) : (breakMinutes ?? null),
        worked_through_break: workedThroughBreak,
      };
      // For hourly shifts, recompute total from BILLABLE minutes (subtracts unpaid break unless overridden).
      const buildRatePayload = (startIso: string, endIso: string) => {
        const shiftTypePayload = {
          shift_type: isCustomRate ? null : (selectedRateOption?.shift_type ?? null),
        };
        if (activeRateKind === 'hourly') {
          const billable = getBillableMinutes({
            start_datetime: startIso,
            end_datetime: endIso,
            break_minutes: breakPayload.break_minutes,
            worked_through_break: breakPayload.worked_through_break,
          });
          const billableHours = billable / 60;
          return {
            rate_kind: 'hourly' as const,
            hourly_rate: Number(rate) || 0,
            rate_applied: Math.round(billableHours * (Number(rate) || 0) * 100) / 100,
            ...shiftTypePayload,
          };
        }
        return {
          rate_kind: 'flat' as const,
          hourly_rate: null,
          rate_applied: Number(rate),
          ...shiftTypePayload,
        };
      };
      if (existing) {
        const { startIso, endIso } = buildStartEndIso(selectedDates[0] || new Date());
        await onSave({
          ...existing,
          facility_id: facilityId,
          start_datetime: startIso,
          end_datetime: endIso,
          ...buildRatePayload(startIso, endIso),
          notes, color,
          ...overridePayload,
          ...breakPayload,
        });
      } else {
        const orderedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
        for (const d of orderedDates) {
          const { startIso, endIso } = buildStartEndIso(d);
          await onSave({
            facility_id: facilityId,
            start_datetime: startIso,
            end_datetime: endIso,
            ...buildRatePayload(startIso, endIso),
            notes, color,
            ...overridePayload,
            ...breakPayload,
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

  /* ─── Shift break section (inherited from clinic, per-shift override) ─── */
  const renderBreakSection = () => {
    const scheduledMin = (() => {
      if (!startTime || !endTime) return 0;
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      let mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins <= 0) mins += 24 * 60;
      return mins;
    })();
    const billableMin = workedThroughBreak
      ? scheduledMin
      : Math.max(0, scheduledMin - (breakMinutes ?? 0));
    let helper = '';
    if (scheduledMin > 0) {
      const billH = formatBillableHours(billableMin);
      if (workedThroughBreak) {
        helper = `Billable: ${billH} hours · worked through break`;
      } else if ((breakMinutes ?? 0) > 0) {
        helper = `Billable: ${billH} hours · ${formatHoursMinutes(scheduledMin)} scheduled − ${formatHoursMinutes(breakMinutes!)} break`;
      } else {
        helper = `Billable: ${billH} hours`;
      }
    }
    const showNew = isBreakFeatureNew();
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Shift break
          </Label>
          {showNew && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#E1ECEF] text-[#1A5C6B] border border-[#1A5C6B]/30 dark:bg-[#1A5C6B]/30 dark:text-[#BFE0E8] uppercase tracking-wider">
              New
            </span>
          )}
          {facilityForBreak && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#E1ECEF] text-[#1A5C6B] border border-[#1A5C6B]/20 dark:bg-[#1A5C6B]/20 dark:text-[#BFE0E8]">
              From clinic: {getBreakPolicyLabel(clinicDefaultBreak)}
            </span>
          )}
        </div>
        <div className={cn(workedThroughBreak && 'opacity-50 pointer-events-none')}>
          <BreakPolicySelector value={breakMinutes} onChange={setBreakMinutes} compact />
        </div>
        {helper && (
          <p className="rounded-md px-2.5 py-1.5 text-[11px] text-foreground bg-[#F1EDE3] dark:bg-muted/50">
            {helper}
          </p>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Switch
            id="worked-through-break"
            checked={workedThroughBreak}
            onCheckedChange={setWorkedThroughBreak}
          />
          <label htmlFor="worked-through-break" className="text-xs cursor-pointer">
            <span className="font-medium">Worked through break</span>
            <span className="block text-[10px] text-muted-foreground">Override for this shift only</span>
          </label>
        </div>
      </div>
    );
  };
  const renderStep1 = () => (
    <GuidedStep
      title="Which clinic?"
      subtitle="Pick the practice this shift is for. Add a new one if it's missing."
      icon={Building2}
    >
      <div>
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
      {/* Clinic defaults chip */}
      {(() => {
        const fac = facilities.find(f => f.id === facilityId);
        if (!fac) return null;
        const cadenceLabel = ({ daily: 'Daily', weekly: 'Weekly', biweekly: 'Biweekly', monthly: 'Monthly' } as Record<string, string>)[fac.billing_cadence] || 'Monthly';
        const firstRate = rateOptions[0];
        const parts = [
          `${cadenceLabel} billing`,
          firstRate ? `${firstRate.label} $${firstRate.amount.toLocaleString()}${firstRate.kind === 'hourly' ? '/hr' : '/day'}` : null,
        ].filter(Boolean);
        return (
          <p className="text-[11px] text-muted-foreground">
            <span className="text-foreground font-medium">Defaults · </span>{parts.join(' · ')}
          </p>
        );
      })()}
      {renderEngagementHelper()}
      <div className="flex justify-end pt-2">
        <Button type="button" onClick={() => setStep(2)} disabled={!facilityId} className="h-10 min-w-[120px]">
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </GuidedStep>
  );

  /* ─── Step 2: Schedule ─── */
  const renderStep2 = () => (
    <GuidedStep
      title="When are you working?"
      subtitle={`Tap one or more dates for ${facilityName || 'this clinic'}, then set your start and end time.`}
      icon={CalendarDays}
    >
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] text-muted-foreground">Start</span>
            <TimePicker value={startTime} onChange={setStartTime} placeholder="Select start" label="Start time" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">End</span>
            <TimePicker value={endTime} onChange={setEndTime} placeholder="Select end" label="End time" />
          </div>
        </div>
        {activeRateKind === 'hourly' && hoursInvalidReason && (
          <p className="mt-1.5 text-[11px] text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> {hoursInvalidReason}
          </p>
        )}
        {!timeIsSet && !hoursInvalidReason && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Set a start and end time to continue.
          </p>
        )}
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
        <Button type="button" onClick={() => setStep(3)} disabled={!datesPicked || !timeIsSet || !!hoursInvalidReason} className="flex-1 h-10">
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </GuidedStep>
  );

  /* ─── Step 3: Details + Review ─── */
  const reviewPreview = (
    <>
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
    </>
  );

  const renderStep3 = () => (
    <GuidedStep
      title="Rate & details"
      subtitle="Confirm your rate, pick a color, and add notes if needed."
      icon={DollarSign}
      preview={reviewPreview}
    >
      {/* Shift break */}
      {renderBreakSection()}

      {/* Rate */}
      <div>
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
                    {opt.shift_type ? `[${opt.shift_type.toUpperCase()}] ` : ''}{opt.label} — ${opt.amount.toLocaleString()}{opt.kind === 'hourly' ? '/hr' : '/day'}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {activeRateKind === 'hourly' && Number(rate) > 0 && isHoursValid && (
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">
                  {formatHours(calculatedHours)} hrs × ${Number(rate).toLocaleString()}/hr ={' '}
                  <span className="font-semibold text-foreground">${computedRateApplied.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </p>
              </div>
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
        <div className="flex items-center gap-2">
          <div className="flex gap-2 flex-wrap">
            {SHIFT_COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={cn(
                  "w-7 h-7 rounded-full border border-border transition-all",
                  c.bg,
                  color === c.value ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'
                )}
                title={c.label}
                aria-label={c.label}
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

      {/* Missing-fields helper */}
      {!canFinalize && (
        <p className="text-[11px] text-muted-foreground text-center">
          Add {missingFields.join(', ')} to finalize.
        </p>
      )}

      {/* Navigation */}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setStep(2)} className="h-11 min-w-[100px]">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button type="button" onClick={() => setStep(4)} className="flex-1 h-11" disabled={!canFinalize}>
          Preview <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </GuidedStep>
  );

  /* ─── Step 4: Preview & confirm ─── */
  const renderStep4 = () => {
    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    const rateLabel = isCustomRate
      ? (customRateLabel.trim() || 'Custom rate')
      : (selectedRateOption?.label || 'Rate');
    const rateUnit = activeRateKind === 'hourly' ? '/hr' : '/day';
    const totalPerShift = computedRateApplied;
    const grandTotal = totalPerShift * Math.max(1, sortedDates.length);
    const colorDef = SHIFT_COLORS.find(c => c.value === color) || SHIFT_COLORS[0];

    const Row = ({
      icon: Icon,
      label,
      onEdit,
      children,
    }: {
      icon: typeof Building2;
      label: string;
      onEdit: () => void;
      children: React.ReactNode;
    }) => (
      <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-b-0">
        <div className="mt-0.5 h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="text-sm text-foreground mt-0.5 break-words">{children}</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-7 px-2 text-[11px] text-primary hover:text-primary shrink-0"
        >
          <Pencil className="h-3 w-3 mr-1" /> Edit
        </Button>
      </div>
    );

    return (
      <GuidedStep
        title="Review your shift"
        subtitle="Double-check the details below. Tap Edit on any row to make changes."
        icon={Eye}
      >
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-1">
          <Row icon={Building2} label="Clinic" onEdit={() => setStep(1)}>
            {facilityName || <span className="text-muted-foreground">—</span>}
          </Row>
          <Row icon={CalendarDays} label={sortedDates.length > 1 ? `Dates (${sortedDates.length})` : 'Date'} onEdit={() => setStep(2)}>
            {sortedDates.length
              ? sortedDates.map(d => format(d, 'EEE, MMM d, yyyy')).join(' · ')
              : <span className="text-muted-foreground">—</span>}
          </Row>
          <Row icon={Clock} label="Time" onEdit={() => setStep(2)}>
            {startTime && endTime ? (
              <span className="inline-flex items-center gap-1.5 flex-wrap">
                <span>{formatTimeLabel(startTime)} – {formatTimeLabel(endTime)}</span>
                {isOvernight && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    Overnight
                  </span>
                )}
                {activeRateKind === 'hourly' && isHoursValid && (
                  <span className="text-muted-foreground">· {formatHours(calculatedHours)} hrs</span>
                )}
                {!workedThroughBreak && (breakMinutes ?? 0) > 0 && (
                  <span className="text-muted-foreground">({`incl. ${breakMinutes} min unpaid break`})</span>
                )}
              </span>
            ) : <span className="text-muted-foreground">—</span>}
          </Row>
          <Row icon={DollarSign} label="Rate" onEdit={() => setStep(3)}>
            <div>
              <span>{rateLabel} — ${Number(rate || 0).toLocaleString()}{rateUnit}</span>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                ${totalPerShift.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per shift
                {sortedDates.length > 1 && (
                  <> · <span className="text-foreground font-medium">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total</span></>
                )}
              </div>
            </div>
          </Row>
          <Row icon={Palette} label="Color" onEdit={() => setStep(3)}>
            <span className="inline-flex items-center gap-2">
              <span className={cn('h-4 w-4 rounded-full border border-border', colorDef.bg)} />
              <span>{colorDef.label}</span>
            </span>
          </Row>
          <Row icon={StickyNote} label="Notes" onEdit={() => { setShowNotes(true); setStep(3); }}>
            {notes?.trim()
              ? <span className="whitespace-pre-wrap">{notes}</span>
              : <span className="text-muted-foreground italic">No notes</span>}
          </Row>
        </div>

        {conflicts.length > 0 && (
          <div className="flex items-start gap-1.5 p-2 rounded-md bg-destructive/10 text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div className="text-[11px] leading-snug">
              <p className="font-semibold">Heads up — scheduling conflict{conflicts.length > 1 ? 's' : ''}:</p>
              {conflicts.map(c => (
                <p key={c.id} className="mt-0.5">
                  {facilities.find((f: any) => f.id === c.facility_id)?.name || 'Unknown'} — {format(new Date(c.start_datetime), 'MMM d, h:mm a')} to {format(new Date(c.end_datetime), 'h:mm a')}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setStep(3)} className="h-11 min-w-[100px]">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button type="submit" className="flex-1 h-11" disabled={!canFinalize || isSubmitting}>
            <Check className="h-4 w-4 mr-1" />
            {isSubmitting ? 'Saving...' : sortedDates.length > 1 ? `Confirm & add ${sortedDates.length} shifts` : 'Confirm & add shift'}
          </Button>
        </div>
      </GuidedStep>
    );
  };

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
              <TimePicker value={startTime} onChange={setStartTime} placeholder="Select start" label="Start time" />
              <TimePicker value={endTime} onChange={setEndTime} placeholder="Select end" label="End time" />
            </div>
            {activeRateKind === 'hourly' && hoursInvalidReason && (
              <p className="mt-1.5 text-[11px] text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {hoursInvalidReason}
              </p>
            )}
          </div>

          {/* Shift break */}
          {renderBreakSection()}

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
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-md border border-border overflow-hidden h-10" role="group">
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
                    className={cn("w-7 h-7 rounded-full border border-border transition-all", c.bg,
                      color === c.value ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'
                    )} title={c.label} aria-label={c.label} />
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
        <Button type="submit" className="flex-1 h-11" disabled={!canFinalize || isSubmitting}>
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
  const totalSteps = 4;
  const renderGuidedForm = () => (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Step {step} of {totalSteps}
        </p>
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 w-8 rounded-full transition-colors',
                i + 1 <= step ? 'bg-primary' : 'bg-muted',
              )}
            />
          ))}
        </div>
      </div>
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
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
