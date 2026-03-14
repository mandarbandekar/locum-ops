import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, GraduationCap } from 'lucide-react';
import { useCredentials } from '@/hooks/useCredentials';
import { useCEEntries, CEEntryWithLinks } from '@/hooks/useCEEntries';
import { CREDENTIAL_TYPE_LABELS, CE_DELIVERY_FORMATS } from '@/lib/credentialTypes';
import { useToast } from '@/hooks/use-toast';

const CE_CATEGORIES = [
  'Clinical', 'Surgery', 'Dentistry', 'Radiology', 'Pharmacology',
  'Anesthesia', 'Emergency & Critical Care', 'Practice Management',
  'Ethics & Jurisprudence', 'Behavior', 'Nutrition', 'Other',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEntry?: CEEntryWithLinks | null;
  preLinkedCredentialId?: string | null;
}

export function AddCEEntryDialog({ open, onOpenChange, editingEntry, preLinkedCredentialId }: Props) {
  const { credentials } = useCredentials();
  const { addCEEntry, updateCEEntry, uploadCertificate } = useCEEntries();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const isEditing = !!editingEntry;

  const [form, setForm] = useState({
    title: '',
    provider: '',
    completion_date: '',
    hours: '',
    category: '',
    notes: '',
    linked_credential_ids: [] as string[],
    certificate_file_url: null as string | null,
    certificate_file_name: null as string | null,
  });

  useEffect(() => {
    if (open) {
      if (editingEntry) {
        setForm({
          title: editingEntry.title,
          provider: editingEntry.provider,
          completion_date: editingEntry.completion_date,
          hours: String(editingEntry.hours),
          category: editingEntry.category,
          notes: editingEntry.notes || '',
          linked_credential_ids: editingEntry.linked_credential_ids,
          certificate_file_url: editingEntry.certificate_file_url,
          certificate_file_name: editingEntry.certificate_file_name,
        });
      } else {
        setForm({
          title: '', provider: '', completion_date: '', hours: '', category: '', notes: '',
          linked_credential_ids: preLinkedCredentialId ? [preLinkedCredentialId] : [],
          certificate_file_url: null, certificate_file_name: null,
        });
      }
      setFile(null);
    }
  }, [open, editingEntry, preLinkedCredentialId]);

  const update = (field: string, value: unknown) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleCredential = (credId: string) => {
    setForm(prev => ({
      ...prev,
      linked_credential_ids: prev.linked_credential_ids.includes(credId)
        ? prev.linked_credential_ids.filter(id => id !== credId)
        : [...prev.linked_credential_ids, credId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.completion_date || !form.hours) return;
    setSubmitting(true);

    try {
      let certUrl = form.certificate_file_url;
      let certName = form.certificate_file_name;

      if (file) {
        const result = await uploadCertificate(file);
        certUrl = result.url;
        certName = result.name;
        toast({ title: 'Certificate uploaded' });
      }

      const payload = {
        title: form.title.trim(),
        provider: form.provider.trim(),
        completion_date: form.completion_date,
        hours: parseFloat(form.hours),
        category: form.category,
        notes: form.notes,
        certificate_file_url: certUrl,
        certificate_file_name: certName,
        linked_credential_ids: form.linked_credential_ids,
      };

      if (isEditing) {
        await updateCEEntry.mutateAsync({ id: editingEntry.id, ...payload });
      } else {
        await addCEEntry.mutateAsync(payload);
      }

      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {isEditing ? 'Edit CE Entry' : 'Add CE Entry'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Course Title *</Label>
              <Input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Advanced Dentistry Techniques" required />
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Input value={form.provider} onChange={e => update('provider', e.target.value)} placeholder="e.g. AVMA, VetFolio" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Completion Date *</Label>
              <Input type="date" value={form.completion_date} onChange={e => update('completion_date', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Hours Earned *</Label>
              <Input type="number" step="0.5" min="0" value={form.hours} onChange={e => update('hours', e.target.value)} placeholder="e.g. 2" required />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => update('category', v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Link to Credentials */}
          {credentials.length > 0 && (
            <div className="space-y-2">
              <Label>Link to Credential(s)</Label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {credentials.map(cred => (
                  <label key={cred.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded p-1">
                    <Checkbox
                      checked={form.linked_credential_ids.includes(cred.id)}
                      onCheckedChange={() => toggleCredential(cred.id)}
                    />
                    <span className="truncate">{cred.custom_title}</span>
                    <span className="text-muted-foreground text-xs ml-auto shrink-0">
                      {CREDENTIAL_TYPE_LABELS[cred.credential_type]}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Additional notes..." rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Upload Certificate</Label>
            <div
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              {file ? (
                <p className="text-sm font-medium">{file.name}</p>
              ) : form.certificate_file_name ? (
                <p className="text-sm text-muted-foreground">Current: {form.certificate_file_name} — click to replace</p>
              ) : (
                <p className="text-sm text-muted-foreground">Click to upload PDF, image, or document</p>
              )}
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : isEditing ? 'Update CE Entry' : 'Add CE Entry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
