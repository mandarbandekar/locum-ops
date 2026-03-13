import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Plus, ExternalLink, RefreshCw, Eye, Pencil, Archive } from 'lucide-react';
import { useSubscriptions, Subscription, SUBSCRIPTION_CATEGORIES, BILLING_FREQUENCIES } from '@/hooks/useSubscriptions';
import { AddSubscriptionDialog } from './AddSubscriptionDialog';
import { format } from 'date-fns';

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0' },
    due_soon: { label: 'Due Soon', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0' },
    expired: { label: 'Expired', className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-0' },
    canceled: { label: 'Canceled', className: 'bg-muted text-muted-foreground border-0' },
  };
  const s = map[status] || { label: status, className: '' };
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

function categoryLabel(val: string) {
  return SUBSCRIPTION_CATEGORIES.find(c => c.value === val)?.label || val;
}

function frequencyLabel(val: string) {
  return BILLING_FREQUENCIES.find(f => f.value === val)?.label || val;
}

export default function SubscriptionsTab() {
  const { activeSubscriptions, activeCounts, loading, addSubscription, updateSubscription, archiveSubscription } = useSubscriptions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [viewSub, setViewSub] = useState<Subscription | null>(null);

  const handleEdit = (sub: Subscription) => {
    setEditSub(sub);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditSub(null);
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading subscriptions…</div>;
  }

  // Empty state
  if (activeSubscriptions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-3 rounded-full bg-muted mb-4">
            <RefreshCw className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No subscriptions added yet.</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-1">
            Track the tools, memberships, and professional subscriptions you rely on for work so you don't miss a renewal.
          </p>
          <Button className="mt-4" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Subscription
          </Button>
        </div>
        <AddSubscriptionDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={addSubscription} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active', count: activeCounts.active, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Due Soon', count: activeCounts.dueSoon, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Expired', count: activeCounts.expired, color: 'text-red-600 dark:text-red-400' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
              <span className={`text-2xl font-bold ${item.color}`}>{item.count}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Subscription
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Renewal Date</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeSubscriptions.map(sub => (
              <TableRow key={sub.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {sub.name}
                    {sub.auto_renew && (
                      <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                        <RefreshCw className="h-3 w-3 mr-1" />Auto
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{sub.provider}</TableCell>
                <TableCell>{categoryLabel(sub.category)}</TableCell>
                <TableCell>{sub.renewal_date ? format(new Date(sub.renewal_date + 'T00:00:00'), 'MMM d, yyyy') : '—'}</TableCell>
                <TableCell>{frequencyLabel(sub.billing_frequency)}</TableCell>
                <TableCell>{sub.cost != null ? `$${sub.cost.toFixed(2)}` : '—'}</TableCell>
                <TableCell>{statusBadge(sub.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {sub.website_url && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={sub.website_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewSub(sub)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(sub)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => archiveSubscription(sub.id)}>
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* View detail dialog */}
      {viewSub && (
        <ViewSubscriptionDialog sub={viewSub} open={!!viewSub} onOpenChange={o => !o && setViewSub(null)} />
      )}

      <AddSubscriptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={addSubscription}
        onUpdate={updateSubscription}
        editSubscription={editSub}
      />
    </div>
  );
}

// Simple view dialog
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function ViewSubscriptionDialog({ sub, open, onOpenChange }: { sub: Subscription; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{sub.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          <Row label="Provider" value={sub.provider} />
          <Row label="Category" value={categoryLabel(sub.category)} />
          <Row label="Renewal Date" value={sub.renewal_date ? format(new Date(sub.renewal_date + 'T00:00:00'), 'MMM d, yyyy') : '—'} />
          <Row label="Billing" value={frequencyLabel(sub.billing_frequency)} />
          <Row label="Cost" value={sub.cost != null ? `$${sub.cost.toFixed(2)} ${sub.currency || ''}` : '—'} />
          <Row label="Status" value={sub.status} />
          <Row label="Auto-Renew" value={sub.auto_renew ? 'Yes' : 'No'} />
          {sub.used_for && <Row label="Used For" value={sub.used_for} />}
          {sub.website_url && <Row label="Website" value={<a href={sub.website_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{sub.website_url}</a>} />}
          {sub.notes && <Row label="Notes" value={sub.notes} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
