import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useData } from '@/contexts/DataContext';
import { FacilityStatus } from '@/types';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, SkipForward } from 'lucide-react';

const STEPS = [
  { label: 'General', description: 'Name & basic info' },
  { label: 'Shift Rates', description: 'Rate configuration' },
  { label: 'Tech Access', description: 'Logins & credentials' },
  { label: 'Clinic Access', description: 'Door codes & parking' },
  { label: 'Invoice Settings', description: 'Prefix & terms' },
];

export function AddFacilityDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { addFacility } = useData();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<FacilityStatus>('prospect');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [partialDayRate, setPartialDayRate] = useState('');
  const [holidayRate, setHolidayRate] = useState('');
  const [telemedicineRate, setTelemedicineRate] = useState('');
  const [techComputer, setTechComputer] = useState('');
  const [techWifi, setTechWifi] = useState('');
  const [techPims, setTechPims] = useState('');
  const [clinicAccess, setClinicAccess] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [invoiceDueDays, setInvoiceDueDays] = useState(15);

  const totalSteps = STEPS.length;
  const progress = ((step + 1) / totalSteps) * 100;

  function getInitials(text: string): string {
    return text.split(/\s+/).map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 4) || 'INV';
  }

  const resetForm = () => {
    setStep(0);
    setName(''); setAddress(''); setNotes(''); setStatus('prospect');
    setPartialDayRate(''); setHolidayRate(''); setTelemedicineRate('');
    setTechComputer(''); setTechWifi(''); setTechPims('');
    setClinicAccess(''); setInvoicePrefix(''); setInvoiceDueDays(15);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Please enter a facility name');
      setStep(0);
      return;
    }
    const prefix = invoicePrefix || getInitials(name);
    addFacility({
      name, status, address, timezone: 'America/Los_Angeles', notes,
      outreach_last_sent_at: null,
      tech_computer_info: techComputer,
      tech_wifi_info: techWifi,
      tech_pims_info: techPims,
      clinic_access_info: clinicAccess,
      invoice_prefix: prefix,
      invoice_due_days: invoiceDueDays,
    });
    toast.success('Practice facility added');
    resetForm();
    onOpenChange(false);
  };

  const handleSkipAndAdd = () => {
    if (!name.trim()) {
      toast.error('Please enter a facility name first');
      setStep(0);
      return;
    }
    handleSubmit();
  };

  const handleNext = () => {
    if (step === 0 && !name.trim()) {
      toast.error('Please enter a facility name');
      return;
    }
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Practice Facility</DialogTitle>
        </DialogHeader>

        {/* Progress section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {step + 1} of {totalSteps} — {STEPS[step].label}</span>
            {step > 0 && (
              <button
                type="button"
                onClick={handleSkipAndAdd}
                className="flex items-center gap-1 text-xs text-primary hover:underline transition-colors"
              >
                <SkipForward className="h-3 w-3" />
                Skip & add now
              </button>
            )}
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">{STEPS[step].description}</p>
        </div>

        {/* Step content */}
        <div className="space-y-3 min-h-[200px]">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Practice facility name" autoFocus />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as FacilityStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes..." rows={3} />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">Set shift rates for this facility. You can also configure these later.</p>
              <div className="space-y-2">
                <Label>Partial Day Rate ($)</Label>
                <Input type="number" value={partialDayRate} onChange={e => setPartialDayRate(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Holiday Rate ($)</Label>
                <Input type="number" value={holidayRate} onChange={e => setHolidayRate(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Telemedicine Rate ($)</Label>
                <Input type="number" value={telemedicineRate} onChange={e => setTelemedicineRate(e.target.value)} placeholder="0" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">Store login credentials and tech access info for this facility.</p>
              <div className="space-y-2">
                <Label>Computer / Login Info</Label>
                <Textarea value={techComputer} onChange={e => setTechComputer(e.target.value)} placeholder="Computer login, desktop credentials..." rows={2} />
              </div>
              <div className="space-y-2">
                <Label>WiFi Passwords</Label>
                <Textarea value={techWifi} onChange={e => setTechWifi(e.target.value)} placeholder="Network name, password..." rows={2} />
              </div>
              <div className="space-y-2">
                <Label>PIMS Credentials</Label>
                <Textarea value={techPims} onChange={e => setTechPims(e.target.value)} placeholder="PIMS system, username, password..." rows={2} />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">General clinic access details — door codes, parking, key info, etc.</p>
              <div className="space-y-2">
                <Label>Clinic Access Information</Label>
                <Textarea value={clinicAccess} onChange={e => setClinicAccess(e.target.value)} placeholder="Door codes, parking instructions, key pickup, building access..." rows={5} />
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <p className="text-sm text-muted-foreground">Invoice numbering and payment terms for this facility.</p>
              <div className="space-y-2">
                <Label>Invoice Prefix</Label>
                <Input
                  value={invoicePrefix}
                  onChange={e => setInvoicePrefix(e.target.value.toUpperCase())}
                  placeholder={name ? getInitials(name) : 'INV'}
                />
                <p className="text-xs text-muted-foreground">
                  Defaults to facility initials. e.g. {invoicePrefix || (name ? getInitials(name) : 'INV')}-2026-001
                </p>
              </div>
              <div className="space-y-2">
                <Label>Invoice Due (days)</Label>
                <Input
                  type="number"
                  value={invoiceDueDays}
                  onChange={e => setInvoiceDueDays(Number(e.target.value))}
                  min={1}
                  placeholder="15"
                />
                <p className="text-xs text-muted-foreground">
                  Number of days after invoice date that payment is due. Default: Net 15.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={step === 0}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <Button type="button" size="sm" onClick={handleNext}>
            {step === totalSteps - 1 ? 'Add Facility' : (
              <>Next <ArrowRight className="ml-1 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
