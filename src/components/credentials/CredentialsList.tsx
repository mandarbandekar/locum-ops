import { useState, useMemo } from 'react';
import { useCredentials, Credential } from '@/hooks/useCredentials';
import { useCEEntries } from '@/hooks/useCEEntries';
import { CREDENTIAL_TYPE_LABELS, computeCredentialStatus, getDaysUntilExpiration } from '@/lib/credentialTypes';
import { CredentialStatusBadge } from '@/components/credentials/CredentialStatusBadge';
import { CredentialExpirationChip } from '@/components/credentials/CredentialExpirationChip';
import { AddCredentialDialog } from '@/components/credentials/AddCredentialDialog';
import { AddCEEntryDialog } from '@/components/credentials/AddCEEntryDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Search, LayoutGrid, List, MoreHorizontal, Pencil, Trash2, Copy, RefreshCw, Archive, GraduationCap, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

type ViewMode = 'table' | 'card';

export default function CredentialsList() {
  const { credentials, isLoading, deleteCredential, updateCredential } = useCredentials();
  const { getCredentialCEStats } = useCEEntries();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [ceDialogOpen, setCeDialogOpen] = useState(false);
  const [cePreLinkedId, setCePreLinkedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterState, setFilterState] = useState('all');

  const enrichedCredentials = useMemo(() =>
    credentials.map(c => ({
      ...c,
      computedStatus: computeCredentialStatus(c.expiration_date, c.status),
      ceStats: getCredentialCEStats(c.id),
      daysLeft: getDaysUntilExpiration(c.expiration_date),
    })),
    [credentials, getCredentialCEStats]
  );

  const filtered = useMemo(() => {
    return enrichedCredentials.filter(c => {
      if (search && !c.custom_title.toLowerCase().includes(search.toLowerCase()) &&
          !c.credential_number?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType !== 'all' && c.credential_type !== filterType) return false;
      if (filterStatus !== 'all' && c.computedStatus !== filterStatus) return false;
      if (filterState !== 'all' && c.jurisdiction !== filterState) return false;
      return true;
    });
  }, [enrichedCredentials, search, filterType, filterStatus, filterState]);

  const uniqueStates = useMemo(() => {
    const states = new Set(credentials.map(c => c.jurisdiction).filter(Boolean));
    return Array.from(states).sort();
  }, [credentials]);

  const handleEdit = (cred: Credential) => {
    setEditingCredential(cred);
    setDialogOpen(true);
  };

  const handleDuplicate = (cred: Credential) => {
    setEditingCredential({ ...cred, id: '', custom_title: `${cred.custom_title} (Copy)` } as Credential);
    setDialogOpen(true);
  };

  const handleMarkRenewed = async (cred: Credential) => {
    const newExpDate = new Date();
    if (cred.renewal_frequency === 'annually') newExpDate.setFullYear(newExpDate.getFullYear() + 1);
    else if (cred.renewal_frequency === 'biannually') newExpDate.setFullYear(newExpDate.getFullYear() + 2);
    else if (cred.renewal_frequency === 'quarterly') newExpDate.setMonth(newExpDate.getMonth() + 3);
    else newExpDate.setFullYear(newExpDate.getFullYear() + 1);

    await updateCredential.mutateAsync({
      id: cred.id,
      expiration_date: newExpDate.toISOString().split('T')[0],
      status: 'active',
    });
  };

  const handleAddCE = (credId: string) => {
    setCePreLinkedId(credId);
    setCeDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading credentials…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search credentials…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(CREDENTIAL_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="renewing">Renewing</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        {uniqueStates.length > 0 && (
          <Select value={filterState} onValueChange={setFilterState}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="All States" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {uniqueStates.map(s => <SelectItem key={s!} value={s!}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="flex border rounded-md">
          <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode('table')}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'card' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode('card')}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => { setEditingCredential(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Credential
        </Button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-4">
              {credentials.length === 0 ? 'No credentials yet. Add your first credential to get started.' : 'No credentials match your filters.'}
            </p>
            {credentials.length === 0 && (
              <Button onClick={() => { setEditingCredential(null); setDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Add Credential
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table View */}
      {filtered.length > 0 && viewMode === 'table' && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Credential</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead>CE Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(cred => {
                const { completedHours, linkedCount, missingCerts } = cred.ceStats;
                const requiredHours = (cred as any).ce_required_hours as number | null;
                const progressPct = requiredHours && requiredHours > 0 ? Math.min(100, Math.round((completedHours / requiredHours) * 100)) : null;

                return (
                  <TableRow key={cred.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEdit(cred)}>
                    <TableCell className="font-medium">{cred.custom_title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{CREDENTIAL_TYPE_LABELS[cred.credential_type]}</TableCell>
                    <TableCell>{cred.jurisdiction || '—'}</TableCell>
                    <TableCell>
                      {cred.expiration_date ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{format(new Date(cred.expiration_date), 'MMM d, yyyy')}</span>
                          <CredentialExpirationChip expirationDate={cred.expiration_date} />
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {linkedCount > 0 ? (
                        <div className="space-y-1 min-w-[120px]">
                          {progressPct !== null ? (
                            <>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{completedHours} / {requiredHours} hrs</span>
                                <span>{progressPct}%</span>
                              </div>
                              <Progress value={progressPct} className="h-1.5" />
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">{completedHours} hrs logged</span>
                          )}
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span>{linkedCount} CE linked</span>
                            {missingCerts > 0 && (
                              <span className="text-amber-600 dark:text-amber-400">{missingCerts} cert missing</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell><CredentialStatusBadge status={cred.computedStatus} /></TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(cred)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAddCE(cred.id)}>
                            <GraduationCap className="mr-2 h-4 w-4" /> Add CE Entry
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(cred)}>
                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMarkRenewed(cred)}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Mark Renewed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateCredential.mutateAsync({ id: cred.id, status: 'archived' })}>
                            <Archive className="mr-2 h-4 w-4" /> Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteCredential.mutateAsync(cred.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Card View */}
      {filtered.length > 0 && viewMode === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(cred => {
            const { completedHours, linkedCount, missingCerts } = cred.ceStats;
            const requiredHours = (cred as any).ce_required_hours as number | null;
            const progressPct = requiredHours && requiredHours > 0 ? Math.min(100, Math.round((completedHours / requiredHours) * 100)) : null;

            return (
              <Card key={cred.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEdit(cred)}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{cred.custom_title}</h3>
                      <p className="text-sm text-muted-foreground">{CREDENTIAL_TYPE_LABELS[cred.credential_type]}</p>
                    </div>
                    <CredentialStatusBadge status={cred.computedStatus} />
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {cred.jurisdiction && <Badge variant="secondary">{cred.jurisdiction}</Badge>}
                    {cred.credential_number && <span className="text-muted-foreground font-mono">#{cred.credential_number}</span>}
                  </div>
                  {cred.expiration_date && (
                    <div className="flex items-center justify-between pt-1 border-t">
                      <span className="text-sm text-muted-foreground">
                        Exp: {format(new Date(cred.expiration_date), 'MMM d, yyyy')}
                      </span>
                      <CredentialExpirationChip expirationDate={cred.expiration_date} />
                    </div>
                  )}

                  {/* CE Progress */}
                  {linkedCount > 0 && (
                    <div className="pt-2 border-t space-y-2">
                      {progressPct !== null ? (
                        <>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{completedHours} of {requiredHours} hours logged</span>
                            <span>{progressPct}%</span>
                          </div>
                          <Progress value={progressPct} className="h-1.5" />
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">{completedHours} hours logged</p>
                      )}
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> {linkedCount} CE entries</span>
                        {missingCerts > 0 && (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><AlertCircle className="h-3 w-3" /> {missingCerts} cert missing</span>
                        )}
                      </div>
                      {cred.daysLeft !== null && cred.daysLeft > 0 && cred.daysLeft <= 90 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Renewal due in {cred.daysLeft} days
                        </p>
                      )}
                    </div>
                  )}

                  {/* Add CE button */}
                  <div className="pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={e => { e.stopPropagation(); handleAddCE(cred.id); }}
                    >
                      <GraduationCap className="h-3 w-3" /> Add CE Entry
                    </Button>
                  </div>

                  {cred.tags && cred.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {cred.tags.map(t => (
                        <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddCredentialDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingCredential={editingCredential}
      />

      <AddCEEntryDialog
        open={ceDialogOpen}
        onOpenChange={setCeDialogOpen}
        preLinkedCredentialId={cePreLinkedId}
      />
    </div>
  );
}
