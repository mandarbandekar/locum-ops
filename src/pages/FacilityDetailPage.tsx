import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, Plus, Trash2, Edit2, Save, Pencil, Check, X, Car, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FacilityContact, ContactRole, TermsSnapshot, SHIFT_COLORS, ShiftColor } from '@/types';
import { generateId } from '@/lib/businessLogic';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ContractsTab } from '@/components/contracts/ContractsTab';
import { RatesEditor, termsToRates, ratesToTermsFields, RateEntry } from '@/components/facilities/RatesEditor';
import { ShiftFormDialog } from '@/components/schedule/ShiftFormDialog';
import { FacilityConfirmationSettingsCard } from '@/components/schedule/FacilityConfirmationSettingsCard';
import { useClinicConfirmations } from '@/hooks/useClinicConfirmations';
import { InvoicingPreferencesCard } from '@/components/facilities/InvoicingPreferencesCard';
import { ClinicNotesCard } from '@/components/facilities/ClinicNotesCard';

export default function FacilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { facilities, contacts, terms, shifts, invoices, updateFacility, addContact, updateContact, deleteContact, updateTerms, addShift, updateShift, deleteShift } = useData();
  const { getSettings, saveSettings } = useClinicConfirmations();
  

  const facility = facilities.find(c => c.id === id);
  if (!facility) return <div className="p-6">Practice facility not found. <Button variant="link" onClick={() => navigate('/facilities')}>Back</Button></div>;

  const facilityContacts = contacts.filter(c => c.facility_id === id);
  const facilityTerms = terms.find(c => c.facility_id === id);
  const facilityShifts = shifts.filter(s => s.facility_id === id).sort((a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime());
  const facilityInvoices = invoices.filter(i => i.facility_id === id);

  const handleSaveRates = (rateEntries: RateEntry[]) => {
    const fields = ratesToTermsFields(rateEntries);
    updateTerms({
      id: facilityTerms?.id || generateId(),
      facility_id: facility.id,
      ...fields,
      cancellation_policy_text: facilityTerms?.cancellation_policy_text || '',
      overtime_policy_text: facilityTerms?.overtime_policy_text || '',
      late_payment_policy_text: facilityTerms?.late_payment_policy_text || '',
      special_notes: facilityTerms?.special_notes || '',
    });
    toast.success('Rates saved');
  };

  return (
    <div>
      <div className="flex items-center gap-2 sm:gap-3 mb-6 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate('/facilities')} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <EditableFacilityName facility={facility} onSave={(newName, newAddress) => { updateFacility({ ...facility, name: newName, address: newAddress }); toast.success('Practice facility updated'); }} />
        <StatusBadge status={facility.status} className="ml-1 sm:ml-3 shrink-0" />
        <div className="flex-1" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="shifts">Shifts ({facilityShifts.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({facilityInvoices.length})</TabsTrigger>
          <TabsTrigger value="contracts" className="text-xs sm:text-sm">Contracts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab facility={facility} shifts={facilityShifts} contacts={facilityContacts} onUpdate={updateFacility} onAddContact={addContact} onUpdateContact={updateContact} onDeleteContact={deleteContact} facilityId={facility.id} facilityTerms={facilityTerms} onSaveRates={handleSaveRates} confirmationSettings={getSettings(facility.id)} onSaveConfirmationSettings={saveSettings} />
        </TabsContent>

        <TabsContent value="shifts" className="mt-4">
          <ShiftsTab shifts={facilityShifts} allShifts={shifts} facilityId={facility.id} facilities={facilities} terms={terms} onAdd={addShift} onUpdate={updateShift} onDelete={deleteShift} />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <InvoicesTab invoices={facilityInvoices} onNavigate={(iid) => navigate(`/invoices/${iid}`)} />
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <ContractsTab facilityId={facility.id} facilityTerms={facilityTerms} onUpdateTerms={updateTerms} />
        </TabsContent>


      </Tabs>

    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────

function OverviewTab({ facility, shifts, contacts, onUpdate, onAddContact, onUpdateContact, onDeleteContact, facilityId, facilityTerms, onSaveRates, confirmationSettings, onSaveConfirmationSettings }: {
  facility: any; shifts: any[]; contacts: FacilityContact[]; onUpdate: any;
  onAddContact: (c: Omit<FacilityContact, 'id'>) => void;
  onUpdateContact: (c: FacilityContact) => void;
  onDeleteContact: (id: string) => void;
  facilityId: string;
  facilityTerms?: TermsSnapshot;
  onSaveRates: (rates: RateEntry[]) => void;
  confirmationSettings: import('@/types/clinicConfirmations').FacilityConfirmationSettings | null;
  onSaveConfirmationSettings: (s: import('@/types/clinicConfirmations').FacilityConfirmationSettings) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(facility.notes);
  const [status, setStatus] = useState(facility.status);
  const [rates, setRates] = useState<RateEntry[]>(termsToRates(facilityTerms || {}));

  // Contact add/edit state
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', role: '' });

  const upcoming = shifts.filter(s => new Date(s.start_datetime) > new Date() && s.status !== 'canceled').slice(0, 5);

  const handleSave = () => {
    onUpdate({ ...facility, notes, status });
    setEditing(false);
    toast.success('Practice facility updated');
  };

  const openAddContact = () => {
    setEditingContactId(null);
    setContactForm({ name: '', email: '', phone: '', role: '' });
    setShowContactForm(true);
  };

  const openEditContact = (c: FacilityContact) => {
    setEditingContactId(c.id);
    setContactForm({ name: c.name, email: c.email, phone: c.phone, role: c.role });
    setShowContactForm(true);
  };

  const handleSaveContact = () => {
    const trimmedName = contactForm.name.trim();
    if (!trimmedName) return;
    const role = contactForm.role.trim() || 'Other';
    if (editingContactId) {
      const existing = contacts.find(c => c.id === editingContactId);
      if (existing) {
        onUpdateContact({ ...existing, name: trimmedName, email: contactForm.email.trim(), phone: contactForm.phone.trim(), role });
      }
    } else {
      onAddContact({ facility_id: facilityId, name: trimmedName, role, email: contactForm.email.trim(), phone: contactForm.phone.trim(), is_primary: contacts.length === 0 });
    }
    setShowContactForm(false);
    setEditingContactId(null);
    toast.success('Contact saved');
  };

  const handleDeleteContact = (id: string) => {
    if (confirm('Remove this contact?')) {
      onDeleteContact(id);
      toast.success('Contact removed');
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Details</CardTitle>
            {editing ? (
              <Button size="sm" onClick={handleSave}><Save className="mr-1 h-3 w-3" /> Save</Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Edit2 className="mr-1 h-3 w-3" /> Edit</Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              {editing ? (
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p><StatusBadge status={facility.status} /></p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Timezone</Label>
              <p className="text-sm">{facility.timezone}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              {editing ? (
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
              ) : (
                <p className="text-sm">{facility.notes || 'No notes'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <RatesEditor rates={rates} onChange={setRates} onSave={onSaveRates} />

        <ClinicNotesCard facility={facility} onUpdate={onUpdate} />

        <MileageOverrideCard facility={facility} onUpdate={onUpdate} />
      </div>

      <div className="space-y-4">
        <InvoicingPreferencesCard facility={facility} onUpdate={onUpdate} />

        <FacilityConfirmationSettingsCard
          facilityId={facilityId}
          settings={confirmationSettings}
          onSave={onSaveConfirmationSettings}
        />

        <Card>
          <CardHeader><CardTitle className="text-base">Upcoming Shifts</CardTitle></CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming shifts</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map(s => (
                  <div key={s.id} className="flex justify-between items-center p-2 rounded bg-muted/50 text-sm">
                    <span>{format(new Date(s.start_datetime), 'EEE, MMM d · h:mm a')}</span>
                    <StatusBadge status={s.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Editable Name ─────────────────────────────────────────

function EditableFacilityName({ facility, onSave }: { facility: any; onSave: (name: string, address: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(facility.name);
  const [address, setAddress] = useState(facility.address);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), address.trim());
      setEditing(false);
    }
  };

  const handleCancel = () => {
    setName(facility.name);
    setAddress(facility.address);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="group">
        <div className="flex items-center gap-2">
          <h1 className="page-title">{facility.name}</h1>
          <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{facility.address || 'No address'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Input value={name} onChange={e => setName(e.target.value)} autoFocus className="text-lg font-semibold h-9 w-full max-w-xs"
          onKeyDown={e => { if (e.key === 'Escape') handleCancel(); }} />
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleSave}><Check className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleCancel}><X className="h-4 w-4" /></Button>
      </div>
      <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" className="text-sm h-8 w-full max-w-sm text-muted-foreground"
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }} />
    </div>
  );
}

// (ContactsTab removed — contact is now managed in OverviewTab)

// (Terms tab removed — rates moved to Overview, policies moved to Contract Vault & Terms)

// (Tech Access and Clinic Access merged into ClinicNotesCard on Overview tab)

// ─── Shifts Tab ────────────────────────────────────────────

function ShiftsTab({ shifts, allShifts, facilityId, facilities, terms, onAdd, onUpdate, onDelete }: { shifts: any[]; allShifts: any[]; facilityId: string; facilities: any[]; terms: any[]; onAdd: (s: any) => Promise<any>; onUpdate: (s: any) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editShift, setEditShift] = useState<any>(null);

  const handleSave = async (s: any) => {
    if (s.id) {
      await onUpdate(s);
    } else {
      await onAdd(s);
    }
    toast.success(s.id ? 'Shift updated' : 'Shift added');
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1 h-3 w-3" /> Add Shift</Button>
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto -mx-3 sm:mx-0">
        <table className="w-full text-sm min-w-[450px] sm:min-w-0">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
            <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Time</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Rate</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
          </tr></thead>
          <tbody>
            {shifts.map(s => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setEditShift(s)}>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${s.color === 'blue' ? 'bg-blue-500' : s.color === 'green' ? 'bg-green-500' : s.color === 'red' ? 'bg-red-500' : s.color === 'orange' ? 'bg-orange-500' : s.color === 'purple' ? 'bg-purple-500' : s.color === 'pink' ? 'bg-pink-500' : s.color === 'teal' ? 'bg-teal-500' : s.color === 'yellow' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                    {format(new Date(s.start_datetime), 'MMM d, yyyy')}
                  </div>
                </td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell">{format(new Date(s.start_datetime), 'h:mm a')} - {format(new Date(s.end_datetime), 'h:mm a')}</td>
                <td className="p-3">${s.rate_applied}</td>
                <td className="p-3"><StatusBadge status={s.status} /></td>
              </tr>
            ))}
            {shifts.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No shifts</td></tr>}
          </tbody>
        </table>
      </div>

      <ShiftFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        facilities={facilities}
        shifts={allShifts}
        terms={terms}
        onSave={handleSave}
      />

      {editShift && (
        <ShiftFormDialog
          key={editShift.id}
          open={!!editShift}
          onOpenChange={() => setEditShift(null)}
          facilities={facilities}
          shifts={allShifts}
          terms={terms}
          existing={editShift}
          onSave={handleSave}
          onDelete={(id) => { onDelete(id); setEditShift(null); toast.success('Shift deleted'); }}
        />
      )}
    </div>
  );
}

// ─── Invoices Tab ──────────────────────────────────────────

function InvoicesTab({ invoices, onNavigate }: { invoices: any[]; onNavigate: (id: string) => void }) {
  return (
    <div className="rounded-lg border bg-card overflow-x-auto -mx-3 sm:mx-0">
      <table className="w-full text-sm min-w-[450px] sm:min-w-0">
        <thead><tr className="border-b bg-muted/50">
          <th className="text-left p-3 font-medium text-muted-foreground">Invoice #</th>
          <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Period</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
        </tr></thead>
        <tbody>
          {invoices.map(i => (
            <tr key={i.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => onNavigate(i.id)}>
              <td className="p-3 font-medium">{i.invoice_number}</td>
              <td className="p-3 text-muted-foreground hidden sm:table-cell">{format(new Date(i.period_start), 'MMM d')} - {format(new Date(i.period_end), 'MMM d')}</td>
              <td className="p-3">${i.total_amount.toLocaleString()}</td>
              <td className="p-3"><StatusBadge status={i.status} /></td>
            </tr>
          ))}
          {invoices.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No invoices</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ─── Invoice Settings Card removed — replaced by InvoicingPreferencesCard component ───

// ─── Mileage Override Card ─────────────────────────────────

function MileageOverrideCard({ facility, onUpdate }: { facility: any; onUpdate: any }) {
  const [editing, setEditing] = useState(false);
  const [miles, setMiles] = useState(facility.mileage_override_miles?.toString() || '');

  const handleSave = () => {
    const val = miles.trim() ? parseFloat(miles) : null;
    onUpdate({ ...facility, mileage_override_miles: val });
    setEditing(false);
    toast.success('Mileage distance saved');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Mileage from Home</CardTitle>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}><Save className="mr-1 h-3 w-3" /> Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setMiles(facility.mileage_override_miles?.toString() || ''); setEditing(false); }}>Cancel</Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Edit2 className="mr-1 h-3 w-3" /> Edit</Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <div>
            <Label className="text-xs text-muted-foreground">One-way distance (miles)</Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={miles}
              onChange={e => setMiles(e.target.value)}
              placeholder="e.g. 22"
              className="w-32 mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Set a fixed distance to skip automatic calculation.
            </p>
          </div>
        ) : (
          <div>
            {facility.mileage_override_miles ? (
              <p className="text-sm font-medium">{facility.mileage_override_miles} miles (one-way)</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No fixed distance set — will be calculated automatically.</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Used for automatic mileage expense tracking after shifts.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
