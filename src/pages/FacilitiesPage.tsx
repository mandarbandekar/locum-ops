import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, MapPin, AlertTriangle, LayoutGrid, List, Mail, CalendarClock, User, Building2 } from 'lucide-react';
import { AddFacilityDialog } from '@/components/AddFacilityDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { getEngagementPill } from '@/lib/engagementOptions';
import { cn } from '@/lib/utils';
import type { Facility } from '@/types';

export default function FacilitiesPage() {
  const { facilities, deleteFacility } = useData();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  const cadenceLabel = (c: Facility) => {
    const labels: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly' };
    return labels[c.billing_cadence] || 'Monthly';
  };

  const hasBillingContact = (c: Facility) =>
    !!(c.invoice_name_to?.trim() && c.invoice_email_to?.trim());

  const summary = useMemo(() => {
    const total = facilities.length;
    const active = facilities.filter(f => f.status === 'active').length;
    const directBill = facilities.filter(f => (f.engagement_type || 'direct') === 'direct').length;
    const missingBilling = facilities.filter(
      f => (f.engagement_type || 'direct') === 'direct' && !hasBillingContact(f)
    ).length;
    return { total, active, directBill, missingBilling };
  }, [facilities]);

  const isEmpty = facilities.length === 0;

  return (
    <div>
      <div className="page-header flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div>
          <h1 className="page-title">Practice Facilities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your network of clinics, billing contacts, and engagement terms.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="w-full sm:w-auto sm:ml-auto">
          <Plus className="mr-1 h-4 w-4" /> Add Practice Facility
        </Button>
      </div>

      {!isEmpty && (
        <div className="flex justify-end mb-4">
          <div className="flex items-center border rounded-lg overflow-hidden bg-muted p-0.5 gap-0.5">
            <Button
              size="sm"
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              className="h-8 px-2.5 rounded-md"
              onClick={() => setViewMode('cards')}
              aria-label="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              className="h-8 px-2.5 rounded-md"
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {isEmpty ? (
        <div className="rounded-lg border bg-card p-12 flex flex-col items-center text-center">
          <div className="rounded-full bg-muted p-3 mb-3">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-base">No practice facilities yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Add the clinics where you work to track shifts, billing contacts, and engagement terms in one place.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add your first clinic
          </Button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map(c => (
            <Card
              key={c.id}
              className="cursor-pointer transition-colors hover:border-primary/40 group relative"
              onClick={() => navigate(`/facilities/${c.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm truncate pr-7">{c.name}</h3>
                    {c.address && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{c.address}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mt-3">
                  <StatusBadge status={c.status} />
                  {(() => {
                    const pill = getEngagementPill(c);
                    return (
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium max-w-[160px] truncate', pill.className)}>
                        {pill.label}
                      </span>
                    );
                  })()}
                  {(c.engagement_type || 'direct') === 'direct' && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize font-medium">
                      {cadenceLabel(c)}
                    </Badge>
                  )}
                </div>

                <div className="border-t border-border mt-3 pt-3 text-xs">
                  {(c.engagement_type || 'direct') !== 'direct' ? (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {c.engagement_type === 'w2'
                          ? 'Paid by employer — no invoicing'
                          : 'Paid by platform — no invoicing'}
                      </span>
                    </div>
                  ) : hasBillingContact(c) ? (
                    <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{c.invoice_name_to}</span>
                      <span className="text-muted-foreground/50 shrink-0">·</span>
                      <span className="truncate text-muted-foreground/80">{c.invoice_email_to}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>No billing contact set</span>
                    </div>
                  )}
                </div>

                <div
                  className="absolute top-2 right-2 opacity-40 group-hover:opacity-100 transition-opacity"
                  onClick={e => e.stopPropagation()}
                >
                  <DeleteFacilityButton name={c.name} onConfirm={() => { deleteFacility(c.id); toast.success('Facility deleted'); }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-[13px] min-w-[640px] table-fixed">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[26%] hidden md:table-column" />
              <col className="w-[18%]" />
              <col className="w-[16%] hidden lg:table-column" />
              <col className="w-[12%] hidden lg:table-column" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Name</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">Address</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">Engagement</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">Billing</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {facilities.map(c => {
                const pill = getEngagementPill(c);
                return (
                  <tr
                    key={c.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/facilities/${c.id}`)}
                  >
                    <td className="px-3 py-2.5 font-medium truncate">{c.name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground truncate hidden md:table-cell">{c.address || '—'}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium max-w-full truncate', pill.className)}>
                        {pill.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      {(c.engagement_type || 'direct') === 'direct' ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{cadenceLabel(c)}</Badge>
                          {!hasBillingContact(c) && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400" title="No billing contact">
                              <AlertTriangle className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                      <DeleteFacilityButton name={c.name} onConfirm={() => { deleteFacility(c.id); toast.success('Facility deleted'); }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddFacilityDialog open={showAdd} onOpenChange={setShowAdd} />
    </div>
  );
}

function SummaryStat({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'warning' }) {
  return (
    <div className="px-4 py-3">
      <div className={cn(
        'text-xl font-semibold tabular-nums',
        tone === 'warning' && value > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
      )}>
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function DeleteFacilityButton({ name, onConfirm }: { name: string; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will also delete all contacts, shifts, and invoices associated with this facility.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
