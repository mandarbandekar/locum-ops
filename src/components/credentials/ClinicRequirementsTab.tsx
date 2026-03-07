import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useCredentials } from '@/hooks/useCredentials';
import { CREDENTIAL_TYPE_LABELS } from '@/lib/credentialTypes';
import { CredentialStatusBadge } from '@/components/credentials/CredentialStatusBadge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Building2, Plus, CheckCircle2, XCircle, AlertTriangle, Clock,
  ChevronRight, Search, Trash2, FileText, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type ClinicRequirement = Database['public']['Tables']['clinic_requirements']['Row'];
type RequirementMapping = Database['public']['Tables']['clinic_requirement_mappings']['Row'];
type CredentialTypeEnum = Database['public']['Enums']['credential_type'];
type RequirementStatusEnum = Database['public']['Enums']['requirement_status'];

const DEFAULT_REQUIREMENTS = [
  { name: 'Active Veterinary License', type: 'veterinary_license' as CredentialTypeEnum },
  { name: 'DEA Registration', type: 'dea_registration' as CredentialTypeEnum },
  { name: 'Liability Insurance', type: 'professional_liability_insurance' as CredentialTypeEnum },
  { name: 'W-9', type: 'w9' as CredentialTypeEnum },
  { name: 'Background Check', type: 'background_check' as CredentialTypeEnum },
  { name: 'Contractor Onboarding', type: 'contractor_onboarding' as CredentialTypeEnum },
  { name: 'CE Proof', type: 'ce_certificate' as CredentialTypeEnum },
];

export default function ClinicRequirementsTab() {
  const { user } = useAuth();
  const { facilities } = useData();
  const { credentials, documents } = useCredentials();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [addReqDialogOpen, setAddReqDialogOpen] = useState(false);
  const [setupClinicId, setSetupClinicId] = useState<string | null>(null);

  // Fetch all clinic requirements
  const requirementsQuery = useQuery({
    queryKey: ['clinic_requirements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_requirements')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ClinicRequirement[];
    },
    enabled: !!user,
  });

  // Fetch all mappings
  const mappingsQuery = useQuery({
    queryKey: ['clinic_requirement_mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_requirement_mappings')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as RequirementMapping[];
    },
    enabled: !!user,
  });

  const requirements = requirementsQuery.data ?? [];
  const mappings = mappingsQuery.data ?? [];

  // Clinics with requirements
  const clinicIds = useMemo(() => {
    const ids = new Set(requirements.map(r => r.clinic_id));
    return Array.from(ids);
  }, [requirements]);

  const filteredFacilities = useMemo(() => {
    return facilities.filter(f => {
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [facilities, search]);

  // Per-clinic stats
  const clinicStats = useMemo(() => {
    const stats: Record<string, { total: number; complete: number; missing: number; expired: number }> = {};
    clinicIds.forEach(cId => {
      const reqs = requirements.filter(r => r.clinic_id === cId);
      const maps = mappings.filter(m => reqs.some(r => r.id === m.requirement_id));
      const complete = maps.filter(m => m.status === 'complete').length;
      const expired = maps.filter(m => m.status === 'expired').length;
      const missing = reqs.length - maps.length;
      stats[cId] = { total: reqs.length, complete, missing: missing + maps.filter(m => m.status === 'missing' || m.status === 'pending').length, expired };
    });
    return stats;
  }, [clinicIds, requirements, mappings]);

  const selectedClinic = facilities.find(f => f.id === selectedClinicId);
  const selectedReqs = requirements.filter(r => r.clinic_id === selectedClinicId);
  const selectedMappings = mappings.filter(m => selectedReqs.some(r => r.id === m.requirement_id));

  // Setup default requirements for a clinic
  const setupClinic = useMutation({
    mutationFn: async (clinicId: string) => {
      if (!user) throw new Error('Not authenticated');
      const inserts = DEFAULT_REQUIREMENTS.map(r => ({
        clinic_id: clinicId,
        requirement_name: r.name,
        requirement_type: r.type,
        required: true,
        user_id: user.id,
      }));
      const { error } = await supabase.from('clinic_requirements').insert(inserts);
      if (error) throw error;

      // Create pending mappings
      const { data: newReqs } = await supabase
        .from('clinic_requirements')
        .select('*')
        .eq('clinic_id', clinicId);
      if (newReqs) {
        const mapInserts = newReqs.map(r => ({
          clinic_id: clinicId,
          requirement_id: r.id,
          status: 'pending' as RequirementStatusEnum,
          user_id: user.id,
        }));
        await supabase.from('clinic_requirement_mappings').insert(mapInserts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic_requirements'] });
      queryClient.invalidateQueries({ queryKey: ['clinic_requirement_mappings'] });
      toast({ title: 'Clinic requirements set up' });
      setSetupClinicId(null);
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  // Add custom requirement
  const addRequirement = useMutation({
    mutationFn: async (data: { clinic_id: string; requirement_name: string; requirement_type: CredentialTypeEnum; notes?: string }) => {
      const { data: req, error } = await supabase
        .from('clinic_requirements')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      // Create pending mapping
      await supabase.from('clinic_requirement_mappings').insert({
        clinic_id: data.clinic_id,
        requirement_id: req.id,
        status: 'pending' as RequirementStatusEnum,
      });
      return req;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic_requirements'] });
      queryClient.invalidateQueries({ queryKey: ['clinic_requirement_mappings'] });
      toast({ title: 'Requirement added' });
      setAddReqDialogOpen(false);
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  // Update mapping status
  const updateMapping = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: RequirementStatusEnum; credential_id?: string | null; document_id?: string | null }) => {
      const { error } = await supabase
        .from('clinic_requirement_mappings')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic_requirement_mappings'] });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  // Delete requirement
  const deleteRequirement = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('clinic_requirement_mappings').delete().eq('requirement_id', id);
      const { error } = await supabase.from('clinic_requirements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic_requirements'] });
      queryClient.invalidateQueries({ queryKey: ['clinic_requirement_mappings'] });
      toast({ title: 'Requirement removed' });
    },
  });

  const isLoading = requirementsQuery.isLoading || mappingsQuery.isLoading;

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Loading…</p></div>;
  }

  // Detail view for a selected clinic
  if (selectedClinic) {
    return (
      <ClinicDetailView
        clinic={selectedClinic}
        requirements={selectedReqs}
        mappings={selectedMappings}
        credentials={credentials}
        documents={documents}
        onBack={() => setSelectedClinicId(null)}
        onAddReq={() => setAddReqDialogOpen(true)}
        onUpdateMapping={(id, updates) => updateMapping.mutateAsync({ id, ...updates })}
        onDeleteReq={(id) => deleteRequirement.mutateAsync(id)}
        addReqDialog={
          <AddRequirementDialog
            open={addReqDialogOpen}
            onOpenChange={setAddReqDialogOpen}
            clinicId={selectedClinic.id}
            onAdd={(data) => addRequirement.mutateAsync(data)}
          />
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search clinics…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{clinicIds.length}</p>
              <p className="text-xs text-muted-foreground">Clinics Configured</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div>
            <div>
              <p className="text-2xl font-bold">
                {Object.values(clinicStats).reduce((sum, s) => sum + s.complete, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Requirements Met</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><XCircle className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-2xl font-bold">
                {Object.values(clinicStats).reduce((sum, s) => sum + s.missing, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Missing / Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clinic list */}
      {filteredFacilities.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="p-4 rounded-full bg-muted inline-block mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Clinics Found</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Add clinics in the Facilities section first.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredFacilities.map(facility => {
            const hasReqs = clinicIds.includes(facility.id);
            const stats = clinicStats[facility.id];
            const completionPct = stats ? Math.round((stats.complete / stats.total) * 100) || 0 : 0;

            return (
              <Card
                key={facility.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  if (hasReqs) {
                    setSelectedClinicId(facility.id);
                  } else {
                    setSetupClinicId(facility.id);
                  }
                }}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-primary/10">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{facility.name}</h3>
                        <Badge variant={facility.status === 'active' ? 'default' : 'secondary'} className="text-xs mt-0.5">
                          {facility.status}
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>

                  {hasReqs ? (
                    <>
                      <Progress value={completionPct} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{stats.complete}/{stats.total} complete</span>
                        {stats.missing > 0 && (
                          <span className="text-destructive font-medium">{stats.missing} missing</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No requirements configured — click to set up</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Setup Confirmation Dialog */}
      <Dialog open={!!setupClinicId} onOpenChange={open => { if (!open) setSetupClinicId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Up Clinic Requirements</DialogTitle>
            <DialogDescription>
              Add default credential requirements for {facilities.find(f => f.id === setupClinicId)?.name}? You can customize them afterwards.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupClinicId(null)}>Cancel</Button>
            <Button
              onClick={() => setupClinicId && setupClinic.mutateAsync(setupClinicId).then(() => setSelectedClinicId(setupClinicId))}
              disabled={setupClinic.isPending}
            >
              {setupClinic.isPending ? 'Setting up…' : 'Set Up Defaults'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---- Clinic Detail View ---- */

function ClinicDetailView({ clinic, requirements, mappings, credentials, documents, onBack, onAddReq, onUpdateMapping, onDeleteReq, addReqDialog }: {
  clinic: { id: string; name: string; status: string };
  requirements: ClinicRequirement[];
  mappings: RequirementMapping[];
  credentials: any[];
  documents: any[];
  onBack: () => void;
  onAddReq: () => void;
  onUpdateMapping: (id: string, updates: any) => Promise<void>;
  onDeleteReq: (id: string) => Promise<void>;
  addReqDialog: React.ReactNode;
}) {
  const completedCount = mappings.filter(m => m.status === 'complete').length;
  const totalCount = requirements.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{clinic.name}</h2>
            <p className="text-sm text-muted-foreground">Credential requirements checklist</p>
          </div>
        </div>
        <Button onClick={onAddReq} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add Requirement
        </Button>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Readiness</span>
            <span className="text-sm text-muted-foreground">{completedCount}/{totalCount} ({completionPct}%)</span>
          </div>
          <Progress value={completionPct} className="h-3" />
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> {mappings.filter(m => m.status === 'complete').length} Complete</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-warning" /> {mappings.filter(m => m.status === 'pending').length} Pending</span>
            <span className="flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-destructive" /> {mappings.filter(m => m.status === 'missing').length} Missing</span>
            <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-destructive" /> {mappings.filter(m => m.status === 'expired').length} Expired</span>
          </div>
        </CardContent>
      </Card>

      {/* Requirements List */}
      <div className="space-y-3">
        {requirements.map(req => {
          const mapping = mappings.find(m => m.requirement_id === req.id);
          const status = mapping?.status || 'missing';
          const linkedCred = mapping?.credential_id ? credentials.find(c => c.id === mapping.credential_id) : null;
          const linkedDoc = mapping?.document_id ? documents.find(d => d.id === mapping.document_id) : null;

          return (
            <RequirementRow
              key={req.id}
              requirement={req}
              mapping={mapping}
              status={status}
              linkedCred={linkedCred}
              linkedDoc={linkedDoc}
              credentials={credentials}
              documents={documents}
              onUpdateMapping={onUpdateMapping}
              onDelete={() => onDeleteReq(req.id)}
            />
          );
        })}
      </div>

      {requirements.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No requirements yet. Click "Add Requirement" to begin.</p>
          </CardContent>
        </Card>
      )}

      {addReqDialog}
    </div>
  );
}

/* ---- Requirement Row ---- */

function RequirementRow({ requirement, mapping, status, linkedCred, linkedDoc, credentials, documents, onUpdateMapping, onDelete }: {
  requirement: ClinicRequirement;
  mapping: RequirementMapping | undefined;
  status: string;
  linkedCred: any;
  linkedDoc: any;
  credentials: any[];
  documents: any[];
  onUpdateMapping: (id: string, updates: any) => Promise<void>;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = {
    complete: <CheckCircle2 className="h-5 w-5 text-success" />,
    pending: <Clock className="h-5 w-5 text-warning" />,
    missing: <XCircle className="h-5 w-5 text-destructive" />,
    expired: <AlertTriangle className="h-5 w-5 text-destructive" />,
  }[status] || <Clock className="h-5 w-5 text-muted-foreground" />;

  const statusBadge = {
    complete: <Badge className="bg-success/15 text-success border-0">Complete</Badge>,
    pending: <Badge className="bg-warning/15 text-warning border-0">Pending</Badge>,
    missing: <Badge className="bg-destructive/15 text-destructive border-0">Missing</Badge>,
    expired: <Badge className="bg-destructive/15 text-destructive border-0">Expired</Badge>,
  }[status] || <Badge variant="secondary">Unknown</Badge>;

  return (
    <Card className={cn(
      'transition-colors',
      status === 'missing' && 'border-destructive/30',
      status === 'expired' && 'border-destructive/20',
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          {statusIcon}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{requirement.requirement_name}</span>
              {requirement.required && <Badge variant="outline" className="text-[10px] h-5">Required</Badge>}
            </div>
            <span className="text-xs text-muted-foreground">
              {CREDENTIAL_TYPE_LABELS[requirement.requirement_type] || requirement.requirement_type}
            </span>
          </div>
          {statusBadge}
          <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
        </div>

        {expanded && mapping && (
          <div className="mt-4 pl-8 space-y-3 border-t pt-3">
            {/* Link credential */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Linked Credential</label>
              <Select
                value={mapping.credential_id || ''}
                onValueChange={v => onUpdateMapping(mapping.id, {
                  credential_id: v || null,
                  status: v ? 'complete' : 'pending',
                })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select a credential…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {credentials
                    .filter(c => c.credential_type === requirement.requirement_type || requirement.requirement_type === 'custom')
                    .map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.custom_title}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Link document */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Linked Document</label>
              <Select
                value={mapping.document_id || ''}
                onValueChange={v => onUpdateMapping(mapping.id, { document_id: v || null })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select a document…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {documents.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.file_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status override */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select
                value={mapping.status}
                onValueChange={v => onUpdateMapping(mapping.id, { status: v })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="missing">Missing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            {requirement.notes && (
              <p className="text-xs text-muted-foreground italic">{requirement.notes}</p>
            )}

            <div className="flex justify-end">
              <Button variant="ghost" size="sm" className="text-destructive h-7 text-xs" onClick={onDelete}>
                <Trash2 className="mr-1 h-3 w-3" /> Remove Requirement
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---- Add Requirement Dialog ---- */

function AddRequirementDialog({ open, onOpenChange, clinicId, onAdd }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string;
  onAdd: (data: any) => Promise<any>;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CredentialTypeEnum>('custom');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onAdd({ clinic_id: clinicId, requirement_name: name, requirement_type: type, notes: notes || undefined });
      setName('');
      setType('custom');
      setNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Requirement</DialogTitle>
          <DialogDescription>Add a new credential requirement for this clinic.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Requirement Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Active Veterinary License" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Credential Type</label>
            <Select value={type} onValueChange={v => setType(v as CredentialTypeEnum)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CREDENTIAL_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special instructions…" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || submitting}>
            {submitting ? 'Adding…' : 'Add Requirement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
