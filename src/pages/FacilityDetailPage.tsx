import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, Plus, Trash2, Edit2, Save, Pencil, Check, X, Car, Users, FileText, CalendarDays, Receipt, Mail, Phone, CheckSquare } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { FacilityContact, TermsSnapshot } from '@/types';
import { generateId } from '@/lib/businessLogic';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ContractsTab } from '@/components/contracts/ContractsTab';
import { RatesEditor, termsToRates, ratesToTermsFields, RateEntry } from '@/components/facilities/RatesEditor';
import { ShiftFormDialog } from '@/components/schedule/ShiftFormDialog';
import { FacilityConfirmationSettingsCard } from '@/components/schedule/FacilityConfirmationSettingsCard';
import { ClinicConfirmationsTab } from '@/components/schedule/ClinicConfirmationsTab';
import { useClinicConfirmations } from '@/hooks/useClinicConfirmations';
import { InvoicingPreferencesCard } from '@/components/facilities/InvoicingPreferencesCard';
import { ClinicNotesCard } from '@/components/facilities/ClinicNotesCard';
import { ClinicExperienceCard } from '@/components/facilities/ClinicExperienceCard';
import { EngagementSelector } from '@/components/facilities/EngagementSelector';
import { BreakPolicySelector } from '@/components/facilities/BreakPolicySelector';
import { getBreakPolicyLabel } from '@/lib/shiftBreak';
import type { EngagementType, TaxFormType } from '@/lib/engagementOptions';
import { US_TIMEZONES, coerceToUsTz, labelForTz } from '@/lib/usTimezones';
import tzlookup from 'tz-lookup';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import { FacilityTimezoneChangeDialog } from '@/components/facilities/FacilityTimezoneChangeDialog';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { formatDateInTz, formatTimeInTz, zonedWallClockToUtc, formatYMDInTz, formatHHMMInTz } from '@/lib/tzTime';

import { useIsMobileShell } from '@/hooks/useIsMobileShell';
import { MobileClinicDetailPage } from '@/pages/mobile/MobileClinicDetailPage';

export default function FacilityDetailPage() {
  const isMobile = useIsMobileShell();
  if (isMobile) return <MobileClinicDetailPage />;
  return <DesktopFacilityDetailPage />;
}

function DesktopFacilityDetailPage() {
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
        <EditableFacilityName
          facility={facility}
          onSave={(newName, newAddress, extras) => {
            updateFacility({
              ...facility,
              name: newName,
              address: newAddress,
              ...(extras?.coords ? { facility_coordinates: extras.coords } : {}),
              ...(extras?.timezone ? { timezone: extras.timezone } : {}),
            });
            toast.success(extras?.timezone ? `Clinic updated · timezone set to ${extras.timezone}` : 'Clinic updated');
          }}
        />
        <StatusBadge status={facility.status} className="ml-1 sm:ml-3 shrink-0" />
        <div className="flex-1" />
      </div>




      <Tabs defaultValue="contract">

        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="contract" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Clinic Overview</TabsTrigger>
          <TabsTrigger value="people" className="gap-1.5"><Users className="h-3.5 w-3.5" /> People & Access ({facilityContacts.length})</TabsTrigger>
          <TabsTrigger value="shifts" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Shifts ({facilityShifts.length})</TabsTrigger>
          <TabsTrigger value="confirmations" className="gap-1.5"><CheckSquare className="h-3.5 w-3.5" /> Confirmations</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5"><Receipt className="h-3.5 w-3.5" /> Invoices ({facilityInvoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="contract" className="mt-4">
          <ContractTab
            facility={facility}
            facilityTerms={facilityTerms}
            facilityShifts={facilityShifts}
            onSaveRates={handleSaveRates}
            onUpdateTerms={updateTerms}
            onUpdateFacility={updateFacility}
            onUpdateShift={updateShift}
            confirmationSettings={getSettings(facility.id)}
            onSaveConfirmationSettings={saveSettings}
          />
        </TabsContent>

        <TabsContent value="people" className="mt-4">
          <ContactsTab
            facilityId={facility.id}
            facility={facility}
            contacts={facilityContacts}
            onAddContact={addContact}
            onUpdateContact={updateContact}
            onDeleteContact={deleteContact}
            onUpdateFacility={updateFacility}
          />
        </TabsContent>

        <TabsContent value="shifts" className="mt-4">
          <ShiftsTab shifts={facilityShifts} allShifts={shifts} facilityId={facility.id} facilities={facilities} terms={terms} onAdd={addShift} onUpdate={updateShift} onDelete={deleteShift} />
        </TabsContent>

        <TabsContent value="confirmations" className="mt-4">
          <ClinicConfirmationsTab facilityId={facility.id} />
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

      <ClinicExperienceCard facility={facility} onUpdate={onUpdateFacility} />

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

function ContractTab({ facility, facilityTerms, facilityShifts, onSaveRates, onUpdateTerms, onUpdateFacility, onUpdateShift, confirmationSettings, onSaveConfirmationSettings }: {
  facility: any;
  facilityTerms?: TermsSnapshot;
  facilityShifts: any[];
  onSaveRates: (rates: RateEntry[]) => void;
  onUpdateTerms: (t: TermsSnapshot) => void;
  onUpdateFacility: (f: any) => void;
  onUpdateShift: (s: any) => void | Promise<any>;
  confirmationSettings: import('@/types/clinicConfirmations').FacilityConfirmationSettings | null;
  onSaveConfirmationSettings: (s: import('@/types/clinicConfirmations').FacilityConfirmationSettings) => void;
}) {
  const [editingDetails, setEditingDetails] = useState(false);
  const [status, setStatus] = useState(facility.status);
  const [timezone, setTimezone] = useState<string>(facility.timezone || 'America/New_York');
  const [tzConfirmOpen, setTzConfirmOpen] = useState(false);
  const [engagementType, setEngagementType] = useState<EngagementType>((facility.engagement_type || 'direct') as EngagementType);
  const [sourceName, setSourceName] = useState<string>(facility.source_name || '');
  const [taxFormType, setTaxFormType] = useState<TaxFormType>((facility.tax_form_type as TaxFormType) || '1099');
  const [generatesInvoices, setGeneratesInvoices] = useState<boolean>(facility.generates_invoices !== false);
  const [rates, setRates] = useState<RateEntry[]>(termsToRates(facilityTerms || {}));

  const commitSave = (tzToSave: string) => {
    const isDirect = engagementType === 'direct';
    const directInvoicing = isDirect && generatesInvoices;
    const effectiveTaxForm = engagementType === 'third_party' ? taxFormType : null;
    onUpdateFacility({
      ...facility,
      status,
      timezone: tzToSave,
      engagement_type: engagementType,
      source_name: isDirect ? null : (sourceName.trim() || null),
      tax_form_type: effectiveTaxForm,
      generates_invoices: directInvoicing,
      auto_generate_invoices: directInvoicing ? facility.auto_generate_invoices : false,
    });
    setEditingDetails(false);
    toast.success('Engagement updated');
  };

  const handleSaveDetails = () => {
    const tzChanged = timezone !== (facility.timezone || 'America/New_York');
    if (tzChanged) {
      setTzConfirmOpen(true);
      return;
    }
    commitSave(timezone);
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
              {editingDetails ? (
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {US_TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">{facility.timezone}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Shifts at this clinic display in this timezone.</p>
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
                  generatesInvoices={generatesInvoices}
                  onGeneratesInvoicesChange={setGeneratesInvoices}
                  compact
                />
              ) : (
                <>
                  <Label className="text-xs text-muted-foreground">Engagement</Label>
                  <p className="text-sm">
                    {facility.engagement_type === 'third_party'
                      ? `Platform / Agency — ${facility.source_name || 'Source'}${facility.tax_form_type ? ` (${facility.tax_form_type === 'w2' ? 'W-2' : '1099'})` : ''}`
                      : facility.generates_invoices === false
                        ? 'Direct — no invoicing (1099 from clinic)'
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
        {engagementType === 'direct' && facility.generates_invoices !== false && (
          <>
            <InvoicingPreferencesCard facility={facility} onUpdate={onUpdateFacility} />
            <FacilityConfirmationSettingsCard
              facilityId={facility.id}
              settings={confirmationSettings}
              onSave={onSaveConfirmationSettings}
            />
          </>
        )}

        {engagementType === 'direct' && facility.generates_invoices === false && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Invoicing is off for this clinic. They pay you directly and will issue a 1099 at year-end. Shifts here still count toward your income and tax projections. Switch this in the engagement section if that changes.
              </p>
            </CardContent>
          </Card>
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
      <FacilityTimezoneChangeDialog
        open={tzConfirmOpen}
        oldTz={facility.timezone || 'America/New_York'}
        newTz={timezone}
        existingShiftCount={facilityShifts.length}
        onCancel={() => setTzConfirmOpen(false)}
        onConfirm={async ({ rebaseExisting }) => {
          setTzConfirmOpen(false);
          const oldTz = facility.timezone || 'America/New_York';
          commitSave(timezone);
          if (rebaseExisting && oldTz !== timezone) {
            // Keep the wall-clock the user typed; reinterpret it in the new tz.
            let updated = 0;
            for (const s of facilityShifts) {
              try {
                const stampTz = s.timezone_at_creation || oldTz;
                const ymd = formatYMDInTz(s.start_datetime, stampTz);
                const startHHMM = formatHHMMInTz(s.start_datetime, stampTz);
                const endHHMM = formatHHMMInTz(s.end_datetime, stampTz);
                const newStart = zonedWallClockToUtc(ymd, startHHMM, timezone);
                let newEnd = zonedWallClockToUtc(ymd, endHHMM, timezone);
                if (newEnd.getTime() <= newStart.getTime()) {
                  newEnd = new Date(newEnd.getTime() + 24 * 60 * 60 * 1000);
                }
                await onUpdateShift({
                  ...s,
                  start_datetime: newStart.toISOString(),
                  end_datetime: newEnd.toISOString(),
                  timezone_at_creation: timezone,
                });
                updated += 1;
              } catch (err) {
                console.error('Failed to rebase shift', s.id, err);
              }
            }
            toast.success(`Rebased ${updated} shift${updated === 1 ? '' : 's'} to ${timezone}`);
          }
        }}
      />
    </div>
  );
}

// ─── Editable Name ─────────────────────────────────────────

type AddressExtras = { coords?: { lat: number; lng: number } | null; timezone?: string | null };

function EditableFacilityName({ facility, onSave }: { facility: any; onSave: (name: string, address: string, extras?: AddressExtras) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(facility.name);
  const [address, setAddress] = useState(facility.address);
  // Coords + derived tz from the latest Google Places selection (if any).
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [derivedTz, setDerivedTz] = useState<string | null>(null);
  const [acceptTzSuggestion, setAcceptTzSuggestion] = useState(true);

  const currentTz = facility.timezone || 'America/New_York';
  const tzMismatch = !!derivedTz && derivedTz !== currentTz;

  const handlePlaceSelect = (sel: { formatted_address?: string; lat?: number | null; lng?: number | null }) => {
    if (sel.formatted_address) setAddress(sel.formatted_address);
    if (typeof sel.lat === 'number' && typeof sel.lng === 'number') {
      setPendingCoords({ lat: sel.lat, lng: sel.lng });
      try {
        const iana = tzlookup(sel.lat, sel.lng);
        const us = coerceToUsTz(iana);
        setDerivedTz(us);
        setAcceptTzSuggestion(true);
      } catch {
        setDerivedTz(null);
      }
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const extras: AddressExtras = {
      coords: pendingCoords,
      timezone: tzMismatch && acceptTzSuggestion ? derivedTz : null,
    };
    onSave(name.trim(), address.trim(), extras);
    setEditing(false);
    setPendingCoords(null);
    setDerivedTz(null);
  };

  const handleCancel = () => {
    setName(facility.name);
    setAddress(facility.address);
    setPendingCoords(null);
    setDerivedTz(null);
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
      <div className="w-full max-w-sm">
        <GooglePlacesAutocomplete
          value={address}
          onChange={(v) => {
            setAddress(v);
            // Free-text edits invalidate the previous coord-derived tz suggestion.
            if (pendingCoords) { setPendingCoords(null); setDerivedTz(null); }
          }}
          placeholder="Address"
          searchType="address"
          onPlaceSelect={handlePlaceSelect}
          className="text-sm h-8"
        />
      </div>
      {tzMismatch && (
        <div className="max-w-sm rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
          <div className="flex items-start gap-2">
            <input
              id="accept-tz-suggestion"
              type="checkbox"
              className="mt-0.5"
              checked={acceptTzSuggestion}
              onChange={(e) => setAcceptTzSuggestion(e.target.checked)}
            />
            <label htmlFor="accept-tz-suggestion" className="leading-snug">
              This address is in <strong>{labelForTz(derivedTz!)}</strong>. The clinic's saved timezone is <strong>{labelForTz(currentTz)}</strong>.
              <br />Update timezone to match the new address?
            </label>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground pl-6">
            Existing shifts keep their original timezone snapshot; only new shifts use the updated zone.
          </p>
        </div>
      )}
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
                      {formatDateInTz(s.start_datetime, s.timezone_at_creation || facilities.find(f => f.id === facilityId)?.timezone || 'America/New_York', 'MMM d, yyyy')}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell">{formatTimeInTz(s.start_datetime, s.timezone_at_creation || facilities.find(f => f.id === facilityId)?.timezone || 'America/New_York')} - {formatTimeInTz(s.end_datetime, s.timezone_at_creation || facilities.find(f => f.id === facilityId)?.timezone || 'America/New_York')}</td>
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
        lockedFacilityId={facilityId}
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
          lockedFacilityId={facilityId}
        />
      )}
    </TabSection>
  );
}

// ─── Invoices Tab ──────────────────────────────────────────

function InvoicesTab({ invoices, onNavigate }: { invoices: any[]; onNavigate: (id: string) => void }) {
  const { profile } = useUserProfile();
  const profileTz = profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
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
                  <td className="p-3 text-muted-foreground hidden sm:table-cell">{formatDateInTz(i.period_start, profileTz, 'MMM d')} - {formatDateInTz(i.period_end, profileTz, 'MMM d')}</td>
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
  const tracking = facility.track_mileage !== false;

  const handleSave = () => {
    const val = miles.trim() ? parseFloat(miles) : null;
    onUpdate({ ...facility, mileage_override_miles: val });
    setEditing(false);
    toast.success('Mileage distance saved');
  };

  const handleToggleTracking = (checked: boolean) => {
    onUpdate({ ...facility, track_mileage: checked });
    if (!checked) setEditing(false);
    toast.success(checked ? 'Mileage tracking enabled' : 'Mileage tracking disabled for this clinic');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Mileage from Home</CardTitle>
        </div>
        {tracking && (editing ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}><Save className="mr-1 h-3 w-3" /> Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setMiles(facility.mileage_override_miles?.toString() || ''); setEditing(false); }}>Cancel</Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Edit2 className="mr-1 h-3 w-3" /> Edit</Button>
        ))}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/40">
          <div>
            <p className="text-sm font-medium">Track mileage for this clinic</p>
            <p className="text-xs text-muted-foreground">Turn off if you don't drive to this clinic (e.g. telehealth or remote work).</p>
          </div>
          <Switch checked={tracking} onCheckedChange={handleToggleTracking} />
        </div>
        {!tracking ? (
          <p className="text-sm text-muted-foreground italic">Mileage tracking disabled — auto-mileage and backfill will skip this clinic.</p>
        ) : editing ? (
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
