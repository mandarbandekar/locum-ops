import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CREDENTIAL_TYPE_LABELS, RENEWAL_FREQUENCIES } from '@/lib/credentialTypes';
import { useCredentials, Credential } from '@/hooks/useCredentials';
import { useCEEntries } from '@/hooks/useCEEntries';
import { Upload, GraduationCap, FileCheck, AlertCircle, Clock, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getDaysUntilExpiration } from '@/lib/credentialTypes';
import { RenewalPortalSection } from '@/components/credentials/RenewalPortalSection';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCredential?: Credential | null;
  onAddCEEntry?: (credentialId: string) => void;
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC','Federal','N/A',
];

export function AddCredentialDialog({ open, onOpenChange, editingCredential, onAddCEEntry }: Props) {
  const { addCredential, updateCredential, uploadDocument } = useCredentials();
  const { getCredentialCEStats } = useCEEntries();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const isEditing = !!editingCredential;
  const ceStats = isEditing ? getCredentialCEStats(editingCredential.id) : null;
  const requiredHours = isEditing ? (editingCredential as any).ce_required_hours as number | null : null;
  const daysLeft = isEditing ? getDaysUntilExpiration(editingCredential.expiration_date) : null;

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
    ce_required_hours: (editingCredential as any)?.ce_required_hours?.toString() || '',
    ce_requirements_notes: (editingCredential as any)?.ce_requirements_notes || '',
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
        ce_required_hours: form.ce_required_hours ? parseFloat(form.ce_required_hours) : null,
        ce_requirements_notes: form.ce_requirements_notes || null,
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
      notes: '', tags: '', ce_required_hours: '', ce_requirements_notes: '',
    });
    setFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Credential' : 'Add Credential'}</DialogTitle>
        </DialogHeader>

        {/* CE Tracker Summary (edit mode only) */}
        {isEditing && ceStats && (
          <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <GraduationCap className="h-4 w-4" /> CE Tracker
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  onOpenChange(false);
                  onAddCEEntry?.(editingCredential.id);
                }}
              >
                <GraduationCap className="h-3.5 w-3.5" /> Add CE Entry
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Log a CE course for this credential.</p>

            {/* Mini tracker cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniCard label="Hours Logged" value={`${ceStats.completedHours}`} />
              <MiniCard label="Hours Remaining" value={requiredHours ? `${Math.max(0, requiredHours - ceStats.completedHours)}` : '—'} />
              <MiniCard label="CE Entries" value={`${ceStats.linkedCount}`} />
              <MiniCard label="Certs Missing" value={`${ceStats.missingCerts}`} alert={ceStats.missingCerts > 0} />
            </div>

            {/* Progress bar */}
            {requiredHours && requiredHours > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{ceStats.completedHours} of {requiredHours} hours logged</span>
                  <span>{Math.min(100, Math.round((ceStats.completedHours / requiredHours) * 100))}%</span>
                </div>
                <Progress value={Math.min(100, Math.round((ceStats.completedHours / requiredHours) * 100))} className="h-2" />
              </div>
            )}

            {daysLeft !== null && daysLeft > 0 && daysLeft <= 90 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Renewal due in {daysLeft} days
              </p>
            )}

            {/* Recent linked CE entries */}
            {ceStats.linkedEntries.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Recent CE Entries</p>
                {ceStats.linkedEntries.slice(0, 4).map(entry => (
                  <div key={entry.id} className="flex items-center justify-between text-xs p-2 rounded border bg-background">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{entry.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-muted-foreground">{entry.hours} hrs</span>
                      {entry.certificate_file_url ? (
                        <FileCheck className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">No CE logged for this credential yet.</p>
            )}
          </div>
        )}

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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <Label>CE Required Hours</Label>
              <Input type="number" step="0.5" min="0" value={form.ce_required_hours} onChange={e => update('ce_required_hours', e.target.value)} placeholder="e.g. 30" />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={e => update('tags', e.target.value)} placeholder="e.g. primary, required" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>CE Type Requirements</Label>
            <Textarea
              value={form.ce_requirements_notes}
              onChange={e => update('ce_requirements_notes', e.target.value)}
              placeholder="e.g. Min 2 hrs ethics, max 15 hrs self-study, controlled substance CE required..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">State-specific CE type requirements. Check your licensing board for details.</p>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Additional notes..." rows={3} />
          </div>

          {/* Renewal Portal (edit mode only) */}
          {isEditing && editingCredential && (
            <RenewalPortalSection credentialId={editingCredential.id} />
          )}

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

function MiniCard({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`rounded-lg border p-2.5 text-center bg-background ${alert ? 'border-amber-300 dark:border-amber-700' : ''}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}
