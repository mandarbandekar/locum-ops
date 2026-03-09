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
import { ArrowLeft, Plus, Trash2, Edit2, Save, Pencil, Check, X, Monitor, Wifi, KeyRound, DoorOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FacilityContact, ContactRole, TermsSnapshot, SHIFT_COLORS, ShiftColor } from '@/types';
import { generateId } from '@/lib/businessLogic';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ContractsTab } from '@/components/contracts/ContractsTab';

export default function FacilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { facilities, contacts, terms, shifts, invoices, updateFacility, addContact, updateContact, deleteContact, updateTerms, addShift } = useData();

  const facility = facilities.find(c => c.id === id);
  if (!facility) return <div className="p-6">Practice facility not found. <Button variant="link" onClick={() => navigate('/facilities')}>Back</Button></div>;

  const facilityContacts = contacts.filter(c => c.facility_id === id);
  const facilityTerms = terms.find(c => c.facility_id === id);
  const facilityShifts = shifts.filter(s => s.facility_id === id).sort((a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime());
  const facilityInvoices = invoices.filter(i => i.facility_id === id);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/facilities')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <EditableFacilityName facility={facility} onSave={(newName, newAddress) => { updateFacility({ ...facility, name: newName, address: newAddress }); toast.success('Practice facility updated'); }} />
        <StatusBadge status={facility.status} className="ml-3" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({facilityContacts.length})</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
          <TabsTrigger value="shifts">Shifts ({facilityShifts.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({facilityInvoices.length})</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="tech-access">Tech Access</TabsTrigger>
          <TabsTrigger value="clinic-access">Clinic Access</TabsTrigger>
          <TabsTrigger value="invoice-settings">Invoice Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab facility={facility} shifts={facilityShifts} onUpdate={updateFacility} />
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <ContactsTab contacts={facilityContacts} facilityId={facility.id} onAdd={addContact} onUpdate={updateContact} onDelete={deleteContact} />
        </TabsContent>

        <TabsContent value="terms" className="mt-4">
          <TermsTab terms={facilityTerms} facilityId={facility.id} onUpdate={updateTerms} />
        </TabsContent>

        <TabsContent value="shifts" className="mt-4">
          <ShiftsTab shifts={facilityShifts} facilityId={facility.id} onAdd={addShift} />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <InvoicesTab invoices={facilityInvoices} onNavigate={(iid) => navigate(`/invoices/${iid}`)} />
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <ContractsTab facilityId={facility.id} />
        </TabsContent>

        <TabsContent value="tech-access" className="mt-4">
          <TechAccessTab facility={facility} onUpdate={updateFacility} />
        </TabsContent>

        <TabsContent value="clinic-access" className="mt-4">
          <ClinicAccessTab facility={facility} onUpdate={updateFacility} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────

function OverviewTab({ facility, shifts, onUpdate }: { facility: any; shifts: any[]; onUpdate: any }) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(facility.notes);
  const [status, setStatus] = useState(facility.status);

  const upcoming = shifts.filter(s => new Date(s.start_datetime) > new Date() && s.status !== 'canceled').slice(0, 5);

  const handleSave = () => {
    onUpdate({ ...facility, notes, status });
    setEditing(false);
    toast.success('Practice facility updated');
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
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
        <Input value={name} onChange={e => setName(e.target.value)} autoFocus className="text-lg font-semibold h-9 w-64"
          onKeyDown={e => { if (e.key === 'Escape') handleCancel(); }} />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave}><Check className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancel}><X className="h-4 w-4" /></Button>
      </div>
      <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" className="text-sm h-8 w-80 text-muted-foreground"
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }} />
    </div>
  );
}

// ─── Contacts Tab ──────────────────────────────────────────

function ContactsTab({ contacts, facilityId, onAdd, onUpdate, onDelete }: {
  contacts: FacilityContact[]; facilityId: string;
  onAdd: (c: Omit<FacilityContact, 'id'>) => void;
  onUpdate: (c: FacilityContact) => void;
  onDelete: (id: string) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', role: 'scheduler' as ContactRole, email: '', phone: '', is_primary: false });
  const [editForm, setEditForm] = useState<FacilityContact | null>(null);

  const handleAdd = () => {
    onAdd({ ...form, facility_id: facilityId });
    setShowAdd(false);
    setForm({ name: '', role: 'scheduler', email: '', phone: '', is_primary: false });
    toast.success('Contact added');
  };

  const startEdit = (c: FacilityContact) => {
    setEditingId(c.id);
    setEditForm({ ...c });
  };

  const handleEditSave = () => {
    if (editForm) {
      onUpdate(editForm);
      toast.success('Contact updated');
      setEditingId(null);
      setEditForm(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1 h-3 w-3" /> Add Contact</Button>
      </div>
      <div className="space-y-2">
        {contacts.map(c => (
          <Card key={c.id} className="p-4">
            {editingId === c.id && editForm ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Name</Label><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
                  <div><Label className="text-xs">Role</Label>
                    <Select value={editForm.role} onValueChange={v => setEditForm({ ...editForm, role: v as ContactRole })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduler">Scheduler</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Email</Label><Input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
                  <div><Label className="text-xs">Phone</Label><Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEditSave}><Check className="mr-1 h-3 w-3" /> Save</Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="mr-1 h-3 w-3" /> Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{c.name} {c.is_primary && <span className="text-xs text-primary">(Primary)</span>}</p>
                  <p className="text-xs text-muted-foreground capitalize">{c.role}</p>
                  <p className="text-xs text-muted-foreground">{c.email} · {c.phone}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => startEdit(c)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm('Delete contact?')) { onDelete(c.id); toast.success('Deleted'); } }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
        {contacts.length === 0 && <p className="text-sm text-muted-foreground">No contacts yet</p>}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v as ContactRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduler">Scheduler</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <Button onClick={handleAdd} className="w-full">Add Contact</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Terms Tab ─────────────────────────────────────────────

function TermsTab({ terms, facilityId, onUpdate }: { terms?: TermsSnapshot; facilityId: string; onUpdate: (c: TermsSnapshot) => void }) {
  const [form, setForm] = useState<TermsSnapshot>(terms || {
    id: generateId(), facility_id: facilityId, weekday_rate: 0, weekend_rate: 0,
    partial_day_rate: 0, holiday_rate: 0, telemedicine_rate: 0,
    cancellation_policy_text: '', overtime_policy_text: '', late_payment_policy_text: '', special_notes: '',
  });

  const handleSave = () => {
    onUpdate(form);
    toast.success('Terms saved');
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Weekday Rate ($)</Label><Input type="number" value={form.weekday_rate} onChange={e => setForm(p => ({ ...p, weekday_rate: Number(e.target.value) }))} /></div>
          <div><Label>Weekend Rate ($)</Label><Input type="number" value={form.weekend_rate} onChange={e => setForm(p => ({ ...p, weekend_rate: Number(e.target.value) }))} /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><Label>Partial Day Rate ($)</Label><Input type="number" value={form.partial_day_rate} onChange={e => setForm(p => ({ ...p, partial_day_rate: Number(e.target.value) }))} /></div>
          <div><Label>Holiday Rate ($)</Label><Input type="number" value={form.holiday_rate} onChange={e => setForm(p => ({ ...p, holiday_rate: Number(e.target.value) }))} /></div>
          <div><Label>Telemedicine Rate ($)</Label><Input type="number" value={form.telemedicine_rate} onChange={e => setForm(p => ({ ...p, telemedicine_rate: Number(e.target.value) }))} /></div>
        </div>
        <div><Label>Cancellation Policy</Label><Textarea value={form.cancellation_policy_text} onChange={e => setForm(p => ({ ...p, cancellation_policy_text: e.target.value }))} rows={2} /></div>
        <div><Label>Overtime Policy</Label><Textarea value={form.overtime_policy_text} onChange={e => setForm(p => ({ ...p, overtime_policy_text: e.target.value }))} rows={2} /></div>
        <div><Label>Late Payment Policy</Label><Textarea value={form.late_payment_policy_text} onChange={e => setForm(p => ({ ...p, late_payment_policy_text: e.target.value }))} rows={2} /></div>
        <div><Label>Special Notes</Label><Textarea value={form.special_notes} onChange={e => setForm(p => ({ ...p, special_notes: e.target.value }))} rows={2} /></div>
        <p className="text-xs text-muted-foreground italic">Saved terms for reference. Verify against the signed contract.</p>
        <Button onClick={handleSave}>Save Terms</Button>
      </CardContent>
    </Card>
  );
}

// ─── Tech Access Tab ───────────────────────────────────────

function TechAccessTab({ facility, onUpdate }: { facility: any; onUpdate: any }) {
  const [editing, setEditing] = useState(false);
  const [computer, setComputer] = useState(facility.tech_computer_info || '');
  const [wifi, setWifi] = useState(facility.tech_wifi_info || '');
  const [pims, setPims] = useState(facility.tech_pims_info || '');

  const handleSave = () => {
    onUpdate({ ...facility, tech_computer_info: computer, tech_wifi_info: wifi, tech_pims_info: pims });
    setEditing(false);
    toast.success('Tech access info saved');
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Monitor className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Computer / Login</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea value={computer} onChange={e => setComputer(e.target.value)} rows={4} placeholder="Computer login, desktop credentials..." />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{computer || <span className="text-muted-foreground italic">No info added</span>}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Wifi className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">WiFi Passwords</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea value={wifi} onChange={e => setWifi(e.target.value)} rows={4} placeholder="Network name, password..." />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{wifi || <span className="text-muted-foreground italic">No info added</span>}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">PIMS Credentials</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea value={pims} onChange={e => setPims(e.target.value)} rows={4} placeholder="PIMS system, username, password..." />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{pims || <span className="text-muted-foreground italic">No info added</span>}</p>
          )}
        </CardContent>
      </Card>

      <div className="lg:col-span-3">
        {editing ? (
          <div className="flex gap-2">
            <Button onClick={handleSave}><Save className="mr-1 h-3 w-3" /> Save</Button>
            <Button variant="ghost" onClick={() => { setComputer(facility.tech_computer_info || ''); setWifi(facility.tech_wifi_info || ''); setPims(facility.tech_pims_info || ''); setEditing(false); }}>Cancel</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setEditing(true)}><Edit2 className="mr-1 h-3 w-3" /> Edit Tech Access</Button>
        )}
      </div>
    </div>
  );
}

// ─── Clinic Access Tab ─────────────────────────────────────

function ClinicAccessTab({ facility, onUpdate }: { facility: any; onUpdate: any }) {
  const [editing, setEditing] = useState(false);
  const [info, setInfo] = useState(facility.clinic_access_info || '');

  const handleSave = () => {
    onUpdate({ ...facility, clinic_access_info: info });
    setEditing(false);
    toast.success('Clinic access info saved');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <DoorOpen className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">General Clinic Access Information</CardTitle>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}><Save className="mr-1 h-3 w-3" /> Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setInfo(facility.clinic_access_info || ''); setEditing(false); }}>Cancel</Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Edit2 className="mr-1 h-3 w-3" /> Edit</Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <Textarea value={info} onChange={e => setInfo(e.target.value)} rows={6} placeholder="Door codes, parking instructions, key pickup, building access hours, after-hours protocols..." />
        ) : (
          <p className="text-sm whitespace-pre-wrap">{info || <span className="text-muted-foreground italic">No clinic access info added. Click Edit to add door codes, parking info, key details, etc.</span>}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Shifts Tab ────────────────────────────────────────────

function ShiftsTab({ shifts, facilityId, onAdd }: { shifts: any[]; facilityId: string; onAdd: (s: any) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    date: '', start_time: '08:00', end_time: '17:00', rate_applied: 0, status: 'proposed' as string, notes: '', color: 'blue' as ShiftColor
  });

  const handleAdd = () => {
    if (!form.date) return;
    const start_datetime = `${form.date}T${form.start_time}:00`;
    const end_datetime = `${form.date}T${form.end_time}:00`;
    onAdd({ facility_id: facilityId, start_datetime, end_datetime, rate_applied: form.rate_applied, status: form.status, notes: form.notes, color: form.color });
    setShowAdd(false);
    setForm({ date: '', start_time: '08:00', end_time: '17:00', rate_applied: 0, status: 'proposed', notes: '', color: 'blue' });
    toast.success('Shift added');
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1 h-3 w-3" /> Add Shift</Button>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Time</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Rate</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
          </tr></thead>
          <tbody>
            {shifts.map(s => {
              const colorDef = SHIFT_COLORS.find(c => c.value === (s.color || 'blue')) || SHIFT_COLORS[0];
              return (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${s.color === 'blue' ? 'bg-blue-500' : s.color === 'green' ? 'bg-green-500' : s.color === 'red' ? 'bg-red-500' : s.color === 'orange' ? 'bg-orange-500' : s.color === 'purple' ? 'bg-purple-500' : s.color === 'pink' ? 'bg-pink-500' : s.color === 'teal' ? 'bg-teal-500' : s.color === 'yellow' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                      {format(new Date(s.start_datetime), 'MMM d, yyyy')}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{format(new Date(s.start_datetime), 'h:mm a')} - {format(new Date(s.end_datetime), 'h:mm a')}</td>
                  <td className="p-3">${s.rate_applied}</td>
                  <td className="p-3"><StatusBadge status={s.status} /></td>
                </tr>
              );
            })}
            {shifts.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No shifts</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Shift</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Time</Label><Input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} /></div>
              <div><Label>End Time</Label><Input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} /></div>
            </div>
            <div><Label>Rate ($)</Label><Input type="number" value={form.rate_applied} onChange={e => setForm(p => ({ ...p, rate_applied: Number(e.target.value) }))} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposed">Proposed</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {SHIFT_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, color: c.value }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c.value ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'}`}
                    title={c.label}
                  >
                    <span className={`block w-full h-full rounded-full ${c.value === 'blue' ? 'bg-blue-500' : c.value === 'green' ? 'bg-green-500' : c.value === 'red' ? 'bg-red-500' : c.value === 'orange' ? 'bg-orange-500' : c.value === 'purple' ? 'bg-purple-500' : c.value === 'pink' ? 'bg-pink-500' : c.value === 'teal' ? 'bg-teal-500' : 'bg-yellow-500'}`} />
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleAdd} className="w-full">Add Shift</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Invoices Tab ──────────────────────────────────────────

function InvoicesTab({ invoices, onNavigate }: { invoices: any[]; onNavigate: (id: string) => void }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="border-b bg-muted/50">
          <th className="text-left p-3 font-medium text-muted-foreground">Invoice #</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Period</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
        </tr></thead>
        <tbody>
          {invoices.map(i => (
            <tr key={i.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => onNavigate(i.id)}>
              <td className="p-3 font-medium">{i.invoice_number}</td>
              <td className="p-3 text-muted-foreground">{format(new Date(i.period_start), 'MMM d')} - {format(new Date(i.period_end), 'MMM d')}</td>
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
