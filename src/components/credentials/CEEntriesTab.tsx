import { useState, useMemo } from 'react';
import { useCEEntries, CEEntryWithLinks } from '@/hooks/useCEEntries';
import { useCredentials } from '@/hooks/useCredentials';
import { AddCEEntryDialog } from '@/components/credentials/AddCEEntryDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, GraduationCap, AlertCircle, FileCheck, Link2, CalendarDays, Monitor } from 'lucide-react';
import { CE_DELIVERY_FORMAT_LABELS } from '@/lib/credentialTypes';
import { format } from 'date-fns';

type FilterChip = 'all' | 'missing_cert' | 'linked' | 'this_year';

export default function CEEntriesTab() {
  const { entries, isLoading, deleteCEEntry } = useCEEntries();
  const { credentials } = useCredentials();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CEEntryWithLinks | null>(null);
  const [search, setSearch] = useState('');
  const [filterChip, setFilterChip] = useState<FilterChip>('all');

  const filtered = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return entries.filter(e => {
      if (search) {
        const q = search.toLowerCase();
        if (!e.title.toLowerCase().includes(q) && !e.provider.toLowerCase().includes(q)) return false;
      }
      if (filterChip === 'missing_cert' && e.certificate_file_url) return false;
      if (filterChip === 'linked' && e.linked_credential_ids.length === 0) return false;
      if (filterChip === 'this_year' && new Date(e.completion_date).getFullYear() !== currentYear) return false;
      return true;
    });
  }, [entries, search, filterChip]);

  const credentialMap = useMemo(() => {
    const map: Record<string, string> = {};
    credentials.forEach(c => { map[c.id] = c.custom_title; });
    return map;
  }, [credentials]);

  const handleEdit = (entry: CEEntryWithLinks) => {
    setEditingEntry(entry);
    setDialogOpen(true);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Loading CE entries…</p></div>;
  }

  const chips: { key: FilterChip; label: string; icon: React.ElementType }[] = [
    { key: 'all', label: 'All', icon: GraduationCap },
    { key: 'missing_cert', label: 'Missing Certificate', icon: AlertCircle },
    { key: 'linked', label: 'Linked to Credential', icon: Link2 },
    { key: 'this_year', label: 'This Year', icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p>
            LocumOps helps you organize CE records and track progress based on the information you enter.
            Requirements vary by board, state, profession, and credentialing body.
            Always verify renewal rules, accepted course types, and documentation requirements with your licensing board or credentialing authority.
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search CE entries…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {chips.map(chip => (
            <Button
              key={chip.key}
              variant={filterChip === chip.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterChip(chip.key)}
              className="gap-1.5"
            >
              <chip.icon className="h-3.5 w-3.5" />
              {chip.label}
            </Button>
          ))}
        </div>
        <Button onClick={() => { setEditingEntry(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add CE Entry
        </Button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {entries.length === 0 ? 'No CE entries yet.' : 'No entries match your filters.'}
            </h3>
            {entries.length === 0 && (
              <>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Log courses, upload certificates, and link them to your credentials in one place.
                </p>
                <Button onClick={() => { setEditingEntry(null); setDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> Add CE Entry
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Linked Credentials</TableHead>
                <TableHead>Certificate</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(entry => (
                <TableRow key={entry.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEdit(entry)}>
                  <TableCell className="font-medium">{entry.title}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.provider || '—'}</TableCell>
                  <TableCell>{format(new Date(entry.completion_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right font-mono">{entry.hours}</TableCell>
                  <TableCell>{entry.category ? <Badge variant="secondary">{entry.category}</Badge> : '—'}</TableCell>
                  <TableCell>
                    {entry.linked_credential_ids.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {entry.linked_credential_ids.map(id => (
                          <Badge key={id} variant="outline" className="text-xs truncate max-w-[140px]">
                            {credentialMap[id] || 'Unknown'}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {entry.certificate_file_url ? (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
                        <FileCheck className="h-3 w-3" /> Uploaded
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 gap-1">
                        <AlertCircle className="h-3 w-3" /> Missing
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(entry)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteCEEntry.mutateAsync(entry.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <AddCEEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingEntry={editingEntry}
      />
    </div>
  );
}
