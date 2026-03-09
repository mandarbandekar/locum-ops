import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/contexts/DataContext';
import { FacilityStatus } from '@/types';
import { toast } from 'sonner';

export function AddFacilityDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { addFacility } = useData();
  const [name, setName] = useState('');
  const [status, setStatus] = useState<FacilityStatus>('prospect');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  // Shift rates
  const [partialDayRate, setPartialDayRate] = useState('');
  const [holidayRate, setHolidayRate] = useState('');
  const [telemedicineRate, setTelemedicineRate] = useState('');
  // Tech access
  const [techComputer, setTechComputer] = useState('');
  const [techWifi, setTechWifi] = useState('');
  const [techPims, setTechPims] = useState('');
  // Clinic access
  const [clinicAccess, setClinicAccess] = useState('');
  // Invoice settings
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [invoiceDueDays, setInvoiceDueDays] = useState(15);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
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

  const resetForm = () => {
    setName(''); setAddress(''); setNotes('');
    setPartialDayRate(''); setHolidayRate(''); setTelemedicineRate('');
    setTechComputer(''); setTechWifi(''); setTechPims('');
    setClinicAccess(''); setInvoicePrefix('');
  };

  function getInitials(text: string): string {
    return text.split(/\s+/).map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 4) || 'INV';
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Practice Facility</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="general">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="rates">Shift Rates</TabsTrigger>
              <TabsTrigger value="tech">Tech Access</TabsTrigger>
              <TabsTrigger value="access">Clinic Access</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Practice facility name" required />
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
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes..." rows={3} />
              </div>
            </TabsContent>

            <TabsContent value="rates" className="space-y-3 mt-3">
              <p className="text-sm text-muted-foreground">Set shift rates for this facility. You can also configure these later in the Terms tab.</p>
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
            </TabsContent>

            <TabsContent value="tech" className="space-y-3 mt-3">
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
            </TabsContent>

            <TabsContent value="access" className="space-y-3 mt-3">
              <p className="text-sm text-muted-foreground">General clinic access details — door codes, parking, key info, etc.</p>
              <div className="space-y-2">
                <Label>Clinic Access Information</Label>
                <Textarea value={clinicAccess} onChange={e => setClinicAccess(e.target.value)} placeholder="Door codes, parking instructions, key pickup, building access..." rows={5} />
              </div>
            </TabsContent>
          </Tabs>

          <Button type="submit" className="w-full">Add Practice Facility</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
