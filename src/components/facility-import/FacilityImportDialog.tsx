import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Upload, StickyNote, Loader2, Check, X, Users, DollarSign, FileText, StickyNote as NoteIcon, AlertTriangle } from 'lucide-react';
import { useFacilityImport, type FacilitySuggestion, type SuggestionCategory } from '@/hooks/useFacilityImport';
import { FacilityContact, TermsSnapshot } from '@/types';
import { getConfidenceLevel } from '@/hooks/useSetupAssistant';
import { toast } from 'sonner';

interface FacilityImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  facilityName: string;
  // Callbacks to apply suggestions
  onAddContact: (contact: Omit<FacilityContact, 'id'>) => void;
  onUpdateTerms: (terms: TermsSnapshot) => void;
  onUpdateFacility: (updates: any) => void;
  existingTerms?: TermsSnapshot;
}

function ConfidenceBadge({ score }: { score: number | null }) {
  const level = getConfidenceLevel(score);
  const config = {
    high: { label: 'High confidence', className: 'bg-green-600/15 text-green-700 dark:text-green-400 border-green-600/20' },
    medium: { label: 'Medium', className: 'border-warning/40 text-warning' },
    needs_review: { label: 'Needs review', className: 'border-destructive/40 text-destructive' },
  }[level];
  return <Badge variant="outline" className={`text-[10px] ${config.className}`}>{config.label}</Badge>;
}

const categoryConfig: Record<SuggestionCategory, { icon: any; title: string }> = {
  contacts: { icon: Users, title: 'Contacts' },
  rates: { icon: DollarSign, title: 'Rates' },
  terms: { icon: FileText, title: 'Terms & Policies' },
  contracts: { icon: FileText, title: 'Contract Metadata' },
  notes: { icon: NoteIcon, title: 'Notes' },
};

function SuggestionCard({
  suggestion,
  onApply,
  onIgnore,
}: {
  suggestion: FacilitySuggestion;
  onApply: () => void;
  onIgnore: () => void;
}) {
  const d = suggestion.data;

  if (suggestion.status !== 'pending') {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
        <span className="text-sm text-muted-foreground">
          {suggestion.category === 'contacts' ? d.name :
           suggestion.category === 'rates' ? 'Rate updates' :
           suggestion.category === 'terms' ? 'Terms & policies' :
           suggestion.category === 'contracts' ? (d.title || 'Contract') :
           'Notes'}
        </span>
        <Badge variant="outline" className="text-xs capitalize">{suggestion.status}</Badge>
      </div>
    );
  }

  const renderContent = () => {
    switch (suggestion.category) {
      case 'contacts':
        return (
          <div className="space-y-0.5">
            <p className="font-medium text-sm">{d.name}</p>
            {d.role && <p className="text-xs text-muted-foreground">Role: {d.role}</p>}
            {d.email && <p className="text-xs text-muted-foreground">{d.email}</p>}
            {d.phone && <p className="text-xs text-muted-foreground">{d.phone}</p>}
          </div>
        );
      case 'rates': {
        const items = [
          d.weekday_rate != null && `Weekday: $${d.weekday_rate}`,
          d.weekend_rate != null && `Weekend: $${d.weekend_rate}`,
          d.holiday_rate != null && `Holiday: $${d.holiday_rate}`,
          d.partial_day_rate != null && `Partial day: $${d.partial_day_rate}`,
          d.telemedicine_rate != null && `Telemedicine: $${d.telemedicine_rate}`,
        ].filter(Boolean);
        return <p className="text-sm">{items.join(' · ')}</p>;
      }
      case 'terms': {
        const items = [
          d.payment_terms_days && `Net ${d.payment_terms_days} days`,
          d.cancellation_policy && `Cancellation: ${d.cancellation_policy.slice(0, 60)}...`,
          d.overtime_policy && `Overtime: ${d.overtime_policy.slice(0, 60)}...`,
          d.late_payment_policy && `Late payment: ${d.late_payment_policy.slice(0, 60)}...`,
          d.invoicing_instructions && `Invoicing: ${d.invoicing_instructions.slice(0, 60)}...`,
        ].filter(Boolean);
        return <div className="space-y-0.5">{items.map((t, i) => <p key={i} className="text-xs text-muted-foreground">{t}</p>)}</div>;
      }
      case 'contracts':
        return (
          <div className="space-y-0.5">
            {d.title && <p className="text-sm font-medium">{d.title}</p>}
            {d.effective_date && <p className="text-xs text-muted-foreground">Effective: {d.effective_date}</p>}
            {d.end_date && <p className="text-xs text-muted-foreground">Ends: {d.end_date}</p>}
          </div>
        );
      case 'notes':
        return <p className="text-sm text-muted-foreground">{d.notes}</p>;
      default:
        return null;
    }
  };

  return (
    <Card className="border-border/60">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          {renderContent()}
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <ConfidenceBadge score={suggestion.confidence} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">Source: {suggestion.source_label}</p>
          <div className="flex gap-1.5">
            <Button size="sm" onClick={onApply}><Check className="h-3 w-3 mr-1" /> Apply</Button>
            <Button size="sm" variant="ghost" onClick={onIgnore}><X className="h-3 w-3 mr-1" /> Ignore</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FacilityImportDialog({
  open,
  onOpenChange,
  facilityId,
  facilityName,
  onAddContact,
  onUpdateTerms,
  onUpdateFacility,
  existingTerms,
}: FacilityImportDialogProps) {
  const { processing, suggestions, processContent, processFile, updateSuggestionStatus } = useFacilityImport(facilityId, facilityName);
  const [phase, setPhase] = useState<'upload' | 'review'>('upload');
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      await processFile(file);
    }
    setPhase('review');
  };

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return;
    await processContent(pasteText, 'Pasted text');
    setPasteText('');
    setPhase('review');
  };

  const applySuggestion = (suggestion: FacilitySuggestion) => {
    const d = suggestion.data;
    switch (suggestion.category) {
      case 'contacts':
        onAddContact({
          facility_id: facilityId,
          name: d.name,
          role: d.role || 'Other',
          email: d.email || '',
          phone: d.phone || '',
          is_primary: false,
        });
        break;
      case 'rates': {
        const rateUpdates: Partial<TermsSnapshot> = {};
        if (d.weekday_rate != null) rateUpdates.weekday_rate = d.weekday_rate;
        if (d.weekend_rate != null) rateUpdates.weekend_rate = d.weekend_rate;
        if (d.holiday_rate != null) rateUpdates.holiday_rate = d.holiday_rate;
        if (d.partial_day_rate != null) rateUpdates.partial_day_rate = d.partial_day_rate;
        if (d.telemedicine_rate != null) rateUpdates.telemedicine_rate = d.telemedicine_rate;
        const merged = { ...(existingTerms || { id: '', facility_id: facilityId, weekday_rate: 0, weekend_rate: 0, partial_day_rate: 0, holiday_rate: 0, telemedicine_rate: 0, cancellation_policy_text: '', overtime_policy_text: '', late_payment_policy_text: '', special_notes: '' }), ...rateUpdates };
        onUpdateTerms(merged as TermsSnapshot);
        break;
      }
      case 'terms': {
        const termUpdates: Partial<TermsSnapshot> = {};
        if (d.cancellation_policy) termUpdates.cancellation_policy_text = d.cancellation_policy;
        if (d.overtime_policy) termUpdates.overtime_policy_text = d.overtime_policy;
        if (d.late_payment_policy) termUpdates.late_payment_policy_text = d.late_payment_policy;
        const merged = { ...(existingTerms || { id: '', facility_id: facilityId, weekday_rate: 0, weekend_rate: 0, partial_day_rate: 0, holiday_rate: 0, telemedicine_rate: 0, cancellation_policy_text: '', overtime_policy_text: '', late_payment_policy_text: '', special_notes: '' }), ...termUpdates };
        onUpdateTerms(merged as TermsSnapshot);
        break;
      }
      case 'notes':
        onUpdateFacility({ notes: d.notes });
        break;
      default:
        break;
    }
    updateSuggestionStatus(suggestion.id, 'applied');
    toast.success('Suggestion applied');
  };

  const groupedSuggestions = suggestions.reduce<Record<string, FacilitySuggestion[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import practice data</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Upload contracts, rate sheets, or notes for this practice and let LocumOps organize them for review.
          </p>
        </DialogHeader>

        {phase === 'upload' && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.csv,.xlsx,.xls,.txt"
              multiple
              onChange={e => { handleFileUpload(e.target.files); e.target.value = ''; }}
            />

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-20 flex-col gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={processing}>
                {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                <span className="text-xs">Upload file</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-1.5" onClick={() => {
                setPasteText('');
                setPhase('review'); // reuse review phase for paste input too
                // Actually show paste inline
              }} disabled={processing}>
                <StickyNote className="h-5 w-5" />
                <span className="text-xs">Paste notes</span>
              </Button>
            </div>

            <div className="space-y-2">
              <Textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="Paste contract text, rate sheet, email with terms, or any notes about this practice..."
                rows={5}
              />
              {pasteText.trim() && (
                <div className="flex justify-end">
                  <Button size="sm" onClick={handlePasteSubmit} disabled={processing}>
                    {processing && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    Process
                  </Button>
                </div>
              )}
            </div>

            {suggestions.length > 0 && (
              <Button variant="outline" className="w-full" onClick={() => setPhase('review')}>
                View {suggestions.filter(s => s.status === 'pending').length} pending suggestion(s)
              </Button>
            )}

            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              AI-extracted for review. Please verify against original documents.
            </p>
          </div>
        )}

        {phase === 'review' && (
          <div className="space-y-4">
            {suggestions.length === 0 && !processing && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">No suggestions yet. Upload a file or paste content to get started.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setPhase('upload')}>
                  Back to upload
                </Button>
              </div>
            )}

            {processing && (
              <div className="flex items-center justify-center py-6 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Analyzing content...</p>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              We found suggested updates for this facility. Review and apply the ones you want.
            </p>

            {Object.entries(groupedSuggestions).map(([category, items]) => {
              const config = categoryConfig[category as SuggestionCategory];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <div key={category} className="space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    {config.title}
                    <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  </h3>
                  {items.map(s => (
                    <SuggestionCard
                      key={s.id}
                      suggestion={s}
                      onApply={() => applySuggestion(s)}
                      onIgnore={() => updateSuggestionStatus(s.id, 'ignored')}
                    />
                  ))}
                </div>
              );
            })}

            <div className="flex justify-between pt-2">
              <Button variant="outline" size="sm" onClick={() => setPhase('upload')}>
                Add more data
              </Button>
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
