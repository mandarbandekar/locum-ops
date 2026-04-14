import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, Building2, MapPin, Zap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, subDays } from 'date-fns';
import type { Facility, Shift, TermsSnapshot, Invoice, InvoiceLineItem } from '@/types';
import { AddFacilityDialog } from '@/components/AddFacilityDialog';

interface Props {
  facilities: Facility[];
  shifts: Shift[];
  terms: TermsSnapshot[];
  invoices: Invoice[];
  lineItems: InvoiceLineItem[];
  addShift: (shift: Omit<Shift, 'id'>) => Promise<Shift>;
  onContinue: () => void;
}

export function OnboardingShiftStep({ facilities, shifts, terms, invoices, lineItems, addShift, onContinue }: Props) {
  const yesterday = subDays(new Date(), 1);
  const defaultFacility = facilities[0];
  const defaultRate = defaultFacility
    ? (terms.find(t => t.facility_id === defaultFacility.id)?.weekday_rate || 650)
    : 650;

  const [selectedFacilityId, setSelectedFacilityId] = useState(defaultFacility?.id || '');
  const [shiftDate, setShiftDate] = useState(format(yesterday, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [rate, setRate] = useState(defaultRate.toString());
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedShift, setSavedShift] = useState<Shift | null>(null);
  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const selectedFacility = facilities.find(f => f.id === selectedFacilityId) || defaultFacility;

  const handleSubmit = async () => {
    if (!selectedFacility || submitting) return;
    setSubmitting(true);
    try {
      const startDt = new Date(`${shiftDate}T${startTime}:00`);
      const endDt = new Date(`${shiftDate}T${endTime}:00`);
      const shift = await addShift({
        facility_id: selectedFacility.id,
        start_datetime: startDt.toISOString(),
        end_datetime: endDt.toISOString(),
        rate_applied: parseFloat(rate) || 650,
        notes: '',
        color: 'blue',
      });
      setSavedShift(shift);
      setSubmitted(true);
    } catch (e) {
      console.error('Failed to save shift', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAnotherShift = () => {
    setSubmitted(false);
    setSavedShift(null);
    setShiftDate(format(yesterday, 'yyyy-MM-dd'));
    setStartTime('08:00');
    setEndTime('18:00');
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startDt = new Date(`${shiftDate}T${startTime}:00`);
  const endDt = new Date(`${shiftDate}T${endTime}:00`);
  const hours = Math.max(0, (endDt.getTime() - startDt.getTime()) / 3600000);
  const shiftRate = parseFloat(rate) || 650;

  const latestInvoice = submitted
    ? invoices.find(inv => inv.facility_id === selectedFacility?.id && inv.status === 'draft')
    : null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Log your first shift</h2>
        <p className="text-muted-foreground">
          Each shift you log creates a draft invoice and updates your earnings and tax estimate.
        </p>
      </div>

      {/* Shift Form */}
      <div ref={formRef} className={`space-y-4 transition-opacity duration-300 ${submitted ? 'opacity-50' : ''}`}>
        {/* Facility reference */}
        {facilities.length === 1 ? (
          <Card className="border-primary/20 bg-primary/[0.02]">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">{selectedFacility?.name}</p>
                {selectedFacility?.address && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" /> {selectedFacility.address}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Just added</Badge>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1.5">
            <Label>Practice</Label>
            <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
              <SelectTrigger><SelectValue placeholder="Select a clinic" /></SelectTrigger>
              <SelectContent>
                {facilities.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Side-by-side: Shift date + Day rate on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Side-by-side: Start + End time */}
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

        {/* Hidden submit button for sticky CTA */}
        {!submitted && (
          <button
            id="onboarding-shift-save"
            type="button"
            onClick={handleSubmit}
            disabled={!selectedFacility || submitting}
            className="hidden"
            data-can-save={!!selectedFacility && !submitting}
            data-saving={submitting}
          />
        )}
      </div>

      {/* Results Phase */}
      {submitted && (
        <div className="space-y-4">
          {/* Invoice Generated Banner */}
          <div
            className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 flex items-center gap-3 animate-slide-up"
            style={{ animationDelay: '0ms', animationFillMode: 'both' }}
          >
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Invoice auto-generated</p>
              <p className="text-sm text-muted-foreground">Every shift you log creates a draft invoice. Review, edit, and send it from your Invoices page — or set up auto-reminders.</p>
            </div>
          </div>

          {/* Invoice Preview Card */}
          <Card
            className="border shadow-card animate-slide-up"
            style={{ animationDelay: '200ms', animationFillMode: 'both' }}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Invoice</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {latestInvoice?.invoice_number || 'INV-2026-001'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {latestInvoice ? format(new Date(latestInvoice.invoice_date), 'MMM d, yyyy') : format(new Date(shiftDate), 'MMM d, yyyy')} · Net 30
                  </p>
                </div>
                <Badge variant="outline" className="border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/30">Draft</Badge>
              </div>

              <div className="text-sm">
                <p className="text-muted-foreground text-xs">Bill to</p>
                <p className="font-medium">{selectedFacility?.name}</p>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Relief veterinary services — {hours}h</span>
                  <span className="font-medium">${shiftRate.toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t pt-3 flex justify-between items-center">
                <span className="text-sm font-semibold">Total due</span>
                <span className="text-lg font-bold text-foreground">${shiftRate.toLocaleString()}</span>
              </div>

              <p className="text-xs text-muted-foreground pt-2 border-t">
                This is a real draft saved to your account. Head to Invoices anytime to review, customize, or send it to the clinic.
              </p>
            </CardContent>
          </Card>

          {/* Earnings Snapshot */}
          <Card
            className="animate-slide-up"
            style={{ animationDelay: '400ms', animationFillMode: 'both' }}
          >
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">📊 Business Hub — Earnings this week</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 animate-scale-up">
                ${shiftRate.toLocaleString()}
              </p>
              <Progress value={35} className="h-2" />
              <p className="text-xs text-muted-foreground">Based on 1 shift. Your Business Hub shows weekly, monthly, and annual earnings across all clinics. The more shifts you log, the more complete your financial picture becomes.</p>
            </CardContent>
          </Card>

          {/* Secondary links */}
          <div className="flex justify-center gap-4 text-sm">
            <button type="button" onClick={handleAddAnotherShift} className="text-primary hover:underline">
              Add another shift
            </button>
            <button type="button" onClick={() => setFacilityDialogOpen(true)} className="text-primary hover:underline">
              Add another practice
            </button>
          </div>

          {/* Hidden button for sticky CTA */}
          <button
            id="onboarding-shift-continue"
            type="button"
            onClick={onContinue}
            className="hidden"
          />
        </div>
      )}

      <AddFacilityDialog open={facilityDialogOpen} onOpenChange={setFacilityDialogOpen} />
    </div>
  );
}
