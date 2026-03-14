import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, FileText, CalendarDays, Check, Pencil, SkipForward, Merge, AlertTriangle } from 'lucide-react';
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
      <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{d.name}</span>
        </div>
        <Badge variant="outline" className="text-xs capitalize">{entity.review_status}</Badge>
      </div>
    );
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {editing ? (
              <Input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="h-8 text-sm font-medium" />
            ) : (
              <p className="font-medium text-sm">{d.name}</p>
            )}
            {d.address && <p className="text-xs text-muted-foreground">{d.address}</p>}
            {d.contact_name && <p className="text-xs text-muted-foreground">Contact: {d.contact_name} {d.contact_email ? `(${d.contact_email})` : ''}</p>}
            {d.weekday_rate && <p className="text-xs text-muted-foreground">Rate: ${d.weekday_rate}/day</p>}
          </div>
          <div className="flex items-center gap-1.5">
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
      </CardContent>
    </Card>
  );
}

function ContractReviewCard({ entity, onUpdate }: { entity: ImportedEntity; onUpdate: (status: ReviewStatus, data?: any) => void }) {
  const d = entity.parsed_data;

  if (entity.review_status !== 'pending') {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{d.facility_name || 'Contract terms'}</span>
        </div>
        <Badge variant="outline" className="text-xs capitalize">{entity.review_status}</Badge>
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
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-medium text-sm">{d.facility_name || 'Contract Terms'}</p>
            {terms.length > 0 && <p className="text-xs text-muted-foreground">{terms.join(' · ')}</p>}
            {d.cancellation_policy && <p className="text-xs text-muted-foreground truncate max-w-[300px]">Cancellation: {d.cancellation_policy}</p>}
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
      </CardContent>
    </Card>
  );
}

function ShiftReviewCard({ entity, onUpdate }: { entity: ImportedEntity; onUpdate: (status: ReviewStatus, data?: any) => void }) {
  const d = entity.parsed_data;

  if (entity.review_status !== 'pending') {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{d.date} — {d.facility_name || 'Unknown facility'}</span>
        </div>
        <Badge variant="outline" className="text-xs capitalize">{entity.review_status}</Badge>
      </div>
    );
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-medium text-sm">{d.date}</p>
            <p className="text-xs text-muted-foreground">
              {d.start_time?.slice(11, 16)} – {d.end_time?.slice(11, 16)}
              {d.facility_name && ` · ${d.facility_name}`}
            </p>
            {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
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
      </CardContent>
    </Card>
  );
}

export function ImportReviewPanel({ entities, onUpdateEntity, onBulkConfirm, onComplete, onBack }: ImportReviewPanelProps) {
  const facilityEntities = entities.filter(e => e.entity_type === 'facility');
  const contractEntities = entities.filter(e => e.entity_type === 'contract');
  const shiftEntities = entities.filter(e => e.entity_type === 'shift');

  const pendingFacilities = facilityEntities.filter(e => e.review_status === 'pending');
  const pendingShifts = shiftEntities.filter(e => e.review_status === 'pending');

  const sections = [
    { title: 'Facilities found', icon: Building2, items: facilityEntities, pending: pendingFacilities, Component: FacilityReviewCard },
    { title: 'Terms extracted', icon: FileText, items: contractEntities, pending: contractEntities.filter(e => e.review_status === 'pending'), Component: ContractReviewCard },
    { title: 'Upcoming shifts found', icon: CalendarDays, items: shiftEntities, pending: pendingShifts, Component: ShiftReviewCard },
  ].filter(s => s.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Review & Approve</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          We found these records. Review and confirm before adding them to your workspace.
        </p>
      </div>

      {sections.map(({ title, icon: Icon, items, pending, Component }) => (
        <Card key={title}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" /> {title}
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </CardTitle>
              {pending.length > 1 && (
                <Button size="sm" variant="outline" onClick={() => onBulkConfirm(pending.map(e => e.id))}>
                  <Check className="h-3 w-3 mr-1" /> Confirm all ({pending.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map(entity => (
              <Component
                key={entity.id}
                entity={entity}
                onUpdate={(status, data) => onUpdateEntity(entity.id, status, data)}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      {sections.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">No records were extracted. Try uploading different files or paste your data directly.</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onComplete}>
          <Check className="h-4 w-4 mr-2" /> Finish Setup
        </Button>
      </div>
    </div>
  );
}
