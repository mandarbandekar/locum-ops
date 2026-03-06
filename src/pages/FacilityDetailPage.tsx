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
import { ArrowLeft, Plus, Trash2, Edit2, Save, Pencil, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FacilityContact, ContactRole, TermsSnapshot } from '@/types';
import { generateId } from '@/lib/businessLogic';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function FacilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { facilities, contacts, terms, shifts, invoices, updateFacility, addContact, updateContact, deleteContact, updateTerms } = useData();

  const facility = facilities.find(c => c.id === id);
  if (!facility) return <div className="p-6">Facility not found. <Button variant="link" onClick={() => navigate('/facilities')}>Back</Button></div>;

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
        <EditableFacilityName facility={facility} onSave={(newName) => { updateFacility({ ...facility, name: newName }); toast.success('Facility name updated'); }} />
        <StatusBadge status={facility.status} className="ml-3" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({facilityContacts.length})</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
          <TabsTrigger value="shifts">Shifts ({facilityShifts.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({facilityInvoices.length})</TabsTrigger>
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
          <ShiftsTab shifts={facilityShifts} />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <InvoicesTab invoices={facilityInvoices} onNavigate={(iid) => navigate(`/invoices/${iid}`)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ facility, shifts, onUpdate }: { facility: any; shifts: any[]; onUpdate: any }) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(facility.notes);
  const [status, setStatus] = useState(facility.status);

  const upcoming = shifts.filter(s => new Date(s.start_datetime) > new Date() && s.status !== 'canceled').slice(0, 5);

  const handleSave = () => {
    onUpdate({ ...facility, notes, status });
    setEditing(false);
    toast.success('Facility updated');
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

function ContactsTab({ contacts, facilityId, onAdd, onUpdate, onDelete }: {
  contacts: FacilityContact[]; facilityId: string;
  onAdd: (c: Omit<FacilityContact, 'id'>) => void;
  onUpdate: (c: FacilityContact) => void;
  onDelete: (id: string) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'scheduler' as ContactRole, email: '', phone: '', is_primary: false });

  const handleAdd = () => {
    onAdd({ ...form, facility_id: facilityId });
    setShowAdd(false);
    setForm({ name: '', role: 'scheduler', email: '', phone: '', is_primary: false });
    toast.success('Contact added');
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1 h-3 w-3" /> Add Contact</Button>
      </div>
      <div className="space-y-2">
        {contacts.map(c => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">{c.name} {c.is_primary && <span className="text-xs text-primary">(Primary)</span>}</p>
                <p className="text-xs text-muted-foreground capitalize">{c.role}</p>
                <p className="text-xs text-muted-foreground">{c.email} · {c.phone}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => { if (confirm('Delete contact?')) { onDelete(c.id); toast.success('Deleted'); } }}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
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

function TermsTab({ terms, facilityId, onUpdate }: { terms?: TermsSnapshot; facilityId: string; onUpdate: (c: TermsSnapshot) => void }) {
  const [form, setForm] = useState<TermsSnapshot>(terms || {
    id: generateId(), facility_id: facilityId, weekday_rate: 0, weekend_rate: 0,
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
        <div><Label>Cancellation Policy</Label><Textarea value={form.cancellation_policy_text} onChange={e => setForm(p => ({ ...p, cancellation_policy_text: e.target.value }))} rows={2} /></div>
        <div><Label>Overtime Policy</Label><Textarea value={form.overtime_policy_text} onChange={e => setForm(p => ({ ...p, overtime_policy_text: e.target.value }))} rows={2} /></div>
        <div><Label>Late Payment Policy</Label><Textarea value={form.late_payment_policy_text} onChange={e => setForm(p => ({ ...p, late_payment_policy_text: e.target.value }))} rows={2} /></div>
        <div><Label>Special Notes</Label><Textarea value={form.special_notes} onChange={e => setForm(p => ({ ...p, special_notes: e.target.value }))} rows={2} /></div>
        <Button onClick={handleSave}>Save Terms</Button>
      </CardContent>
    </Card>
  );
}

function ShiftsTab({ shifts }: { shifts: any[] }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="border-b bg-muted/50">
          <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Time</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Rate</th>
          <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
        </tr></thead>
        <tbody>
          {shifts.map(s => (
            <tr key={s.id} className="border-b last:border-0">
              <td className="p-3">{format(new Date(s.start_datetime), 'MMM d, yyyy')}</td>
              <td className="p-3 text-muted-foreground">{format(new Date(s.start_datetime), 'h:mm a')} - {format(new Date(s.end_datetime), 'h:mm a')}</td>
              <td className="p-3">${s.rate_applied}</td>
              <td className="p-3"><StatusBadge status={s.status} /></td>
            </tr>
          ))}
          {shifts.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No shifts</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

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
