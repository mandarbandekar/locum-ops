import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { ArrowLeft, Plus, Trash2, Edit2, Save, Pencil, Check, X, Car, Users, FileText, CalendarDays, Receipt, Mail, Phone } from 'lucide-react';
import { FacilityContact, TermsSnapshot } from '@/types';
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
import { EngagementSelector } from '@/components/facilities/EngagementSelector';
import { BreakPolicySelector } from '@/components/facilities/BreakPolicySelector';
import { getBreakPolicyLabel } from '@/lib/shiftBreak';
import type { EngagementType, TaxFormType } from '@/lib/engagementOptions';

export default function FacilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { facilities, contacts, terms, shifts, invoices, updateFacility, addContact, updateContact, deleteContact, updateTerms, addShift, updateShift, deleteShift } = useData();
  const { getSettings, saveSettings } = useClinicConfirmations();

  const facility = facilities.find(c => c.id === id);
  if (!facility) return <div className="p-6">Clinic not found. <Button variant="link" onClick={() => navigate('/facilities')}>Back</Button></div>;

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
        <EditableFacilityName facility={facility} onSave={(newName, newAddress) => { updateFacility({ ...facility, name: newName, address: newAddress }); toast.success('Clinic updated'); }} />
        <StatusBadge status={facility.status} className="ml-1 sm:ml-3 shrink-0" />
        <div className="flex-1" />
      </div>

      <Tabs defaultValue="contract">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="contract" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Contract</TabsTrigger>
          <TabsTrigger value="shifts" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Shifts ({facilityShifts.length})</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5"><Receipt className="h-3.5 w-3.5" /> Invoices ({facilityInvoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="contract" className="mt-4">
          <ContractTab
            facility={facility}
            facilityTerms={facilityTerms}
            onSaveRates={handleSaveRates}
            onUpdateTerms={updateTerms}
            onUpdateFacility={updateFacility}
            confirmationSettings={getSettings(facility.id)}
            onSaveConfirmationSettings={saveSettings}
          />
        </TabsContent>

        <TabsContent value="shifts" className="mt-4">
          <ShiftsTab shifts={facilityShifts} allShifts={shifts} facilityId={facility.id} facilities={facilities} terms={terms} onAdd={addShift} onUpdate={updateShift} onDelete={deleteShift} />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <InvoicesTab invoices={facilityInvoices} onNavigate={(iid) => navigate(`/invoices/${iid}`)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Shared empty state ────────────────────────────────────

function EmptyState({ icon: Icon, title, description, action }: { icon: any; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-12 flex flex-col items-center text-center">
      <div className="rounded-full bg-muted p-3 mb-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-base">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Tab section wrapper for consistent layout ─────────────

function TabSection({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Contacts Tab ──────────────────────────────────────────

function ContactsTab({ facilityId, facility, contacts, onAddContact, onUpdateContact, onDeleteContact, onUpdateFacility }: {
  facilityId: string;
  facility: any;
  contacts: FacilityContact[];
  onAddContact: (c: Omit<FacilityContact, 'id'>) => void;
  onUpdateContact: (c: FacilityContact) => void;
  onDeleteContact: (id: string) => void;
  onUpdateFacility: (f: any) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: '' });

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', email: '', phone: '', role: '' });
    setShowForm(true);
  };
  const openEdit = (c: FacilityContact) => {
    setEditingId(c.id);
    setForm({ name: c.name, email: c.email, phone: c.phone, role: c.role });
    setShowForm(true);
  };
  const handleSave = () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) return;
    const role = form.role.trim() || 'Other';
    if (editingId) {
      const existing = contacts.find(c => c.id === editingId);
      if (existing) onUpdateContact({ ...existing, name: trimmedName, email: form.email.trim(), phone: form.phone.trim(), role });
    } else {
      onAddContact({ facility_id: facilityId, name: trimmedName, role, email: form.email.trim(), phone: form.phone.trim(), is_primary: contacts.length === 0 });
    }
    setShowForm(false);
    setEditingId(null);
    toast.success('Contact saved');
  };
  const handleDelete = (id: string) => {
    if (confirm('Remove this contact?')) {
      onDeleteContact(id);
      toast.success('Contact removed');
    }
  };

  return (
    <div className="space-y-6">
      <TabSection
        title="People"
        action={<Button size="sm" onClick={openAdd}><Plus className="mr-1 h-3 w-3" /> Add Contact</Button>}
      >
        {contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Add the people you coordinate with at this clinic — schedulers, office managers, or billing contacts."
            action={<Button size="sm" onClick={openAdd}><Plus className="mr-1 h-3 w-3" /> Add your first contact</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contacts.map(c => (
              <div key={c.id} className="rounded-lg border bg-card p-4 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.role}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  {c.email && (
                    <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {!c.email && !c.phone && (
                    <p className="text-muted-foreground italic">No contact details</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </TabSection>

      <ClinicNotesCard facility={facility} onUpdate={onUpdateFacility} />

      {showForm && (
        <ContactFormDialog
          open={showForm}
          onOpenChange={setShowForm}
          form={form}
          onChange={setForm}
          onSave={handleSave}
          isEdit={!!editingId}
        />
      )}
    </div>
  );
}

function ContactFormDialog({ open, onOpenChange, form, onChange, onSave, isEdit }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  form: { name: string; email: string; phone: string; role: string };
  onChange: (f: { name: string; email: string; phone: string; role: string }) => void;
  onSave: () => void;
  isEdit: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Contact' : 'Add Contact'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={form.name} onChange={e => onChange({ ...form, name: e.target.value })} autoFocus />
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <Input value={form.role} onChange={e => onChange({ ...form, role: e.target.value })} placeholder="e.g. Office Manager" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" value={form.email} onChange={e => onChange({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={form.phone} onChange={e => onChange({ ...form, phone: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={onSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Contract Tab ──────────────────────────────────────────

function ContractTab({ facility, facilityTerms, onSaveRates, onUpdateTerms, onUpdateFacility, confirmationSettings, onSaveConfirmationSettings }: {
  facility: any;
  facilityTerms?: TermsSnapshot;
  onSaveRates: (rates: RateEntry[]) => void;
  onUpdateTerms: (t: TermsSnapshot) => void;
  onUpdateFacility: (f: any) => void;
  confirmationSettings: import('@/types/clinicConfirmations').FacilityConfirmationSettings | null;
  onSaveConfirmationSettings: (s: import('@/types/clinicConfirmations').FacilityConfirmationSettings) => void;
}) {
  const [editingDetails, setEditingDetails] = useState(false);
  const [status, setStatus] = useState(facility.status);
  const [engagementType, setEngagementType] = useState<EngagementType>((facility.engagement_type || 'direct') as EngagementType);
  const [sourceName, setSourceName] = useState<string>(facility.source_name || '');
  const [taxFormType, setTaxFormType] = useState<TaxFormType>((facility.tax_form_type as TaxFormType) || '1099');
  const [rates, setRates] = useState<RateEntry[]>(termsToRates(facilityTerms || {}));

  const handleSaveDetails = () => {
    const isDirect = engagementType === 'direct';
    const effectiveTaxForm = engagementType === 'third_party' ? taxFormType : null;
    onUpdateFacility({
      ...facility,
      status,
      engagement_type: engagementType,
      source_name: isDirect ? null : (sourceName.trim() || null),
      tax_form_type: effectiveTaxForm,
      auto_generate_invoices: isDirect ? facility.auto_generate_invoices : false,
    });
    setEditingDetails(false);
    toast.success('Engagement updated');
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Engagement</CardTitle>
            {editingDetails ? (
              <Button size="sm" onClick={handleSaveDetails}><Save className="mr-1 h-3 w-3" /> Save</Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setEditingDetails(true)}><Edit2 className="mr-1 h-3 w-3" /> Edit</Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              {editingDetails ? (
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
            <div className="border-t border-border pt-3">
              {editingDetails ? (
                <EngagementSelector
                  engagementType={engagementType}
                  onEngagementTypeChange={setEngagementType}
                  sourceName={sourceName}
                  onSourceNameChange={setSourceName}
                  taxFormType={taxFormType}
                  onTaxFormTypeChange={setTaxFormType}
                  compact
                />
              ) : (
                <>
                  <Label className="text-xs text-muted-foreground">Engagement</Label>
                  <p className="text-sm">
                    {facility.engagement_type === 'third_party'
                      ? `Platform / Agency — ${facility.source_name || 'Source'}${facility.tax_form_type ? ` (${facility.tax_form_type === 'w2' ? 'W-2' : '1099'})` : ''}`
                      : 'Direct / Independent'}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {engagementType !== 'direct' && (
          <RatesEditor rates={rates} onChange={setRates} onSave={onSaveRates} />
        )}

        {engagementType !== 'direct' && (
          <BreakPolicyCard facility={facility} onUpdate={onUpdateFacility} />
        )}

        <MileageOverrideCard facility={facility} onUpdate={onUpdateFacility} />
      </div>

      <div className="space-y-4">
        {engagementType === 'direct' && (
          <>
            <InvoicingPreferencesCard facility={facility} onUpdate={onUpdateFacility} />
            <FacilityConfirmationSettingsCard
              facilityId={facility.id}
              settings={confirmationSettings}
              onSave={onSaveConfirmationSettings}
            />
          </>
        )}

        {engagementType !== 'direct' && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                {engagementType === 'third_party'
                  ? `${facility.source_name || 'This platform'} handles billing for these shifts, so invoicing settings and clinic confirmations don't apply here.`
                  : ''}
              </p>
            </CardContent>
          </Card>
        )}

        <ContractsTab facilityId={facility.id} facilityTerms={facilityTerms} onUpdateTerms={onUpdateTerms} />
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

// ─── Shifts Tab ────────────────────────────────────────────

function ShiftsTab({ shifts, allShifts, facilityId, facilities, terms, onAdd, onUpdate, onDelete }: { shifts: any[]; allShifts: any[]; facilityId: string; facilities: any[]; terms: any[]; onAdd: (s: any) => Promise<any>; onUpdate: (s: any) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editShift, setEditShift] = useState<any>(null);

  const handleSave = async (s: any) => {
    if (s.id) await onUpdate(s);
    else await onAdd(s);
    toast.success(s.id ? 'Shift updated' : 'Shift added');
  };

  return (
    <TabSection
      title="Shifts at this clinic"
      action={<Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1 h-3 w-3" /> Add Shift</Button>}
    >
      {shifts.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No shifts scheduled"
          description="Add a shift to start tracking your work at this clinic. Invoices will be auto-generated based on your billing cadence."
          action={<Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1 h-3 w-3" /> Add a shift</Button>}
        />
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[450px]">
            <thead><tr className="border-b bg-muted/40">
              <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Date</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Time</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Rate</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
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
            </tbody>
          </table>
        </div>
      )}

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
    </TabSection>
  );
}

// ─── Invoices Tab ──────────────────────────────────────────

function InvoicesTab({ invoices, onNavigate }: { invoices: any[]; onNavigate: (id: string) => void }) {
  return (
    <TabSection title="Invoices for this clinic">
      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Invoices are auto-generated from completed shifts based on this clinic's billing cadence. Add a shift to get started."
        />
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[450px]">
            <thead><tr className="border-b bg-muted/40">
              <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Invoice #</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Period</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Amount</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
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
            </tbody>
          </table>
        </div>
      )}
    </TabSection>
  );
}

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

// ─── Break Policy Card ─────────────────────────────────────

function BreakPolicyCard({ facility, onUpdate }: { facility: any; onUpdate: (f: any) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<number | null>(facility.default_break_minutes ?? null);

  const handleSave = () => {
    onUpdate({ ...facility, default_break_minutes: value });
    setEditing(false);
    toast.success('Break policy saved');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Break Policy</CardTitle>
        {editing ? (
          <Button size="sm" onClick={handleSave}><Save className="mr-1 h-3 w-3" /> Save</Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => { setValue(facility.default_break_minutes ?? null); setEditing(true); }}>
            <Edit2 className="mr-1 h-3 w-3" /> Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {editing ? (
          <BreakPolicySelector
            value={value}
            onChange={setValue}
            helper="Default for new shifts at this clinic. You can override per shift."
            compact
          />
        ) : (
          <>
            <p className="text-sm font-medium">{getBreakPolicyLabel(facility.default_break_minutes)}</p>
            <p className="text-xs text-muted-foreground">
              Applied as the default unpaid break to new shifts at this clinic. Per-shift overrides always win.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
