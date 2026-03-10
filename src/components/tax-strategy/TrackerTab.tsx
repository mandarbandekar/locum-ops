import { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DollarSign, CalendarDays, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import {
  aggregateQuarterlyIncome,
  calculateSetAside,
  getDefaultDueDates,
} from '@/lib/taxCalculations';

const db = (table: string) => supabase.from(table as any);

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not started' },
  { value: 'discussed', label: 'Reviewed with CPA' },
  { value: 'scheduled', label: 'Payment scheduled' },
  { value: 'paid', label: 'Paid' },
];

const DEFAULT_CHECKLIST_ITEMS = [
  { key: 'entity_setup', label: 'Entity setup reviewed' },
  { key: 'estimated_taxes', label: 'Estimated taxes reviewed this quarter' },
  { key: 'cpa_consulted', label: 'CPA consulted this year' },
  { key: 'payroll_reviewed', label: 'Payroll reviewed (if S-corp)' },
  { key: 'reasonable_comp', label: 'Reasonable compensation discussed (if S-corp)' },
  { key: 'accountable_plan', label: 'Accountable plan discussed (if S-corp)' },
  { key: 'deductions_reviewed', label: 'Deduction categories reviewed' },
  { key: 'receipts_organized', label: 'Receipts / docs organized' },
  { key: 'mileage_tracking', label: 'Multi-clinic mileage tracking reviewed' },
  { key: 'ce_licensing', label: 'CE / licensing costs organized' },
  { key: 'travel_docs', label: 'Travel / lodging documentation reviewed' },
  { key: 'cpa_packet', label: 'Year-end CPA packet ready' },
];

interface TaxSettings {
  id?: string;
  set_aside_mode: 'percent' | 'fixed';
  set_aside_percent: number;
  set_aside_fixed_monthly: number;
}

interface QuarterStatus {
  id?: string;
  quarter: number;
  tax_year: number;
  due_date: string;
  status: string;
  notes: string;
}

interface ChecklistItem {
  id?: string;
  item_key: string;
  label: string;
  completed: boolean;
  completed_at: string | null;
}

export default function TrackerTab() {
  const { invoices } = useData();
  const { user, isDemo } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(!isDemo);

  const [settings, setSettings] = useState<TaxSettings>({
    set_aside_mode: 'percent',
    set_aside_percent: 30,
    set_aside_fixed_monthly: 0,
  });
  const [settingsId, setSettingsId] = useState<string>();
  const [quarterStatuses, setQuarterStatuses] = useState<QuarterStatus[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    if (isDemo) {
      const defaults = getDefaultDueDates(selectedYear);
      setQuarterStatuses([1, 2, 3, 4].map(q => ({
        quarter: q, tax_year: selectedYear, due_date: defaults[q], status: 'not_started', notes: '',
      })));
      setChecklist(DEFAULT_CHECKLIST_ITEMS.map(item => ({
        item_key: item.key, label: item.label, completed: false, completed_at: null,
      })));
      setLoading(false);
      return;
    }
    if (!user) return;
    loadData();
  }, [selectedYear, user?.id, isDemo]);

  async function loadData() {
    setLoading(true);
    try {
      const [settingsRes, qsRes, clRes] = await Promise.all([
        db('tax_settings').select('*').eq('tax_year', selectedYear).maybeSingle(),
        db('tax_quarter_statuses').select('*').eq('tax_year', selectedYear).order('quarter'),
        db('tax_checklist_items').select('*').order('created_at'),
      ]);

      if ((settingsRes.data as any)) {
        const d = settingsRes.data as any;
        setSettingsId(d.id);
        setSettings({ set_aside_mode: d.set_aside_mode, set_aside_percent: Number(d.set_aside_percent), set_aside_fixed_monthly: Number(d.set_aside_fixed_monthly) });
      }

      if ((qsRes.data as any)?.length > 0) {
        setQuarterStatuses((qsRes.data as any[]).map((r: any) => ({
          id: r.id, quarter: r.quarter, tax_year: r.tax_year, due_date: r.due_date, status: r.status, notes: r.notes,
        })));
      } else {
        const defaults = getDefaultDueDates(selectedYear);
        setQuarterStatuses([1, 2, 3, 4].map(q => ({
          quarter: q, tax_year: selectedYear, due_date: defaults[q], status: 'not_started', notes: '',
        })));
      }

      if ((clRes.data as any)?.length > 0) {
        setChecklist((clRes.data as any[]).map((r: any) => ({
          id: r.id, item_key: r.item_key, label: r.label, completed: r.completed, completed_at: r.completed_at,
        })));
      } else {
        setChecklist(DEFAULT_CHECKLIST_ITEMS.map(item => ({
          item_key: item.key, label: item.label, completed: false, completed_at: null,
        })));
      }
    } catch (err) {
      console.error('Failed to load tracker data', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (isDemo) { toast.success('Settings saved (demo)'); return; }
    if (!user) return;
    const payload = { set_aside_mode: settings.set_aside_mode, set_aside_percent: settings.set_aside_percent, set_aside_fixed_monthly: settings.set_aside_fixed_monthly };
    if (settingsId) {
      await db('tax_settings').update(payload).eq('id', settingsId);
    } else {
      const { data } = await db('tax_settings').insert({ user_id: user.id, tax_year: selectedYear, ...payload } as any).select().single() as { data: any };
      if (data) setSettingsId(data.id);
    }
    toast.success('Settings saved');
  }

  async function saveQuarterStatus(qs: QuarterStatus) {
    if (isDemo) { toast.success(`Q${qs.quarter} saved (demo)`); return; }
    if (!user) return;
    if (qs.id) {
      await db('tax_quarter_statuses').update({ due_date: qs.due_date, status: qs.status, notes: qs.notes }).eq('id', qs.id);
    } else {
      const { data } = await db('tax_quarter_statuses').insert({ user_id: user.id, tax_year: selectedYear, quarter: qs.quarter, due_date: qs.due_date, status: qs.status, notes: qs.notes } as any).select().single() as { data: any };
      if (data) setQuarterStatuses(prev => prev.map(q => q.quarter === qs.quarter ? { ...q, id: data.id } : q));
    }
    toast.success(`Q${qs.quarter} saved`);
  }

  async function toggleChecklist(idx: number) {
    const item = checklist[idx];
    const now = new Date().toISOString();
    const updated = { ...item, completed: !item.completed, completed_at: !item.completed ? now : null };
    setChecklist(prev => prev.map((c, i) => i === idx ? updated : c));

    if (isDemo || !user) return;
    if (updated.id) {
      await db('tax_checklist_items').update({ completed: updated.completed, completed_at: updated.completed_at }).eq('id', updated.id);
    } else {
      const { data } = await db('tax_checklist_items').insert({ user_id: user.id, item_key: updated.item_key, label: updated.label, completed: updated.completed, completed_at: updated.completed_at } as any).select().single() as { data: any };
      if (data) setChecklist(prev => prev.map((c, i) => i === idx ? { ...c, id: data.id } : c));
    }
  }

  const quarterlyIncome = useMemo(() => aggregateQuarterlyIncome(invoices, selectedYear), [invoices, selectedYear]);
  const setAsideData = useMemo(() => calculateSetAside(quarterlyIncome, settings.set_aside_mode, settings.set_aside_percent, settings.set_aside_fixed_monthly), [quarterlyIncome, settings]);
  const totalIncome = quarterlyIncome.reduce((s, q) => s + q.income, 0);
  const totalSetAside = setAsideData.reduce((s, q) => s + q.amount, 0);

  const completedCount = checklist.filter(c => c.completed).length;
  const readinessPercent = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;
  const nextTask = checklist.find(c => !c.completed);

  const nextDue = useMemo(() => {
    const now = new Date();
    const upcoming = quarterStatuses
      .filter(q => new Date(q.due_date) >= now && q.status !== 'paid')
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    return upcoming[0] || null;
  }, [quarterStatuses]);

  if (loading) return <p className="text-muted-foreground py-8 text-center">Loading…</p>;

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Paid Income YTD</p>
            <p className="text-xl font-bold">${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Est. Reserve</p>
            <p className="text-xl font-bold">${totalSetAside.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground">User-set planning number</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Reserve Preference</p>
            <p className="text-xl font-bold">
              {settings.set_aside_mode === 'percent' ? `${settings.set_aside_percent}%` : `$${settings.set_aside_fixed_monthly}/mo`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Next Due</p>
            <p className="text-xl font-bold">{nextDue ? `Q${nextDue.quarter}` : '—'}</p>
            {nextDue && <p className="text-xs text-muted-foreground">{new Date(nextDue.due_date).toLocaleDateString()}</p>}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">Use this as a planning tracker for your relief / locum income. Confirm actual amounts and due dates with your CPA.</p>

      {/* Set-Aside Preference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Reserve Preference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={settings.set_aside_mode} onValueChange={v => setSettings(s => ({ ...s, set_aside_mode: v as any }))} className="flex gap-4">
            <div className="flex items-center gap-1.5"><RadioGroupItem value="percent" id="t-pct" /><Label htmlFor="t-pct" className="text-sm">% of paid income</Label></div>
            <div className="flex items-center gap-1.5"><RadioGroupItem value="fixed" id="t-fix" /><Label htmlFor="t-fix" className="text-sm">Fixed $/month</Label></div>
          </RadioGroup>
          <div className="flex gap-4">
            {settings.set_aside_mode === 'percent' ? (
              <div className="w-40"><Label>Percent (%)</Label><Input type="number" min={0} max={100} value={settings.set_aside_percent} onChange={e => setSettings(s => ({ ...s, set_aside_percent: Number(e.target.value) }))} /></div>
            ) : (
              <div className="w-40"><Label>Monthly ($)</Label><Input type="number" min={0} value={settings.set_aside_fixed_monthly} onChange={e => setSettings(s => ({ ...s, set_aside_fixed_monthly: Number(e.target.value) }))} /></div>
            )}
          </div>
          <Button size="sm" onClick={saveSettings}>Save</Button>
        </CardContent>
      </Card>

      {/* Quarterly Statuses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Quarterly Planning</CardTitle>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>{[currentYear - 1, currentYear, currentYear + 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {quarterStatuses.map(qs => {
            const qi = quarterlyIncome.find(q => q.quarter === qs.quarter);
            const sa = setAsideData.find(q => q.quarter === qs.quarter);
            return (
              <Card key={qs.quarter} className="border">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Q{qs.quarter} — Due {new Date(qs.due_date).toLocaleDateString()}</p>
                    <Badge variant={qs.status === 'paid' ? 'default' : 'secondary'}>
                      {STATUS_OPTIONS.find(o => o.value === qs.status)?.label || qs.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p className="text-muted-foreground">Income: <span className="font-medium text-foreground">${(qi?.income || 0).toLocaleString()}</span></p>
                    <p className="text-muted-foreground">Reserve: <span className="font-medium text-foreground">${(sa?.amount || 0).toLocaleString()}</span></p>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select value={qs.status} onValueChange={v => setQuarterStatuses(prev => prev.map(q => q.quarter === qs.quarter ? { ...q, status: v } : q))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => saveQuarterStatus(qs)}>Save</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* Tax Readiness Checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Tax Readiness Checklist</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{completedCount} of {checklist.length} complete</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{readinessPercent}%</p>
              <p className="text-xs text-muted-foreground">Readiness score</p>
            </div>
          </div>
          <Progress value={readinessPercent} className="mt-2" />
        </CardHeader>
        <CardContent className="space-y-2">
          {nextTask && (
            <div className="rounded-md bg-primary/5 border border-primary/20 p-3 mb-3">
              <p className="text-xs text-muted-foreground">Next recommended:</p>
              <p className="text-sm font-medium">{nextTask.label}</p>
            </div>
          )}
          {checklist.map((item, i) => (
            <div key={item.item_key} className="flex items-center gap-3 py-1.5">
              <Checkbox checked={item.completed} onCheckedChange={() => toggleChecklist(i)} id={`cl-${item.item_key}`} />
              <Label htmlFor={`cl-${item.item_key}`} className={`text-sm cursor-pointer ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                {item.label}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export { DEFAULT_CHECKLIST_ITEMS };
