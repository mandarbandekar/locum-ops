import { useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck, FileText, Syringe, Shield, GraduationCap, Plus,
  Upload, ArrowLeft, ArrowRight, CheckCircle2, Sparkles, Loader2,
  Eye, AlertCircle, Zap,
} from 'lucide-react';
import { useCredentials } from '@/hooks/useCredentials';
import { useCEEntries } from '@/hooks/useCEEntries';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

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

type Step =
  | 'select-types'
  | 'add-credential'
  | 'ai-upload'
  | 'ai-processing'
  | 'ai-review'
  | 'upload-document'
  | 'add-ce'
  | 'complete';

const ALL_STEPS: Step[] = ['select-types', 'add-credential', 'upload-document', 'add-ce', 'complete'];
const AI_STEPS: Step[] = ['select-types', 'ai-upload', 'ai-processing', 'ai-review', 'upload-document', 'add-ce', 'complete'];

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

interface ExtractedField {
  value: string;
  confidence: 'high' | 'review' | 'unclear';
}

interface ExtractionResult {
  credential_type: ExtractedField;
  custom_title: ExtractedField;
  holder_name?: ExtractedField;
  issuing_authority?: ExtractedField;
  jurisdiction?: ExtractedField;
  credential_number?: ExtractedField;
  issue_date?: ExtractedField;
  expiration_date?: ExtractedField;
  document_type_label?: string;
  overall_confidence: number;
}

function parseExtraction(data: any): ExtractionResult {
  const field = (key: string): ExtractedField | undefined => {
    const val = data[key];
    if (!val) return undefined;
    return { value: val, confidence: data[`${key}_confidence`] || 'review' };
  };
  return {
    credential_type: field('credential_type') || { value: 'custom', confidence: 'unclear' },
    custom_title: field('custom_title') || { value: 'Credential', confidence: 'unclear' },
    holder_name: field('holder_name'),
    issuing_authority: field('issuing_authority'),
    jurisdiction: field('jurisdiction'),
    credential_number: field('credential_number'),
    issue_date: field('issue_date'),
    expiration_date: field('expiration_date'),
    document_type_label: data.document_type_label,
    overall_confidence: data.overall_confidence ?? 0.5,
  };
}

// Read file content as text for AI processing
async function readFileAsText(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    // For PDFs, we send filename + basic info since we can't parse client-side easily
    return `[PDF Document: ${file.name}, Size: ${(file.size / 1024).toFixed(1)}KB]`;
  }
  return await file.text();
}

export function ComplianceOnboardingFlow({ open, onComplete, onSkip, onSetSelectedTypes, onMarkCredentialAdded, onMarkDocumentUploaded, onMarkCEAdded }: Props) {
  const [step, setStep] = useState<Step>('select-types');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [entryMode, setEntryMode] = useState<'manual' | 'ai'>('manual');

  // Manual form state
  const [credForm, setCredForm] = useState({
    credential_type: 'veterinary_license',
    custom_title: '',
    holder_name: '',
    jurisdiction: '',
    issuing_authority: '',
    credential_number: '',
    expiration_date: '',
    issue_date: '',
    renewal_url: '',
    notes: '',
  });
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  // AI upload state
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState('');

  // Document upload state
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  // CE state
  const [ceForm, setCEForm] = useState({ title: '', provider: '', completion_date: '', hours: '' });

  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<OnboardingSummary>({
    credentialAdded: false, documentUploaded: false, ceAdded: false,
  });

  const { addCredential, uploadDocument } = useCredentials();
  const { addCEEntry } = useCEEntries();
  const { session } = useAuth();

  const currentSteps = entryMode === 'ai' ? AI_STEPS : ALL_STEPS;
  const stepIndex = currentSteps.indexOf(step);
  const totalVisible = currentSteps.length;
  const progress = Math.max(((stepIndex + 1) / totalVisible) * 100, 10);

  const stepLabels: Record<Step, string> = {
    'select-types': 'Choose what to track',
    'add-credential': 'Add your first credential',
    'ai-upload': 'Upload for faster setup',
    'ai-processing': 'Reviewing your document',
    'ai-review': 'Review suggested details',
    'upload-document': 'Upload a document',
    'add-ce': 'Track CE hours',
    'complete': 'Setup complete',
  };

  const toggleType = (key: string) => {
    setSelectedTypes(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  // === AI Upload Flow ===
  const handleAiUpload = useCallback(async () => {
    if (!aiFile || !session?.access_token) return;
    setStep('ai-processing');
    setAiError(null);
    setProcessingMessage('Identifying document type…');

    try {
      const content = await readFileAsText(aiFile);
      setProcessingMessage('Extracting credential details…');

      const { data, error } = await supabase.functions.invoke('ai-credential-extract', {
        body: { file_name: aiFile.name, content },
      });

      if (error) throw new Error(error.message || 'Extraction failed');
      if (!data?.success) throw new Error(data?.error || 'No data returned');

      const result = parseExtraction(data.data);
      setExtraction(result);

      // Pre-fill form from extraction
      setCredForm(f => ({
        ...f,
        credential_type: result.credential_type.value || f.credential_type,
        custom_title: result.custom_title.value || f.custom_title,
        holder_name: result.holder_name?.value || f.holder_name,
        jurisdiction: result.jurisdiction?.value || f.jurisdiction,
        issuing_authority: result.issuing_authority?.value || f.issuing_authority,
        credential_number: result.credential_number?.value || f.credential_number,
        expiration_date: result.expiration_date?.value || f.expiration_date,
        issue_date: result.issue_date?.value || f.issue_date,
      }));

      setStep('ai-review');
    } catch (e: any) {
      console.error('AI extraction error:', e);
      setAiError(e.message || 'Something went wrong. You can finish the details manually.');
      // Fall back to manual with whatever we have
      setStep('ai-review');
    }
  }, [aiFile, session?.access_token]);

  const handleSaveCredential = async () => {
    setSaving(true);
    try {
      const title = credForm.custom_title || CREDENTIAL_OPTIONS.find(o => o.key === credForm.credential_type)?.label || 'Credential';
      const result = await addCredential.mutateAsync({
        credential_type: credForm.credential_type,
        custom_title: title,
        jurisdiction: credForm.jurisdiction || null,
        issuing_authority: credForm.issuing_authority || null,
        credential_number: credForm.credential_number || null,
        expiration_date: credForm.expiration_date || null,
        issue_date: credForm.issue_date || null,
        notes: credForm.notes || '',
      });

      // If AI path, also upload the source document and link it
      if (entryMode === 'ai' && aiFile && result?.id) {
        await uploadDocument(aiFile, result.id);
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
      await uploadDocument(documentFile);
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
        linked_credential_ids: [],
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

  const handleComplete = () => onComplete(summary);

  const getConfidenceBadge = (conf: 'high' | 'review' | 'unclear') => {
    const styles = {
      high: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      review: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      unclear: 'bg-muted text-muted-foreground border-border',
    };
    const labels = { high: 'High confidence', review: 'Review suggested', unclear: 'Missing / unclear' };
    return <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-normal', styles[conf])}>{labels[conf]}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg p-0 gap-0 [&>button]:hidden overflow-hidden" onPointerDownOutside={e => e.preventDefault()}>
        {/* Progress header */}
        <div className="px-6 pt-5 pb-3 space-y-2 border-b">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Step {Math.min(stepIndex + 1, totalVisible)} of {totalVisible}
            </span>
            {step !== 'complete' && step !== 'ai-processing' && (
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

          {/* STEP: Select Types */}
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
                      className={cn('cursor-pointer transition-all hover:shadow-md', selected && 'ring-2 ring-primary border-primary/50')}
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

          {/* STEP: Add Credential (manual vs AI choice) */}
          {step === 'add-credential' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold">Add your first credential</h3>
                <p className="text-sm text-muted-foreground mt-1">Start with the credential you rely on most often for work.</p>
              </div>

              {/* Method picker cards */}
              <div className="grid grid-cols-1 gap-3">
                <Card
                  className={cn('cursor-pointer transition-all hover:shadow-md', entryMode === 'manual' && 'ring-2 ring-primary border-primary/50')}
                  onClick={() => setEntryMode('manual')}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={cn('p-2.5 rounded-lg', entryMode === 'manual' ? 'bg-primary/20' : 'bg-muted')}>
                      <FileText className={cn('h-5 w-5', entryMode === 'manual' ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Enter manually</p>
                      <p className="text-xs text-muted-foreground">Type in your credential details step by step</p>
                    </div>
                  </CardContent>
                </Card>
                <Card
                  className={cn('cursor-pointer transition-all hover:shadow-md', entryMode === 'ai' && 'ring-2 ring-primary border-primary/50')}
                  onClick={() => setEntryMode('ai')}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={cn('p-2.5 rounded-lg', entryMode === 'ai' ? 'bg-primary/20' : 'bg-muted')}>
                      <Zap className={cn('h-5 w-5', entryMode === 'ai' ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Upload document for faster setup</p>
                      <p className="text-xs text-muted-foreground">Save time — LocumOps reviews your document and suggests the details</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Manual form inline */}
              {entryMode === 'manual' && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Credential type</Label>
                    <Select value={credForm.credential_type} onValueChange={v => setCredForm(f => ({ ...f, credential_type: v, custom_title: CREDENTIAL_OPTIONS.find(o => o.key === v)?.label || '' }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CREDENTIAL_OPTIONS.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
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
              )}
            </div>
          )}

          {/* STEP: AI Upload */}
          {step === 'ai-upload' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold">Upload your first credential document</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Start with a license copy, DEA document, insurance file, or similar credential record. LocumOps will review it and suggest the important details.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Veterinary license', 'DEA registration', 'Malpractice insurance', 'Controlled substance permit'].map(t => (
                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center space-y-3 transition-colors',
                  aiFile ? 'border-primary/50 bg-primary/5' : 'hover:border-muted-foreground/30'
                )}
              >
                <Upload className={cn('h-8 w-8 mx-auto', aiFile ? 'text-primary' : 'text-muted-foreground')} />
                <div>
                  <p className="text-sm font-medium">{aiFile ? aiFile.name : 'Drop your document here or click to browse'}</p>
                  {aiFile && <p className="text-xs text-muted-foreground mt-1">{(aiFile.size / 1024).toFixed(0)} KB</p>}
                </div>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                  className="hidden"
                  id="ai-file-upload"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setAiFile(f);
                  }}
                />
                <Button variant="outline" size="sm" onClick={() => document.getElementById('ai-file-upload')?.click()}>
                  {aiFile ? 'Change file' : 'Choose file'}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                You'll review any suggested details before anything is saved.
              </p>
            </div>
          )}

          {/* STEP: AI Processing */}
          {step === 'ai-processing' && (
            <div className="space-y-6 text-center py-8">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-7 w-7 text-primary animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Reviewing your document</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  LocumOps is finding the details that matter most for setup.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  {processingMessage}
                </div>
              </div>
            </div>
          )}

          {/* STEP: AI Review */}
          {step === 'ai-review' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold">Review suggested details</h3>
                {aiError ? (
                  <div className="flex items-start gap-2 mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {aiError.includes('couldn') ? aiError : "We couldn't identify everything automatically. You can finish the details manually."}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    LocumOps reviewed your document. Please confirm or edit the details before saving.
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <ReviewField
                  label="Credential type"
                  confidence={extraction?.credential_type.confidence}
                  badge={getConfidenceBadge}
                >
                  <Select value={credForm.credential_type} onValueChange={v => setCredForm(f => ({ ...f, credential_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CREDENTIAL_OPTIONS.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </ReviewField>

                <ReviewField label="Title" confidence={extraction?.custom_title.confidence} badge={getConfidenceBadge}>
                  <Input value={credForm.custom_title} onChange={e => setCredForm(f => ({ ...f, custom_title: e.target.value }))} />
                </ReviewField>

                <ReviewField label="Holder name" confidence={extraction?.holder_name?.confidence} badge={getConfidenceBadge}>
                  <Input value={credForm.holder_name} onChange={e => setCredForm(f => ({ ...f, holder_name: e.target.value }))} placeholder="Name on credential" />
                </ReviewField>

                <ReviewField label="Issuing state" confidence={extraction?.jurisdiction?.confidence} badge={getConfidenceBadge}>
                  <Select value={credForm.jurisdiction} onValueChange={v => setCredForm(f => ({ ...f, jurisdiction: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </ReviewField>

                <ReviewField label="Issuing authority" confidence={extraction?.issuing_authority?.confidence} badge={getConfidenceBadge}>
                  <Input value={credForm.issuing_authority} onChange={e => setCredForm(f => ({ ...f, issuing_authority: e.target.value }))} placeholder="e.g. State Veterinary Board" />
                </ReviewField>

                <ReviewField label="Credential number" confidence={extraction?.credential_number?.confidence} badge={getConfidenceBadge}>
                  <Input value={credForm.credential_number} onChange={e => setCredForm(f => ({ ...f, credential_number: e.target.value }))} placeholder="e.g. VET-12345" />
                </ReviewField>

                <div className="grid grid-cols-2 gap-3">
                  <ReviewField label="Issue date" confidence={extraction?.issue_date?.confidence} badge={getConfidenceBadge}>
                    <Input type="date" value={credForm.issue_date} onChange={e => setCredForm(f => ({ ...f, issue_date: e.target.value }))} />
                  </ReviewField>
                  <ReviewField label="Expiration date" confidence={extraction?.expiration_date?.confidence} badge={getConfidenceBadge}>
                    <Input type="date" value={credForm.expiration_date} onChange={e => setCredForm(f => ({ ...f, expiration_date: e.target.value }))} />
                  </ReviewField>
                </div>
              </div>

              {extraction?.document_type_label && (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground mb-1">This document will be saved as:</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{extraction.document_type_label}</Badge>
                    <span className="text-xs text-muted-foreground">linked to</span>
                    <Badge variant="outline" className="text-xs">{credForm.custom_title || 'Credential'}</Badge>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                Review AI-suggested details before saving. Always verify official renewal requirements with your licensing authority.
              </p>
            </div>
          )}

          {/* STEP: Upload Document */}
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
                {documentFile && <p className="text-xs text-primary font-medium">{documentFile.name}</p>}
              </div>
            </div>
          )}

          {/* STEP: Add CE */}
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

          {/* STEP: Complete */}
          {step === 'complete' && (
            <div className="space-y-5 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {entryMode === 'ai' ? 'Your first credential is ready' : "You're off to a good start"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Here's what you've set up so far:</p>
              </div>
              <div className="space-y-2 text-left">
                <SummaryRow done={summary.credentialAdded} label={summary.credentialAdded ? `${summary.credentialTitle} added` : 'No credential added yet'} />
                {summary.expirationDays != null && summary.expirationDays > 0 && (
                  <SummaryRow done label={`Next expiration in ${summary.expirationDays} days`} />
                )}
                <SummaryRow done={summary.documentUploaded} label={summary.documentUploaded ? 'Document linked successfully' : 'Document upload recommended'} />
                <SummaryRow done={summary.ceAdded} label={summary.ceAdded ? 'CE tracking started' : 'CE tracking not yet started'} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          {/* Back buttons */}
          <div>
            {step === 'add-credential' && (
              <Button variant="ghost" size="sm" onClick={() => setStep('select-types')} className="gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            )}
            {step === 'ai-upload' && (
              <Button variant="ghost" size="sm" onClick={() => setStep('add-credential')} className="gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            )}
            {step === 'ai-review' && (
              <Button variant="ghost" size="sm" onClick={() => { setAiFile(null); setExtraction(null); setAiError(null); setStep('ai-upload'); }} className="gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Start over
              </Button>
            )}
            {step === 'upload-document' && (
              <Button variant="ghost" size="sm" onClick={() => setStep(entryMode === 'ai' ? 'ai-review' : 'add-credential')} className="gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {step === 'select-types' && (
              <Button onClick={() => { onSetSelectedTypes(selectedTypes); setStep('add-credential'); }} className="gap-1">
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
            {step === 'add-credential' && (
              <>
                {entryMode === 'manual' ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setStep('upload-document')}>Skip for now</Button>
                    <Button onClick={handleSaveCredential} disabled={saving} className="gap-1">
                      {saving ? 'Saving...' : 'Save credential'}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setStep('ai-upload')} className="gap-1">
                    Continue <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </>
            )}
            {step === 'ai-upload' && (
              <>
                <Button variant="ghost" size="sm" onClick={() => { setEntryMode('manual'); setStep('add-credential'); }}>Enter manually instead</Button>
                <Button onClick={handleAiUpload} disabled={!aiFile} className="gap-1">
                  <Upload className="h-3.5 w-3.5" /> Upload & review
                </Button>
              </>
            )}
            {step === 'ai-review' && (
              <Button onClick={handleSaveCredential} disabled={saving} className="gap-1">
                {saving ? 'Saving...' : 'Confirm & save'}
              </Button>
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
                <Button variant="ghost" size="sm" onClick={() => setStep('complete')}>Skip for now</Button>
                <Button onClick={handleSaveCE} disabled={saving || !ceForm.title || !ceForm.completion_date} className="gap-1">
                  {saving ? 'Saving...' : 'Add CE now'}
                </Button>
              </>
            )}
            {step === 'complete' && (
              <>
                <Button variant="outline" onClick={() => { setEntryMode('manual'); setStep('add-credential'); }}>Add another credential</Button>
                <Button onClick={handleComplete} className="gap-1">Go to dashboard</Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// === Sub-components ===

function ReviewField({ label, confidence, badge, children }: {
  label: string;
  confidence?: 'high' | 'review' | 'unclear';
  badge: (c: 'high' | 'review' | 'unclear') => React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        {confidence && badge(confidence)}
      </div>
      {children}
    </div>
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
