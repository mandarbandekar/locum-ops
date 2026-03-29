import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck, FileText, Syringe, Shield, GraduationCap, Plus,
  Upload, ArrowLeft, ArrowRight, CheckCircle2, Sparkles,
} from 'lucide-react';
import { useCredentials } from '@/hooks/useCredentials';
import { useCEEntries } from '@/hooks/useCEEntries';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  open: boolean;
  onComplete: (summary: OnboardingSummary) => void;
  onSkip: () => void;
  onSetSelectedTypes: (types: string[]) => void;
  onMarkCredentialAdded: () => void;
  onMarkDocumentUploaded: () => void;
  onMarkCEAdded: () => void;
}

export interface OnboardingSummary {
  credentialAdded: boolean;
  documentUploaded: boolean;
  ceAdded: boolean;
  credentialTitle?: string;
  expirationDays?: number | null;
}

type Step = 'select-types' | 'add-credential' | 'upload-document' | 'add-ce' | 'complete';

const STEPS: Step[] = ['select-types', 'add-credential', 'upload-document', 'add-ce', 'complete'];

const CREDENTIAL_OPTIONS = [
  { key: 'veterinary_license', label: 'Veterinary License', icon: ShieldCheck },
  { key: 'dea_registration', label: 'DEA Registration', icon: Syringe },
  { key: 'malpractice_insurance', label: 'Liability Insurance', icon: Shield },
  { key: 'state_controlled_substance', label: 'Controlled Substance Permit', icon: FileText },
  { key: 'ce_certificate', label: 'CE Records', icon: GraduationCap },
  { key: 'custom', label: 'Other Credential', icon: Plus },
];

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia',
  'Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland',
  'Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
  'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina',
  'South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming',
];

export function ComplianceOnboardingFlow({ open, onComplete, onSkip, onSetSelectedTypes, onMarkCredentialAdded, onMarkDocumentUploaded, onMarkCEAdded }: Props) {
  const [step, setStep] = useState<Step>('select-types');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [credForm, setCredForm] = useState({
    credential_type: 'veterinary_license',
    custom_title: '',
    jurisdiction: '',
    credential_number: '',
    expiration_date: '',
    issue_date: '',
    renewal_url: '',
    notes: '',
  });
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [entryMode, setEntryMode] = useState<'manual' | 'upload'>('manual');
  const [credentialFile, setCredentialFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [ceForm, setCEForm] = useState({ title: '', provider: '', completion_date: '', hours: '' });
  const [ceFile, setCEFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [summary, setSummary] = useState<OnboardingSummary>({
    credentialAdded: false, documentUploaded: false, ceAdded: false,
  });

  const { addCredential, uploadDocument } = useCredentials();
  const { addCEEntry } = useCEEntries();

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const stepLabels: Record<Step, string> = {
    'select-types': 'Choose what to track',
    'add-credential': 'Add your first credential',
    'upload-document': 'Upload a document',
    'add-ce': 'Track CE hours',
    'complete': 'Setup complete',
  };

  const toggleType = (key: string) => {
    setSelectedTypes(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSaveCredential = async () => {
    setSaving(true);
    try {
      const title = credForm.custom_title || CREDENTIAL_OPTIONS.find(o => o.key === credForm.credential_type)?.label || 'Credential';
      const result = await addCredential.mutateAsync({
        credential_type: credForm.credential_type,
        custom_title: title,
        jurisdiction: credForm.jurisdiction || null,
        credential_number: credForm.credential_number || null,
        expiration_date: credForm.expiration_date || null,
        issue_date: credForm.issue_date || null,
        notes: credForm.notes || '',
      });

      if (credentialFile && result?.id) {
        await uploadDocument.mutateAsync({ file: credentialFile, credentialId: result.id });
        onMarkDocumentUploaded();
        setSummary(s => ({ ...s, documentUploaded: true }));
      }

      onMarkCredentialAdded();
      const days = credForm.expiration_date
        ? Math.ceil((new Date(credForm.expiration_date).getTime() - Date.now()) / 86400000)
        : null;
      setSummary(s => ({ ...s, credentialAdded: true, credentialTitle: title, expirationDays: days }));
      setStep('upload-document');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!documentFile) { setStep('add-ce'); return; }
    setSaving(true);
    try {
      await uploadDocument.mutateAsync({ file: documentFile, credentialId: null });
      onMarkDocumentUploaded();
      setSummary(s => ({ ...s, documentUploaded: true }));
      setStep('add-ce');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCE = async () => {
    setSaving(true);
    try {
      await addCEEntry.mutateAsync({
        title: ceForm.title,
        provider: ceForm.provider,
        completion_date: ceForm.completion_date,
        hours: parseFloat(ceForm.hours) || 0,
        category: '',
        delivery_format: '',
      });
      onMarkCEAdded();
      setSummary(s => ({ ...s, ceAdded: true }));
      setStep('complete');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = () => {
    onComplete(summary);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg p-0 gap-0 [&>button]:hidden overflow-hidden" onPointerDownOutside={e => e.preventDefault()}>
        {/* Progress header */}
        <div className="px-6 pt-5 pb-3 space-y-2 border-b">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Step {stepIndex + 1} of {STEPS.length}
            </span>
            {step !== 'complete' && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={onSkip}>
                Skip for now
              </Button>
            )}
          </div>
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">{stepLabels[step]}</p>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {step === 'select-types' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold">What would you like to track first?</h3>
                <p className="text-sm text-muted-foreground mt-1">Choose the items you want to add now. You can always add more later.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CREDENTIAL_OPTIONS.map(({ key, label, icon: Icon }) => {
                  const selected = selectedTypes.includes(key);
                  return (
                    <Card
                      key={key}
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md',
                        selected && 'ring-2 ring-primary border-primary/50'
                      )}
                      onClick={() => toggleType(key)}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className={cn('p-2 rounded-lg', selected ? 'bg-primary/20' : 'bg-muted')}>
                          <Icon className={cn('h-4 w-4', selected ? 'text-primary' : 'text-muted-foreground')} />
                        </div>
                        <span className="text-sm font-medium">{label}</span>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'add-credential' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold">Add your first credential</h3>
                <p className="text-sm text-muted-foreground mt-1">Start with the credential you rely on most often for work.</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={entryMode === 'manual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEntryMode('manual')}
                  className="gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" /> Enter manually
                </Button>
                <Button
                  variant={entryMode === 'upload' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEntryMode('upload')}
                  className="gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload document
                </Button>
              </div>

              {entryMode === 'manual' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Credential type</Label>
                    <Select value={credForm.credential_type} onValueChange={v => setCredForm(f => ({ ...f, credential_type: v, custom_title: CREDENTIAL_OPTIONS.find(o => o.key === v)?.label || '' }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CREDENTIAL_OPTIONS.map(o => (
                          <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Issuing state or authority</Label>
                    <Select value={credForm.jurisdiction} onValueChange={v => setCredForm(f => ({ ...f, jurisdiction: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Credential / license number</Label>
                    <Input placeholder="e.g. VET-12345" value={credForm.credential_number} onChange={e => setCredForm(f => ({ ...f, credential_number: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiration date</Label>
                    <Input type="date" value={credForm.expiration_date} onChange={e => setCredForm(f => ({ ...f, expiration_date: e.target.value }))} />
                  </div>

                  {!showOptionalFields && (
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={() => setShowOptionalFields(true)}>
                      <Plus className="h-3 w-3" /> More fields (optional)
                    </Button>
                  )}

                  {showOptionalFields && (
                    <div className="space-y-4 pt-1 border-t">
                      <div className="space-y-2">
                        <Label>Issue date</Label>
                        <Input type="date" value={credForm.issue_date} onChange={e => setCredForm(f => ({ ...f, issue_date: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Renewal URL</Label>
                        <Input placeholder="https://..." value={credForm.renewal_url} onChange={e => setCredForm(f => ({ ...f, renewal_url: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Input placeholder="Any notes..." value={credForm.notes} onChange={e => setCredForm(f => ({ ...f, notes: e.target.value }))} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed rounded-xl p-8 text-center space-y-3">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Upload a credential document</p>
                      <p className="text-xs text-muted-foreground mt-1">License copy, DEA document, insurance file, or other credential</p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      className="hidden"
                      id="cred-file-upload"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) setCredentialFile(f);
                      }}
                    />
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('cred-file-upload')?.click()}>
                      Choose file
                    </Button>
                    {credentialFile && (
                      <p className="text-xs text-primary font-medium">{credentialFile.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Credential type</Label>
                    <Select value={credForm.credential_type} onValueChange={v => setCredForm(f => ({ ...f, credential_type: v, custom_title: CREDENTIAL_OPTIONS.find(o => o.key === v)?.label || '' }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CREDENTIAL_OPTIONS.map(o => (
                          <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Expiration date</Label>
                    <Input type="date" value={credForm.expiration_date} onChange={e => setCredForm(f => ({ ...f, expiration_date: e.target.value }))} />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'upload-document' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold">Want to upload the document too?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Keeping the file on hand makes renewals and clinic paperwork easier later.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {['License copy', 'DEA certificate', 'Malpractice insurance', 'CE certificate'].map(t => (
                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
              <div className="border-2 border-dashed rounded-xl p-8 text-center space-y-3">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">Drop a file here or click to browse</p>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  className="hidden"
                  id="doc-file-upload"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setDocumentFile(f);
                  }}
                />
                <Button variant="outline" size="sm" onClick={() => document.getElementById('doc-file-upload')?.click()}>
                  Choose file
                </Button>
                {documentFile && (
                  <p className="text-xs text-primary font-medium">{documentFile.name}</p>
                )}
              </div>
            </div>
          )}

          {step === 'add-ce' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold">Do you want to start tracking CE too?</h3>
                <p className="text-sm text-muted-foreground mt-1">You can add CE hours now or come back later when you have certificates ready.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input placeholder="e.g. Emergency Medicine Update" value={ceForm.title} onChange={e => setCEForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Input placeholder="e.g. VetCE" value={ceForm.provider} onChange={e => setCEForm(f => ({ ...f, provider: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hours</Label>
                    <Input type="number" placeholder="0" value={ceForm.hours} onChange={e => setCEForm(f => ({ ...f, hours: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Completion date</Label>
                  <Input type="date" value={ceForm.completion_date} onChange={e => setCEForm(f => ({ ...f, completion_date: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="space-y-5 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold">You're off to a good start</h3>
                <p className="text-sm text-muted-foreground mt-1">Here's what you've set up so far:</p>
              </div>
              <div className="space-y-2 text-left">
                <SummaryRow done={summary.credentialAdded} label={summary.credentialAdded ? `${summary.credentialTitle} added` : 'No credential added yet'} />
                {summary.expirationDays != null && summary.expirationDays > 0 && (
                  <SummaryRow done label={`Next expiration in ${summary.expirationDays} days`} />
                )}
                <SummaryRow done={summary.documentUploaded} label={summary.documentUploaded ? '1 document uploaded' : 'Document upload recommended'} />
                <SummaryRow done={summary.ceAdded} label={summary.ceAdded ? 'CE tracking started' : 'CE tracking not yet started'} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          {step === 'select-types' && <div />}
          {step === 'add-credential' && (
            <Button variant="ghost" size="sm" onClick={() => setStep('select-types')} className="gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          )}
          {step === 'upload-document' && (
            <Button variant="ghost" size="sm" onClick={() => setStep('add-credential')} className="gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          )}
          {step === 'add-ce' && <div />}
          {step === 'complete' && <div />}

          <div className="flex gap-2">
            {step === 'select-types' && (
              <Button onClick={() => { onSetSelectedTypes(selectedTypes); setStep('add-credential'); }} className="gap-1">
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
            {step === 'add-credential' && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setStep('upload-document')}>Skip for now</Button>
                <Button onClick={handleSaveCredential} disabled={saving} className="gap-1">
                  {saving ? 'Saving...' : 'Save credential'}
                </Button>
              </>
            )}
            {step === 'upload-document' && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setStep('add-ce')}>Do this later</Button>
                <Button onClick={handleUploadDocument} disabled={saving || !documentFile} className="gap-1">
                  {saving ? 'Uploading...' : 'Upload now'}
                </Button>
              </>
            )}
            {step === 'add-ce' && (
              <>
                <Button variant="ghost" size="sm" onClick={() => { setStep('complete'); }}>Skip for now</Button>
                <Button onClick={handleSaveCE} disabled={saving || !ceForm.title || !ceForm.completion_date} className="gap-1">
                  {saving ? 'Saving...' : 'Add CE now'}
                </Button>
              </>
            )}
            {step === 'complete' && (
              <>
                <Button variant="outline" onClick={() => setStep('add-credential')}>Add another credential</Button>
                <Button onClick={handleComplete} className="gap-1">Go to dashboard</Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <CheckCircle2 className={cn('h-4 w-4 shrink-0', done ? 'text-emerald-500' : 'text-muted-foreground/40')} />
      <span className={cn('text-sm', !done && 'text-muted-foreground')}>{label}</span>
    </div>
  );
}
