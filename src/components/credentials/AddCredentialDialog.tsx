import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CREDENTIAL_TYPE_LABELS, RENEWAL_FREQUENCIES } from '@/lib/credentialTypes';
import { useCredentials, Credential } from '@/hooks/useCredentials';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCredential?: Credential | null;
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC','Federal','N/A',
];

export function AddCredentialDialog({ open, onOpenChange, editingCredential }: Props) {
  const { addCredential, updateCredential, uploadDocument } = useCredentials();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const isEditing = !!editingCredential;

  const [form, setForm] = useState({
    credential_type: editingCredential?.credential_type || 'custom',
    custom_title: editingCredential?.custom_title || '',
    jurisdiction: editingCredential?.jurisdiction || '',
    issuing_authority: editingCredential?.issuing_authority || '',
    credential_number: editingCredential?.credential_number || '',
    issue_date: editingCredential?.issue_date || '',
    expiration_date: editingCredential?.expiration_date || '',
    renewal_frequency: editingCredential?.renewal_frequency || 'annually',
    notes: editingCredential?.notes || '',
    tags: editingCredential?.tags?.join(', ') || '',
  });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.custom_title.trim()) return;
    setSubmitting(true);

    try {
      const payload = {
        credential_type: form.credential_type,
        custom_title: form.custom_title.trim(),
        jurisdiction: form.jurisdiction || null,
        issuing_authority: form.issuing_authority || null,
        credential_number: form.credential_number || null,
        issue_date: form.issue_date || null,
        expiration_date: form.expiration_date || null,
        renewal_frequency: form.renewal_frequency || null,
        status: 'active' as const,
        notes: form.notes,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };

      let credentialId: string;

      if (isEditing) {
        await updateCredential.mutateAsync({ id: editingCredential.id, ...payload });
        credentialId = editingCredential.id;
      } else {
        const result = await addCredential.mutateAsync(payload);
        credentialId = result.id;
      }

      if (file) {
        await uploadDocument(file, credentialId, 'license');
        toast({ title: 'Document uploaded' });
      }

      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      credential_type: 'custom', custom_title: '', jurisdiction: '', issuing_authority: '',
      credential_number: '', issue_date: '', expiration_date: '', renewal_frequency: 'annually',
      notes: '', tags: '',
    });
    setFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Credential' : 'Add Credential'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Credential Type</Label>
              <Select value={form.credential_type} onValueChange={v => update('credential_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CREDENTIAL_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.custom_title} onChange={e => update('custom_title', e.target.value)} placeholder="e.g. California Veterinary License" required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>State / Jurisdiction</Label>
              <Select value={form.jurisdiction} onValueChange={v => update('jurisdiction', v)}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Issuing Organization</Label>
              <Input value={form.issuing_authority} onChange={e => update('issuing_authority', e.target.value)} placeholder="e.g. VMDB" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Credential Number</Label>
              <Input value={form.credential_number} onChange={e => update('credential_number', e.target.value)} placeholder="License #" />
            </div>
            <div className="space-y-2">
              <Label>Issue Date</Label>
              <Input type="date" value={form.issue_date} onChange={e => update('issue_date', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Expiration Date</Label>
              <Input type="date" value={form.expiration_date} onChange={e => update('expiration_date', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Renewal Frequency</Label>
              <Select value={form.renewal_frequency} onValueChange={v => update('renewal_frequency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RENEWAL_FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={e => update('tags', e.target.value)} placeholder="e.g. primary, required" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Additional notes..." rows={3} />
          </div>

          <div className="space-y-2">
            <Label>Upload Document</Label>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              {file ? (
                <p className="text-sm font-medium">{file.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Click to upload PDF, image, or document</p>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : isEditing ? 'Update Credential' : 'Add Credential'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
