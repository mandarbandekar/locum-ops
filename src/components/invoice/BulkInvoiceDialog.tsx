import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, FileText, AlertTriangle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { generateInvoiceNumber } from '@/lib/businessLogic';
import { getEligibleShiftsForBulkInvoice } from '@/lib/bulkInvoiceHelpers';
import { toast } from 'sonner';
import type { Shift, InvoiceLineItem } from '@/types';

type PeriodPreset = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

function getPeriodDates(preset: PeriodPreset): { start: Date; end: Date } {
  const now = new Date();
  switch (preset) {
    case 'this_week': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'last_week': { const lw = subWeeks(now, 1); return { start: startOfWeek(lw, { weekStartsOn: 1 }), end: endOfWeek(lw, { weekStartsOn: 1 }) }; }
    case 'this_month': return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last_month': { const lm = subMonths(now, 1); return { start: startOfMonth(lm), end: endOfMonth(lm) }; }
    default: return { start: subMonths(now, 1), end: now };
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedFacilityId?: string;
}

export function BulkInvoiceDialog({ open, onOpenChange, preselectedFacilityId }: Props) {
  const { facilities, shifts, invoices, lineItems, addInvoice } = useData();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [facilityId, setFacilityId] = useState(preselectedFacilityId || '');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('last_month');
  const [customStart, setCustomStart] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const activeFacilities = facilities.filter(f => f.status === 'active');
  const facility = facilities.find(f => f.id === facilityId);

  const period = periodPreset === 'custom'
    ? { start: new Date(customStart), end: new Date(customEnd) }
    : getPeriodDates(periodPreset);

  const { eligible, draftExcluded } = useMemo(() => {
    if (!facilityId) return { eligible: [], draftExcluded: [] };
    return getEligibleShiftsForBulkInvoice(shifts, invoices, lineItems, facilityId, period.start, period.end);
  }, [facilityId, shifts, invoices, lineItems, period.start.toISOString(), period.end.toISOString()]);

  const selectedShifts = eligible.filter(s => selectedShiftIds.has(s.id));
  const selectedTotal = selectedShifts.reduce((sum, s) => sum + s.rate_applied, 0);

  const handleSelectAll = () => {
    if (selectedShiftIds.size === eligible.length) {
      setSelectedShiftIds(new Set());
    } else {
      setSelectedShiftIds(new Set(eligible.map(s => s.id)));
    }
  };

  const toggleShift = (id: string) => {
    setSelectedShiftIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleStepForward = () => {
    if (step === 2) {
      // Auto-select all eligible shifts when entering step 3
      setSelectedShiftIds(new Set(eligible.map(s => s.id)));
    }
    setStep(s => s + 1);
  };

  const buildLineItemsForShift = (s: typeof selectedShifts[number]) => {
    const dateLabel = format(new Date(s.start_datetime), 'MMM d, yyyy');
    const timeLabel = `${format(new Date(s.start_datetime), 'h:mm a')} – ${format(new Date(s.end_datetime), 'h:mm a')}`;
    const isHourly = s.rate_kind === 'hourly' && s.hourly_rate != null && s.hourly_rate > 0;

    if (!isHourly) {
      return [{
        shift_id: s.id,
        description: `${dateLabel} — Relief coverage (${timeLabel})`,
        service_date: new Date(s.start_datetime).toISOString().split('T')[0],
        qty: 1,
        unit_rate: s.rate_applied,
        line_total: s.rate_applied,
        line_kind: 'flat' as const,
      }];
    }

    const totalHours = Math.round(((new Date(s.end_datetime).getTime() - new Date(s.start_datetime).getTime()) / 3600000) * 100) / 100;
    const hourlyRate = Number(s.hourly_rate);
    const overtimeHours = Number(s.overtime_hours || 0);
    const regularHours = s.regular_hours != null
      ? Number(s.regular_hours)
      : Math.max(0, totalHours - overtimeHours);
    const overtimeRate = s.overtime_rate != null ? Number(s.overtime_rate) : 0;

    const regularLine = {
      shift_id: s.id,
      description: `${dateLabel} — Relief coverage (${timeLabel})`,
      service_date: new Date(s.start_datetime).toISOString().split('T')[0],
      qty: regularHours,
      unit_rate: hourlyRate,
      line_total: Math.round(regularHours * hourlyRate * 100) / 100,
      line_kind: 'regular' as const,
    };

    if (overtimeHours <= 0 || overtimeRate <= 0) return [regularLine];

    return [regularLine, {
      shift_id: s.id,
      description: `${dateLabel} — Overtime (after ${regularHours} hrs)`,
      service_date: new Date(s.start_datetime).toISOString().split('T')[0],
      qty: overtimeHours,
      unit_rate: overtimeRate,
      line_total: Math.round(overtimeHours * overtimeRate * 100) / 100,
      line_kind: 'overtime' as const,
    }];
  };

  const handleCreate = async () => {
    if (selectedShiftIds.size === 0 || !facility) return;
    setCreating(true);
    try {
      const dueDays = facility.invoice_due_days || 15;
      const lineItemsData = selectedShifts.flatMap(buildLineItemsForShift);
      const computedTotal = lineItemsData.reduce((sum, li) => sum + li.line_total, 0);

      const invoice = await addInvoice(
        {
          facility_id: facilityId,
          invoice_number: generateInvoiceNumber(invoices, facility.invoice_prefix || 'INV'),
          invoice_date: new Date().toISOString(),
          period_start: period.start.toISOString(),
          period_end: period.end.toISOString(),
          total_amount: computedTotal,
          balance_due: computedTotal,
          status: 'draft',
          sent_at: null,
          paid_at: null,
          due_date: new Date(Date.now() + dueDays * 86400000).toISOString(),
          notes: '',
          share_token: null,
          share_token_created_at: null,
          share_token_revoked_at: null,
          invoice_type: 'bulk',
          generation_type: 'manual',
          billing_cadence: null,
        },
        lineItemsData
      );

      toast.success(`Invoice created with ${selectedShifts.length} shifts`);
      onOpenChange(false);
      navigate(`/invoices/${invoice.id}`);
    } catch {
      /* error toast handled in DataContext */
    } finally {
      setCreating(false);
    }
  };

  const resetAndClose = (o: boolean) => {
    if (!o) {
      setStep(1);
      if (!preselectedFacilityId) setFacilityId('');
      setSelectedShiftIds(new Set());
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Create Invoice
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {['Facility', 'Period', 'Shifts', 'Review'].map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium ${step > i + 1 ? 'bg-primary text-primary-foreground' : step === i + 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {i + 1}
              </span>
              <span className={step === i + 1 ? 'font-medium text-foreground' : ''}>{label}</span>
              {i < 3 && <span className="mx-1">›</span>}
            </div>
          ))}
        </div>

        {/* Step 1: Select Facility */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Select Facility</Label>
              <Select value={facilityId} onValueChange={setFacilityId}>
                <SelectTrigger><SelectValue placeholder="Choose a facility" /></SelectTrigger>
                <SelectContent>
                  {activeFacilities.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleStepForward} disabled={!facilityId}>
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Select Period */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select a billing period for <span className="font-medium text-foreground">{facility?.name}</span>.</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['this_week', 'This Week'],
                ['last_week', 'Last Week'],
                ['this_month', 'This Month'],
                ['last_month', 'Last Month'],
                ['custom', 'Custom Range'],
              ] as const).map(([val, label]) => (
                <Button
                  key={val}
                  size="sm"
                  variant={periodPreset === val ? 'default' : 'outline'}
                  onClick={() => setPeriodPreset(val)}
                  className={val === 'custom' ? 'col-span-2' : ''}
                >
                  {label}
                </Button>
              ))}
            </div>
            {periodPreset === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start</Label><Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} /></div>
                <div><Label>End</Label><Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} /></div>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
              <Button onClick={handleStepForward}>Next <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* Step 3: Select Shifts */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Completed shifts for <span className="font-medium text-foreground">{facility?.name}</span> from{' '}
              {format(period.start, 'MMM d')} – {format(period.end, 'MMM d, yyyy')}
            </p>

            {draftExcluded.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-md px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {draftExcluded.length} shift{draftExcluded.length > 1 ? 's are' : ' is'} already included in another draft invoice.
              </div>
            )}

            {eligible.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No completed shifts available for this facility in the selected period.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={eligible.length > 0 && selectedShiftIds.size === eligible.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-xs text-muted-foreground">Select all ({eligible.length})</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {selectedShiftIds.size} selected · ${selectedTotal.toLocaleString()}
                  </Badge>
                </div>
                <div className="max-h-60 overflow-y-auto border rounded-md divide-y">
                  {eligible.map(s => (
                    <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer text-sm">
                      <Checkbox checked={selectedShiftIds.has(s.id)} onCheckedChange={() => toggleShift(s.id)} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{format(new Date(s.start_datetime), 'MMM d, yyyy')}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(s.start_datetime), 'h:mm a')} – {format(new Date(s.end_datetime), 'h:mm a')}
                          {s.notes && <span className="ml-2">· {s.notes}</span>}
                        </div>
                      </div>
                      <span className="font-medium">${s.rate_applied.toLocaleString()}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
              <Button onClick={handleStepForward} disabled={selectedShiftIds.size === 0}>
                Review <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Create */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-md border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Facility</span>
                <span className="font-medium">{facility?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billing Period</span>
                <span>{format(period.start, 'MMM d')} – {format(period.end, 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shifts Included</span>
                <span className="font-medium">{selectedShiftIds.size} completed shifts</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-medium">Total Amount</span>
                <span className="font-bold text-lg">${selectedTotal.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This will create a <strong>Draft</strong> invoice. You can review and edit it before sending.
            </p>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating…' : 'Create Draft Invoice'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
