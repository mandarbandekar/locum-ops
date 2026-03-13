import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Subscription,
  SubscriptionInsert,
  SUBSCRIPTION_CATEGORIES,
  BILLING_FREQUENCIES,
  SUBSCRIPTION_STATUSES,
  USED_FOR_OPTIONS,
} from '@/hooks/useSubscriptions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (sub: SubscriptionInsert) => void;
  onUpdate?: (id: string, sub: Partial<SubscriptionInsert>) => void;
  editSubscription?: Subscription | null;
}

const defaultForm: SubscriptionInsert = {
  name: '',
  provider: '',
  category: 'other',
  renewal_date: null,
  billing_frequency: 'annual',
  cost: null,
  currency: 'USD',
  status: 'active',
  website_url: null,
  notes: '',
  auto_renew: false,
  used_for: null,
  archived_at: null,
};

export function AddSubscriptionDialog({ open, onOpenChange, onSave, onUpdate, editSubscription }: Props) {
  const [form, setForm] = useState<SubscriptionInsert>(defaultForm);
  const isEdit = !!editSubscription;

  useEffect(() => {
    if (editSubscription) {
      setForm({
        name: editSubscription.name,
        provider: editSubscription.provider,
        category: editSubscription.category,
        renewal_date: editSubscription.renewal_date,
        billing_frequency: editSubscription.billing_frequency,
        cost: editSubscription.cost,
        currency: editSubscription.currency,
        status: editSubscription.status,
        website_url: editSubscription.website_url,
        notes: editSubscription.notes,
        auto_renew: editSubscription.auto_renew,
        used_for: editSubscription.used_for,
        archived_at: editSubscription.archived_at,
      });
    } else {
      setForm(defaultForm);
    }
  }, [editSubscription, open]);

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (isEdit && onUpdate && editSubscription) {
      onUpdate(editSubscription.id, form);
    } else {
      onSave(form);
    }
    onOpenChange(false);
  };

  const renewalDate = form.renewal_date ? new Date(form.renewal_date + 'T00:00:00') : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Subscription' : 'Add Subscription'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Subscription Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. VIN, Plumb's" />
          </div>

          {/* Provider */}
          <div className="space-y-1.5">
            <Label>Provider / Company *</Label>
            <Input value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} placeholder="e.g. Veterinary Information Network" />
          </div>

          {/* Category & Billing */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Billing Frequency</Label>
              <Select value={form.billing_frequency} onValueChange={v => setForm(f => ({ ...f, billing_frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BILLING_FREQUENCIES.map(b => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Renewal Date */}
          <div className="space-y-1.5">
            <Label>Renewal Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !renewalDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {renewalDate ? format(renewalDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={renewalDate}
                  onSelect={d => setForm(f => ({ ...f, renewal_date: d ? format(d, 'yyyy-MM-dd') : null }))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cost & Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cost</Label>
              <Input
                type="number"
                step="0.01"
                value={form.cost ?? ''}
                onChange={e => setForm(f => ({ ...f, cost: e.target.value ? Number(e.target.value) : null }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input value={form.currency ?? 'USD'} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} placeholder="USD" />
            </div>
          </div>

          {/* Website URL */}
          <div className="space-y-1.5">
            <Label>Website / Login URL</Label>
            <Input value={form.website_url ?? ''} onChange={e => setForm(f => ({ ...f, website_url: e.target.value || null }))} placeholder="https://..." />
          </div>

          {/* Used for */}
          <div className="space-y-1.5">
            <Label>Used For</Label>
            <Select value={form.used_for ?? ''} onValueChange={v => setForm(f => ({ ...f, used_for: v || null }))}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {USED_FOR_OPTIONS.map(u => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-renew */}
          <div className="flex items-center justify-between">
            <Label>Auto-Renew</Label>
            <Switch checked={form.auto_renew ?? false} onCheckedChange={v => setForm(f => ({ ...f, auto_renew: v }))} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name.trim()}>{isEdit ? 'Save Changes' : 'Add Subscription'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
