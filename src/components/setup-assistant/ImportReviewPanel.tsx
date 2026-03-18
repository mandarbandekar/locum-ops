import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, FileText, CalendarDays, Check, Pencil, SkipForward, Merge, AlertTriangle, Sparkles } from 'lucide-react';
import { ImportedEntity, getConfidenceLevel, type ReviewStatus, type SetupSummary } from '@/hooks/useSetupAssistant';

interface ImportReviewPanelProps {
  entities: ImportedEntity[];
  onUpdateEntity: (id: string, status: ReviewStatus, editedData?: any) => void;
  onBulkConfirm: (ids: string[]) => void;
  onComplete: () => void;
  onBack: () => void;
}

function ConfidenceBadge({ score }: { score: number | null }) {
  const level = getConfidenceLevel(score);
  const config = {
    high: { label: 'High confidence', variant: 'default' as const, className: 'bg-green-600/15 text-green-700 dark:text-green-400 border-green-600/20' },
    medium: { label: 'Medium', variant: 'outline' as const, className: 'border-warning/40 text-warning' },
    needs_review: { label: 'Needs review', variant: 'outline' as const, className: 'border-destructive/40 text-destructive' },
  }[level];

  return <Badge variant={config.variant} className={`text-[10px] ${config.className}`}>{config.label}</Badge>;
}

function FacilityReviewCard({ entity, onUpdate }: { entity: ImportedEntity; onUpdate: (status: ReviewStatus, data?: any) => void }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(entity.parsed_data);
  const d = entity.parsed_data;

  if (entity.review_status !== 'pending') {
    return (
      <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/50 border border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
            <Building2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium">{d.name}</span>
        </div>
        <Badge variant="outline" className="text-xs capitalize text-primary border-primary/30">{entity.review_status === 'confirmed' || entity.review_status === 'edited' ? '✓ Confirmed' : entity.review_status}</Badge>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1 min-w-0">
            {editing ? (
              <Input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="h-8 text-sm font-medium" />
            ) : (
              <p className="font-semibold text-sm text-foreground">{d.name}</p>
            )}
            {d.address && <p className="text-xs text-muted-foreground truncate">{d.address}</p>}
            {d.contact_name && <p className="text-xs text-muted-foreground">Contact: {d.contact_name} {d.contact_email ? `(${d.contact_email})` : ''}</p>}
            {d.weekday_rate && <p className="text-xs text-muted-foreground">Rate: ${d.weekday_rate}/day</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ConfidenceBadge score={entity.confidence_score} />
          {d.possible_duplicate_of && (
            <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">
              <Merge className="h-2.5 w-2.5 mr-0.5" /> Possible duplicate
            </Badge>
          )}
        </div>
      </div>
      {d.possible_duplicate_of && (
        <p className="text-xs text-warning flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> May be a duplicate of "{d.possible_duplicate_of}"
        </p>
      )}
      <div className="flex gap-1.5">
        <Button size="sm" variant="default" onClick={() => {
          if (editing) {
            onUpdate('edited', editData);
            setEditing(false);
          } else {
            onUpdate('confirmed');
          }
        }}>
          <Check className="h-3 w-3 mr-1" /> {editing ? 'Save' : 'Confirm'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
          <Pencil className="h-3 w-3 mr-1" /> Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onUpdate('skipped')}>
          <SkipForward className="h-3 w-3 mr-1" /> Skip
        </Button>
        {d.possible_duplicate_of && (
          <Button size="sm" variant="ghost" onClick={() => onUpdate('merged')}>
            <Merge className="h-3 w-3 mr-1" /> Merge
          </Button>
        )}
      </div>
    </div>
  );
}

function ContractReviewCard({ entity, onUpdate }: { entity: ImportedEntity; onUpdate: (status: ReviewStatus, data?: any) => void }) {
  const d = entity.parsed_data;

  if (entity.review_status !== 'pending') {
    return (
      <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/50 border border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
            <FileText className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium">{d.facility_name || 'Contract terms'}</span>
        </div>
        <Badge variant="outline" className="text-xs capitalize text-primary border-primary/30">{entity.review_status === 'confirmed' || entity.review_status === 'edited' ? '✓ Confirmed' : entity.review_status}</Badge>
      </div>
    );
  }

  const terms = [
    d.weekday_rate && `Weekday: $${d.weekday_rate}`,
    d.weekend_rate && `Weekend: $${d.weekend_rate}`,
    d.holiday_rate && `Holiday: $${d.holiday_rate}`,
    d.payment_terms_days && `Net ${d.payment_terms_days} days`,
  ].filter(Boolean);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-sm">{d.facility_name || 'Contract Terms'}</p>
            {terms.length > 0 && <p className="text-xs text-muted-foreground">{terms.join(' · ')}</p>}
            {d.cancellation_policy && <p className="text-xs text-muted-foreground truncate max-w-[300px]">Cancellation: {d.cancellation_policy}</p>}
          </div>
        </div>
        <ConfidenceBadge score={entity.confidence_score} />
      </div>
      <p className="text-[10px] text-warning flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" /> AI-extracted for review. Please verify against the original contract.
      </p>
      <div className="flex gap-1.5">
        <Button size="sm" onClick={() => onUpdate('confirmed')}><Check className="h-3 w-3 mr-1" /> Accept</Button>
        <Button size="sm" variant="ghost" onClick={() => onUpdate('skipped')}><SkipForward className="h-3 w-3 mr-1" /> Ignore</Button>
      </div>
    </div>
  );
}

function ShiftReviewCard({ entity, onUpdate }: { entity: ImportedEntity; onUpdate: (status: ReviewStatus, data?: any) => void }) {
  const d = entity.parsed_data;

  if (entity.review_status !== 'pending') {
    return (
      <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/50 border border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium">{d.date} — {d.facility_name || 'Unknown facility'}</span>
        </div>
        <Badge variant="outline" className="text-xs capitalize text-primary border-primary/30">{entity.review_status === 'confirmed' || entity.review_status === 'edited' ? '✓ Confirmed' : entity.review_status}</Badge>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-sm">{d.date}</p>
            <p className="text-xs text-muted-foreground">
              {d.start_time?.slice(11, 16)} – {d.end_time?.slice(11, 16)}
              {d.facility_name && ` · ${d.facility_name}`}
            </p>
            {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ConfidenceBadge score={entity.confidence_score} />
          {d.has_overlap && <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">Overlap</Badge>}
        </div>
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" onClick={() => onUpdate('confirmed')}><Check className="h-3 w-3 mr-1" /> Import</Button>
        <Button size="sm" variant="ghost" onClick={() => onUpdate('skipped')}><SkipForward className="h-3 w-3 mr-1" /> Skip</Button>
      </div>
    </div>
  );
}

export function ImportReviewPanel({ entities, onUpdateEntity, onBulkConfirm, onComplete, onBack }: ImportReviewPanelProps) {
  const facilityEntities = entities.filter(e => e.entity_type === 'facility');
  const contractEntities = entities.filter(e => e.entity_type === 'contract');
  const shiftEntities = entities.filter(e => e.entity_type === 'shift');

  const pendingFacilities = facilityEntities.filter(e => e.review_status === 'pending');
  const pendingShifts = shiftEntities.filter(e => e.review_status === 'pending');

  const totalConfirmed = entities.filter(e => e.review_status === 'confirmed' || e.review_status === 'edited').length;
  const totalPending = entities.filter(e => e.review_status === 'pending').length;

  const sections = [
    { title: 'Facilities', icon: Building2, items: facilityEntities, pending: pendingFacilities, Component: FacilityReviewCard },
    { title: 'Terms', icon: FileText, items: contractEntities, pending: contractEntities.filter(e => e.review_status === 'pending'), Component: ContractReviewCard },
    { title: 'Shifts', icon: CalendarDays, items: shiftEntities, pending: pendingShifts, Component: ShiftReviewCard },
  ].filter(s => s.items.length > 0);

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-120px)]">
      {/* Fixed header */}
      <div className="shrink-0 space-y-3 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Review & Approve</h2>
          <p className="text-muted-foreground text-sm mt-1">
            We extracted {entities.length} record{entities.length !== 1 ? 's' : ''} from your files. Review before adding to your workspace.
          </p>
        </div>

        {/* Summary strip */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-2.5">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <div className="flex items-center gap-4 text-sm">
            {facilityEntities.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{facilityEntities.length}</span>
                <span className="text-muted-foreground">clinic{facilityEntities.length !== 1 ? 's' : ''}</span>
              </span>
            )}
            {contractEntities.length > 0 && (
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{contractEntities.length}</span>
                <span className="text-muted-foreground">term{contractEntities.length !== 1 ? 's' : ''}</span>
              </span>
            )}
            {shiftEntities.length > 0 && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{shiftEntities.length}</span>
                <span className="text-muted-foreground">shift{shiftEntities.length !== 1 ? 's' : ''}</span>
              </span>
            )}
          </div>
          {totalConfirmed > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {totalConfirmed} confirmed
            </Badge>
          )}
        </div>
      </div>

      {/* Scrollable entity list */}
      <ScrollArea className="flex-1 min-h-0 -mx-1 px-1">
        <div className="space-y-5 pb-4">
          {sections.map(({ title, icon: Icon, items, pending, Component }) => (
            <div key={title} className="space-y-2">
              <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm py-1.5 z-10">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <Badge variant="secondary" className="text-[10px] h-5">{items.length}</Badge>
                </div>
                {pending.length > 1 && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onBulkConfirm(pending.map(e => e.id))}>
                    <Check className="h-3 w-3 mr-1" /> Confirm all ({pending.length})
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {items.map(entity => (
                  <Component
                    key={entity.id}
                    entity={entity}
                    onUpdate={(status, data) => onUpdateEntity(entity.id, status, data)}
                  />
                ))}
              </div>
            </div>
          ))}

          {sections.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 py-8 text-center">
              <p className="text-muted-foreground text-sm">No records were extracted. Try uploading different files or paste your data directly.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Fixed footer */}
      <div className="shrink-0 flex justify-between items-center pt-4 border-t border-border mt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onComplete} disabled={totalConfirmed === 0 && totalPending === 0}>
          <Check className="h-4 w-4 mr-2" /> Finish Setup
          {totalConfirmed > 0 && <Badge variant="secondary" className="ml-2 text-[10px]">{totalConfirmed}</Badge>}
        </Button>
      </div>
    </div>
  );
}
