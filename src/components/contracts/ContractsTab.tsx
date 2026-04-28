import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Pencil, Save, ExternalLink, FileText, Download, AlertTriangle, Check, X, ClipboardList, Loader2, DollarSign } from 'lucide-react';
import { Contract, ContractTerms, ContractChecklistItem, ContractStatus, ChecklistItemType, getChecklistBadge, DEFAULT_CHECKLIST_ITEMS } from '@/types/contracts';
import { RatesEditor, termsToRates, ratesToTermsFields, RateEntry } from '@/components/facilities/RatesEditor';
import { useContracts } from '@/hooks/useContracts';
import { useAuth } from '@/contexts/AuthContext';
import { generateId } from '@/lib/businessLogic';
import { uploadContractFile, getContractSignedUrl, deleteContractFile } from '@/lib/contractStorage';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { TermsSnapshot } from '@/types';

interface ContractsTabProps {
  facilityId: string;
  isDemo?: boolean;
  facilityTerms?: TermsSnapshot;
  onUpdateTerms?: (t: TermsSnapshot) => void;
}

export function ContractsTab({ facilityId, isDemo = false, facilityTerms, onUpdateTerms }: ContractsTabProps) {
  const {
    contracts, contractTerms, checklistItems, loading,
    addContract, updateContract, deleteContract,
    upsertTerms, addChecklistItem, updateChecklistItem, deleteChecklistItem,
    createDefaultChecklist, getActiveTerms,
  } = useContracts(facilityId, isDemo);

  if (loading) return <p className="text-sm text-muted-foreground p-4">Loading contracts…</p>;

  return (
    <div className="space-y-6">
      {/* Legal Disclaimer Banner */}
      <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
          <strong>Not legal advice.</strong> LocumOps stores documents and helps you organize key terms for reference. Always verify details against the signed contract and consult a qualified attorney for legal guidance.
        </AlertDescription>
      </Alert>

      {/* Clinic Rates (preselected during onboarding, editable here) */}
      <ClinicRatesSection facilityTerms={facilityTerms} facilityId={facilityId} onUpdateTerms={onUpdateTerms} />

      {/* A) Contract Vault */}
      <ContractVault contracts={contracts} onAdd={addContract} onUpdate={updateContract} onDelete={deleteContract} facilityId={facilityId} />

      {/* B) Key Terms Snapshot */}
      <KeyTermsSnapshot contracts={contracts} contractTerms={contractTerms} onUpsert={upsertTerms} />

      {/* C) Policies & Notes */}
      <PoliciesSection facilityTerms={facilityTerms} facilityId={facilityId} onUpdateTerms={onUpdateTerms} />

      {/* D) Checklist & Reminders */}
      <ChecklistSection
        items={checklistItems}
        facilityId={facilityId}
        onAdd={addChecklistItem}
        onUpdate={updateChecklistItem}
        onDelete={deleteChecklistItem}
        onCreateDefaults={createDefaultChecklist}
      />
    </div>
  );
}

// ─── Contract Vault ────────────────────────────────────────

function ContractVault({ contracts, onAdd, onUpdate, onDelete, facilityId }: {
  contracts: Contract[];
  onAdd: (c: Omit<Contract, 'id'>) => Promise<Contract>;
  onUpdate: (c: Contract) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  facilityId: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" /> Contract Vault
        </CardTitle>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="mr-1 h-3 w-3" /> Add Contract
        </Button>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contracts yet. Add your first contract to get started.</p>
        ) : (
          <div className="space-y-2">
            {contracts.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{c.title}</p>
                    <ContractStatusBadge status={c.status} />
                    {c.auto_renew && <Badge variant="outline" className="text-xs">Auto-renew</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.effective_date ? format(new Date(c.effective_date), 'MMM d, yyyy') : 'No start date'}
                    {' — '}
                    {c.end_date ? format(new Date(c.end_date), 'MMM d, yyyy') : 'No end date'}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {c.file_url && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="View/Download" onClick={async () => {
                      const url = await getContractSignedUrl(c.file_url!);
                      if (url) window.open(url, '_blank');
                      else toast.error('Could not generate download link');
                    }}>
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                  {c.external_link_url && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="External Link" onClick={() => window.open(c.external_link_url!, '_blank')}>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditId(c.id)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => {
                    if (confirm('Delete this contract?')) {
                      if (c.file_url) await deleteContractFile(c.file_url);
                      onDelete(c.id);
                      toast.success('Contract deleted');
                    }
                  }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AddContractDialog open={showAdd} onOpenChange={setShowAdd} onAdd={onAdd} facilityId={facilityId} />
      {editId && (
        <EditContractDialog
          contract={contracts.find(c => c.id === editId)!}
          open={!!editId}
          onOpenChange={() => setEditId(null)}
          onUpdate={onUpdate}
        />
      )}
    </Card>
  );
}

function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const styles: Record<ContractStatus, string> = {
    draft: 'bg-muted text-muted-foreground',
    active: 'bg-green-500/15 text-green-700 dark:text-green-400',
    expired: 'bg-red-500/15 text-red-700 dark:text-red-400',
  };
  return <Badge className={`${styles[status]} text-xs`}>{status}</Badge>;
}

function AddContractDialog({ open, onOpenChange, onAdd, facilityId }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  onAdd: (c: Omit<Contract, 'id'>) => Promise<Contract>; facilityId: string;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '', status: 'draft' as ContractStatus, effective_date: '', end_date: '',
    auto_renew: false, notes: '', external_link_url: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setUploading(true);
    try {
      let fileUrl: string | null = null;
      if (file && user) {
        fileUrl = await uploadContractFile(user.id, file);
      }
      await onAdd({
        facility_id: facilityId,
        title: form.title.trim(),
        status: form.status,
        effective_date: form.effective_date || null,
        end_date: form.end_date || null,
        auto_renew: form.auto_renew,
        file_url: fileUrl,
        external_link_url: form.external_link_url || null,
        notes: form.notes,
      });
      toast.success('Contract added');
      onOpenChange(false);
      setForm({ title: '', status: 'draft', effective_date: '', end_date: '', auto_renew: false, notes: '', external_link_url: '' });
      setFile(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add contract');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Contract</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., MSA 2026" /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as ContractStatus }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Effective Date</Label><Input type="date" value={form.effective_date} onChange={e => setForm(p => ({ ...p, effective_date: e.target.value }))} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="auto_renew" checked={form.auto_renew} onChange={e => setForm(p => ({ ...p, auto_renew: e.target.checked }))} className="rounded" />
            <Label htmlFor="auto_renew" className="text-sm">Auto-renew</Label>
          </div>
          <div>
            <Label>Attach File</Label>
            <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.png,.jpg" />
            {file && <p className="text-xs text-muted-foreground mt-1">Selected: {file.name}</p>}
          </div>
          <div><Label>External Link (optional)</Label><Input value={form.external_link_url} onChange={e => setForm(p => ({ ...p, external_link_url: e.target.value }))} placeholder="https://..." /></div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          <Button onClick={handleSubmit} className="w-full" disabled={uploading}>
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {uploading ? 'Uploading…' : 'Add Contract'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditContractDialog({ contract, open, onOpenChange, onUpdate }: {
  contract: Contract; open: boolean; onOpenChange: () => void; onUpdate: (c: Contract) => Promise<void>;
}) {
  const [form, setForm] = useState({ ...contract });

  const handleSave = async () => {
    await onUpdate(form);
    toast.success('Contract updated');
    onOpenChange();
  };

  return (
    <Dialog open={open} onOpenChange={() => onOpenChange()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Contract</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as ContractStatus }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Effective Date</Label><Input type="date" value={form.effective_date || ''} onChange={e => setForm(p => ({ ...p, effective_date: e.target.value || null }))} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.end_date || ''} onChange={e => setForm(p => ({ ...p, end_date: e.target.value || null }))} /></div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="edit_auto_renew" checked={form.auto_renew} onChange={e => setForm(p => ({ ...p, auto_renew: e.target.checked }))} className="rounded" />
            <Label htmlFor="edit_auto_renew" className="text-sm">Auto-renew</Label>
          </div>
          <div><Label>External Link</Label><Input value={form.external_link_url || ''} onChange={e => setForm(p => ({ ...p, external_link_url: e.target.value || null }))} /></div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          <Button onClick={handleSave} className="w-full">Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Key Terms Snapshot ────────────────────────────────────

function KeyTermsSnapshot({ contracts, contractTerms, onUpsert }: {
  contracts: Contract[];
  contractTerms: ContractTerms[];
  onUpsert: (t: ContractTerms) => Promise<void>;
}) {
  const activeContract = contracts.find(c => c.status === 'active') || contracts[0];

  if (!activeContract) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Key Terms Snapshot</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Add a contract above to track key terms.</p>
        </CardContent>
      </Card>
    );
  }

  const existingTerms = contractTerms.find(t => t.contract_id === activeContract.id);
  const terms: ContractTerms = existingTerms || {
    id: generateId(),
    contract_id: activeContract.id,
    weekday_rate: null,
    weekend_rate: null,
    holiday_rate: null,
    payment_terms_days: null,
    cancellation_policy_text: '',
    overtime_policy_text: '',
    late_payment_policy_text: '',
    invoicing_instructions_text: '',
  };

  return <TermsEditor terms={terms} contractTitle={activeContract.title} onSave={onUpsert} />;
}

function TermsEditor({ terms, contractTitle, onSave }: {
  terms: ContractTerms; contractTitle: string; onSave: (t: ContractTerms) => Promise<void>;
}) {
  const [form, setForm] = useState(terms);

  const handleSave = async () => {
    await onSave(form);
    toast.success('Terms saved');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Key Terms — {contractTitle}</CardTitle>
        <p className="text-xs text-muted-foreground italic">Saved terms for reference. Verify against the signed contract.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div><Label>Weekday Rate ($)</Label><Input type="number" value={form.weekday_rate ?? ''} onChange={e => setForm(p => ({ ...p, weekday_rate: e.target.value ? Number(e.target.value) : null }))} /></div>
          <div><Label>Weekend Rate ($)</Label><Input type="number" value={form.weekend_rate ?? ''} onChange={e => setForm(p => ({ ...p, weekend_rate: e.target.value ? Number(e.target.value) : null }))} /></div>
          <div><Label>Holiday Rate ($)</Label><Input type="number" value={form.holiday_rate ?? ''} onChange={e => setForm(p => ({ ...p, holiday_rate: e.target.value ? Number(e.target.value) : null }))} /></div>
        </div>
        <div><Label>Payment Terms (days)</Label><Input type="number" value={form.payment_terms_days ?? ''} onChange={e => setForm(p => ({ ...p, payment_terms_days: e.target.value ? Number(e.target.value) : null }))} placeholder="e.g., 14, 30, 60" /></div>
        <div><Label>Cancellation Policy</Label><Textarea value={form.cancellation_policy_text} onChange={e => setForm(p => ({ ...p, cancellation_policy_text: e.target.value }))} rows={2} /></div>
        <div><Label>Overtime Policy</Label><Textarea value={form.overtime_policy_text} onChange={e => setForm(p => ({ ...p, overtime_policy_text: e.target.value }))} rows={2} /></div>
        <div><Label>Late Payment Policy</Label><Textarea value={form.late_payment_policy_text} onChange={e => setForm(p => ({ ...p, late_payment_policy_text: e.target.value }))} rows={2} /></div>
        <div><Label>Invoicing Instructions</Label><Textarea value={form.invoicing_instructions_text} onChange={e => setForm(p => ({ ...p, invoicing_instructions_text: e.target.value }))} rows={2} /></div>
        <Button onClick={handleSave}><Save className="mr-1 h-3 w-3" /> Save Terms</Button>
      </CardContent>
    </Card>
  );
}

// ─── Clinic Rates (editable, persisted to facility TermsSnapshot) ───

function ClinicRatesSection({ facilityTerms, facilityId, onUpdateTerms }: {
  facilityTerms?: TermsSnapshot;
  facilityId: string;
  onUpdateTerms?: (t: TermsSnapshot) => void;
}) {
  const [rates, setRates] = useState<RateEntry[]>(() => facilityTerms ? termsToRates(facilityTerms) : []);

  const buildTerms = (next: RateEntry[]): TermsSnapshot => {
    const fields = ratesToTermsFields(next);
    return {
      id: facilityTerms?.id || generateId(),
      facility_id: facilityId,
      weekday_rate: fields.weekday_rate,
      weekend_rate: fields.weekend_rate,
      partial_day_rate: fields.partial_day_rate,
      holiday_rate: fields.holiday_rate,
      telemedicine_rate: fields.telemedicine_rate,
      custom_rates: fields.custom_rates,
      rate_kinds: fields.rate_kinds,
      rate_shift_types: fields.rate_shift_types,
      cancellation_policy_text: facilityTerms?.cancellation_policy_text || '',
      overtime_policy_text: facilityTerms?.overtime_policy_text || '',
      late_payment_policy_text: facilityTerms?.late_payment_policy_text || '',
      special_notes: facilityTerms?.special_notes || '',
    };
  };

  const handleSave = (next: RateEntry[]) => {
    if (!onUpdateTerms) return;
    onUpdateTerms(buildTerms(next));
    toast.success('Clinic rates updated');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" /> Clinic Rates
        </CardTitle>
        <p className="text-xs text-muted-foreground italic">
          These rates are pre-filled from onboarding and used as suggestions when adding shifts at this clinic. Edit anytime.
        </p>
      </CardHeader>
      <CardContent>
        <RatesEditor rates={rates} onChange={setRates} onSave={handleSave} showCard={false} />
      </CardContent>
    </Card>
  );
}

// ─── Policies & Notes Section ──────────────────────────────

function PoliciesSection({ facilityTerms, facilityId, onUpdateTerms }: {
  facilityTerms?: TermsSnapshot;
  facilityId: string;
  onUpdateTerms?: (t: TermsSnapshot) => void;
}) {
  const [cancellation, setCancellation] = useState(facilityTerms?.cancellation_policy_text || '');
  const [overtime, setOvertime] = useState(facilityTerms?.overtime_policy_text || '');
  const [latePayment, setLatePayment] = useState(facilityTerms?.late_payment_policy_text || '');
  const [specialNotes, setSpecialNotes] = useState(facilityTerms?.special_notes || '');

  const handleSave = () => {
    if (!onUpdateTerms) return;
    onUpdateTerms({
      id: facilityTerms?.id || generateId(),
      facility_id: facilityId,
      weekday_rate: facilityTerms?.weekday_rate || 0,
      weekend_rate: facilityTerms?.weekend_rate || 0,
      partial_day_rate: facilityTerms?.partial_day_rate || 0,
      holiday_rate: facilityTerms?.holiday_rate || 0,
      telemedicine_rate: facilityTerms?.telemedicine_rate || 0,
      custom_rates: facilityTerms?.custom_rates || [],
      cancellation_policy_text: cancellation,
      overtime_policy_text: overtime,
      late_payment_policy_text: latePayment,
      special_notes: specialNotes,
    });
    toast.success('Policies saved');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Policies & Notes</CardTitle>
        <p className="text-xs text-muted-foreground italic">Track cancellation, overtime, and payment policies for this facility.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div><Label>Cancellation Policy</Label><Textarea value={cancellation} onChange={e => setCancellation(e.target.value)} rows={2} placeholder="e.g. 48-hour notice required..." /></div>
        <div><Label>Overtime Policy</Label><Textarea value={overtime} onChange={e => setOvertime(e.target.value)} rows={2} placeholder="e.g. Time-and-a-half after 10 hours..." /></div>
        <div><Label>Late Payment Policy</Label><Textarea value={latePayment} onChange={e => setLatePayment(e.target.value)} rows={2} placeholder="e.g. 1.5% monthly interest after 30 days..." /></div>
        <div><Label>Special Notes</Label><Textarea value={specialNotes} onChange={e => setSpecialNotes(e.target.value)} rows={2} placeholder="Any additional notes..." /></div>
        <Button onClick={handleSave}><Save className="mr-1 h-3 w-3" /> Save Policies</Button>
      </CardContent>
    </Card>
  );
}

// ─── Checklist & Reminders ─────────────────────────────────

function ChecklistSection({ items, facilityId, onAdd, onUpdate, onDelete, onCreateDefaults }: {
  items: ContractChecklistItem[];
  facilityId: string;
  onAdd: (item: Omit<ContractChecklistItem, 'id'>) => Promise<void>;
  onUpdate: (item: ContractChecklistItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateDefaults: (facilityId: string) => Promise<void>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ title: '', type: 'other' as ChecklistItemType, due_date: '', notes: '' });

  const handleAddCustom = async () => {
    if (!addForm.title.trim()) { toast.error('Title is required'); return; }
    await onAdd({
      facility_id: facilityId,
      type: addForm.type,
      title: addForm.title.trim(),
      status: 'needed',
      due_date: addForm.due_date || null,
      notes: addForm.notes,
    });
    toast.success('Checklist item added');
    setShowAdd(false);
    setAddForm({ title: '', type: 'other', due_date: '', notes: '' });
  };

  const handleCreateDefaults = async () => {
    await onCreateDefaults(facilityId);
    toast.success('Default checklist items created');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4" /> Checklist & Reminders
        </CardTitle>
        <div className="flex gap-2">
          {items.length === 0 && (
            <Button size="sm" variant="outline" onClick={handleCreateDefaults}>
              Create Defaults
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 h-3 w-3" /> Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No checklist items. Click "Create Defaults" to add W-9, COI, Direct Deposit, and Credentialing items.</p>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Item</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Due Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Notes</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const badge = getChecklistBadge(item);
                  return (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{item.title}</td>
                      <td className="p-3">
                        <Select value={item.status} onValueChange={v => onUpdate({ ...item, status: v as any })}>
                          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="needed">Needed</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Input
                            type="date"
                            value={item.due_date || ''}
                            onChange={e => onUpdate({ ...item, due_date: e.target.value || null })}
                            className="h-7 text-xs w-32"
                          />
                          {badge === 'due_soon' && <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs">Due soon</Badge>}
                          {badge === 'overdue' && <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 text-xs">Overdue</Badge>}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs max-w-[200px] truncate">{item.notes || '—'}</td>
                      <td className="p-3 text-right">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm('Delete this item?')) { onDelete(item.id); toast.success('Deleted'); } }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Checklist Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={addForm.title} onChange={e => setAddForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Background Check" /></div>
            <div><Label>Type</Label>
              <Select value={addForm.type} onValueChange={v => setAddForm(p => ({ ...p, type: v as ChecklistItemType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="w9">W-9</SelectItem>
                  <SelectItem value="coi">COI</SelectItem>
                  <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                  <SelectItem value="credentialing">Credentialing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Due Date</Label><Input type="date" value={addForm.due_date} onChange={e => setAddForm(p => ({ ...p, due_date: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={addForm.notes} onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <Button onClick={handleAddCustom} className="w-full">Add Item</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Terms Pill (for use in Shift/Invoice detail) ──────────

export function ContractTermsPill({ facilityId, onClick }: { facilityId: string; onClick?: () => void }) {
  const { contracts, contractTerms } = useContracts(facilityId);
  const activeContract = contracts.find(c => c.status === 'active');
  if (!activeContract) return null;
  const terms = contractTerms.find(t => t.contract_id === activeContract.id);
  if (!terms) return null;

  const pills: string[] = [];
  if (terms.payment_terms_days) pills.push(`Net ${terms.payment_terms_days}`);
  if (terms.overtime_policy_text) pills.push('OT policy saved');
  if (terms.late_payment_policy_text) pills.push('Late fee clause saved');
  if (pills.length === 0) return null;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
      title="View contract terms"
    >
      <FileText className="h-3 w-3" />
      {pills.join(' • ')}
    </button>
  );
}
