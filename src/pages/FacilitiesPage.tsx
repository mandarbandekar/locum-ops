import { useState, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Trash2, MapPin, Loader2, AlertTriangle, LayoutGrid, List, Mail, Phone, CalendarClock, User } from 'lucide-react';
import { AddFacilityDialog } from '@/components/AddFacilityDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAddressSearch } from '@/hooks/useAddressSearch';
import type { Facility } from '@/types';

export default function FacilitiesPage() {
  const { facilities, addFacility, deleteFacility } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const searchRef = useRef<HTMLDivElement>(null);
  const { results: addressResults, isLoading: isSearching } = useAddressSearch(search, showSuggestions);

  const handleSelectAddress = (displayName: string) => {
    setSearch(displayName);
    setShowSuggestions(false);
  };

  const handleAddFromSearch = async (displayName: string) => {
    const parts = displayName.split(',');
    const name = parts[0]?.trim() || displayName;
    try {
      const initials = name.split(/\s+/).map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 4) || 'INV';
      const facility = await addFacility({
        name,
        address: displayName,
        status: 'prospect',
        timezone: 'America/Los_Angeles',
        notes: '',
        outreach_last_sent_at: null,
        tech_computer_info: '',
        tech_wifi_info: '',
        tech_pims_info: '',
        clinic_access_info: '',
        invoice_prefix: initials,
        invoice_due_days: 15,
        invoice_name_to: '',
        invoice_email_to: '',
        invoice_name_cc: '',
        invoice_email_cc: '',
        invoice_name_bcc: '',
        invoice_email_bcc: '',
        billing_cadence: 'monthly',
        billing_cycle_anchor_date: null,
        billing_week_end_day: 'saturday',
        auto_generate_invoices: true,
      });
      toast.success(`"${name}" added as a new practice facility`);
      setSearch('');
      setShowSuggestions(false);
      navigate(`/facilities/${facility.id}`);
    } catch { /* error toast handled in DataContext */ }
  };

  const filtered = facilities.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.address.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const cadenceLabel = (c: Facility) => {
    const labels: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly' };
    return labels[c.billing_cadence] || 'Monthly';
  };

  const hasBillingContact = (c: Facility) => !!(c.invoice_name_to?.trim() && c.invoice_email_to?.trim());

  return (
    <div>
      <div className="page-header flex-col sm:flex-row gap-3">
        <h1 className="page-title">Practice Facilities</h1>
        <Button size="sm" onClick={() => setShowAdd(true)} className="w-full sm:w-auto">
          <Plus className="mr-1 h-4 w-4" /> Add Practice Facility
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 sm:max-w-sm" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search practice facilities or find address..."
            value={search}
            onChange={e => { setSearch(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="pl-9 pr-9"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          )}
          {showSuggestions && addressResults.length > 0 && (
            <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-lg overflow-hidden">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b bg-muted/50">
                Address results (OpenStreetMap)
              </div>
              {addressResults.map((r) => (
                <button
                  key={r.place_id}
                  className="w-full flex items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleAddFromSearch(r.display_name)}
                >
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.display_name.split(',')[0]}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.display_name}</p>
                  </div>
                  <span className="ml-auto shrink-0 text-xs text-primary whitespace-nowrap">+ Add</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center border rounded-lg overflow-hidden bg-muted p-0.5 gap-0.5 ml-auto">
          <Button
            size="sm"
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            className="h-8 px-2.5 rounded-md"
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            className="h-8 px-2.5 rounded-md"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <Card
              key={c.id}
              className="cursor-pointer hover:shadow-md transition-shadow group relative"
              onClick={() => navigate(`/facilities/${c.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{c.name}</h3>
                    {c.address && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {c.address}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                    <span>Billing:</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize font-medium">
                      {cadenceLabel(c)}
                    </Badge>
                    {c.auto_generate_invoices && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Auto</Badge>
                    )}
                  </div>

                  {hasBillingContact(c) ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{c.invoice_name_to}</span>
                      <span className="text-muted-foreground/60">·</span>
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate text-muted-foreground/80">{c.invoice_email_to}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>No billing contact set</span>
                    </div>
                  )}
                </div>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                        <AlertDialogDescription>This will also delete all contacts, shifts, and invoices associated with this facility.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { deleteFacility(c.id); toast.success('Facility deleted'); }}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full p-6 text-center text-muted-foreground">No practice facilities found</div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full text-sm min-w-[500px] sm:min-w-0">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Address</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Billing</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.id}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/facilities/${c.id}`)}
                >
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{c.address}</td>
                  <td className="p-3"><StatusBadge status={c.status} /></td>
                  <td className="p-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{c.billing_cadence || 'monthly'}</Badge>
                      {c.auto_generate_invoices && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Auto</Badge>}
                      {!hasBillingContact(c) && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                          <AlertDialogDescription>This will also delete all contacts, shifts, and invoices associated with this facility.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => { deleteFacility(c.id); toast.success('Facility deleted'); }}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No practice facilities found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <AddFacilityDialog open={showAdd} onOpenChange={setShowAdd} />
    </div>
  );
}
