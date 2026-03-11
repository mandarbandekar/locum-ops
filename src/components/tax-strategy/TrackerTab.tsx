import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DollarSign, CalendarDays, CheckCircle2, AlertCircle, EyeOff, ChevronDown, ListChecks } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

const DEFAULT_CHECKLIST_ITEMS: { key: string; label: string; instruction: string; quarter: number }[] = [
  // Q1: Start-of-year setup & prior-year wrap-up
  { key: 'q1_entity_review', label: 'Entity type reviewed for the year', instruction: 'Confirm your business entity (sole prop, LLC, S-corp) is still the best fit. If income changed significantly, discuss with your CPA before filing.', quarter: 1 },
  { key: 'q1_prior_year_filing', label: 'Prior-year tax return filed or extended', instruction: 'File your prior-year return by Apr 15 or submit an extension. Gather all 1099s and year-end statements.', quarter: 1 },
  { key: 'q1_bookkeeping_setup', label: 'Bookkeeping & tracking set up for the year', instruction: 'Ensure your income tracking, mileage log, and expense categories are ready for the new tax year.', quarter: 1 },
  { key: 'q1_estimated_payment', label: 'Q1 estimated tax payment reviewed', instruction: 'Review projected income and calculate your Q1 estimated payment. Due Apr 15. Confirm the amount with your CPA.', quarter: 1 },

  // Q2: Mid-year check-in & Q2 payment
  { key: 'q2_income_review', label: 'YTD income reviewed at mid-year', instruction: 'Compare actual income to projections. Adjust future quarterly estimates if income is higher or lower than expected.', quarter: 2 },
  { key: 'q2_estimated_payment', label: 'Q2 estimated tax payment reviewed', instruction: 'Calculate and confirm your Q2 estimated payment. Due Jun 15. Adjust if income pace has changed.', quarter: 2 },
  { key: 'q2_deductions_midyear', label: 'Deduction categories checked mid-year', instruction: 'Review your Deductions tab — make sure YTD amounts are entered and receipts are organized through June.', quarter: 2 },
  { key: 'q2_mileage_tracking', label: 'Mileage log current through Q2', instruction: 'If you travel between clinics, verify your mileage log is up to date with dates, destinations, and business purpose.', quarter: 2 },

  // Q3: Year-end prep begins
  { key: 'q3_cpa_checkin', label: 'Mid-year CPA check-in completed', instruction: 'Schedule a check-in with your CPA to review YTD income, entity structure, and adjust estimates for the remainder of the year.', quarter: 3 },
  { key: 'q3_estimated_payment', label: 'Q3 estimated tax payment reviewed', instruction: 'Calculate and confirm your Q3 estimated payment. Due Sep 15. Factor in any income changes from summer assignments.', quarter: 3 },
  { key: 'q3_retirement', label: 'Retirement contributions reviewed', instruction: 'Review SEP-IRA, Solo 401(k), or other retirement plan contributions. Maximizing contributions can reduce taxable income.', quarter: 3 },
  { key: 'q3_reasonable_comp', label: 'Reasonable compensation reviewed (if S-corp)', instruction: 'S-corp owners must pay themselves a reasonable salary. Confirm the amount with your CPA based on your relief work volume.', quarter: 3 },

  // Q4: Year-end execution & CPA packet
  { key: 'q4_estimated_payment', label: 'Q4 estimated tax payment reviewed', instruction: 'Calculate and confirm your Q4 estimated payment. Due Jan 15 of next year. This is your last chance to adjust for the year.', quarter: 4 },
  { key: 'q4_deductions_final', label: 'Final deduction review & receipt sweep', instruction: 'Do a final pass on all deduction categories. Gather any missing receipts for CE, licensing, mileage, travel, and insurance.', quarter: 4 },
  { key: 'q4_ce_licensing', label: 'CE & licensing costs compiled', instruction: 'Compile all continuing education fees, license renewals, DEA registrations, and professional certifications for the year.', quarter: 4 },
  { key: 'q4_payroll_review', label: 'Payroll & accountable plan reviewed (if S-corp)', instruction: 'Confirm payroll is current and reasonable comp is met. If you have an accountable plan, submit all reimbursement requests before year-end.', quarter: 4 },
  { key: 'q4_cpa_packet', label: 'Year-end CPA packet prepared', instruction: 'Visit the CPA Packet tab to generate a summary of your income, deductions, and questions. Share with your CPA before year-end.', quarter: 4 },
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
  ignored?: boolean;
}

export default function TrackerTab() {
  const { invoices } = useData();
  const { user, isDemo } = useAuth();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
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
        item_key: item.key, label: item.label, completed: false, completed_at: null, ignored: false,
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
          id: r.id, item_key: r.item_key, label: r.label, completed: r.completed, completed_at: r.completed_at, ignored: false,
        })));
      } else {
        setChecklist(DEFAULT_CHECKLIST_ITEMS.map(item => ({
          item_key: item.key, label: item.label, completed: false, completed_at: null, ignored: false,
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
    const updated = { ...item, completed: !item.completed, completed_at: !item.completed ? now : null, ignored: false };
    setChecklist(prev => prev.map((c, i) => i === idx ? updated : c));

    if (isDemo || !user) return;
    if (updated.id) {
      await db('tax_checklist_items').update({ completed: updated.completed, completed_at: updated.completed_at }).eq('id', updated.id);
    } else {
      const { data } = await db('tax_checklist_items').insert({ user_id: user.id, item_key: updated.item_key, label: updated.label, completed: updated.completed, completed_at: updated.completed_at } as any).select().single() as { data: any };
      if (data) setChecklist(prev => prev.map((c, i) => i === idx ? { ...c, id: data.id } : c));
    }
  }

  function toggleIgnore(idx: number) {
    setChecklist(prev => prev.map((c, i) => i === idx ? { ...c, ignored: !c.ignored } : c));
    const item = checklist[idx];
    toast.success(item.ignored ? `"${item.label}" restored` : `"${item.label}" ignored`);
  }

  const quarterlyIncome = useMemo(() => aggregateQuarterlyIncome(invoices, selectedYear), [invoices, selectedYear]);
  const setAsideData = useMemo(() => calculateSetAside(quarterlyIncome, settings.set_aside_mode, settings.set_aside_percent, settings.set_aside_fixed_monthly), [quarterlyIncome, settings]);
  const totalIncome = quarterlyIncome.reduce((s, q) => s + q.income, 0);
  const totalSetAside = setAsideData.reduce((s, q) => s + q.amount, 0);

  const activeChecklist = checklist.filter(c => !c.ignored);
  const completedCount = activeChecklist.filter(c => c.completed).length;
  const readinessPercent = activeChecklist.length > 0 ? Math.round((completedCount / activeChecklist.length) * 100) : 0;
  const incompleteItems = checklist.filter(c => !c.completed && !c.ignored);

  const nextDue = useMemo(() => {
    const now = new Date();
    const upcoming = quarterStatuses
      .filter(q => new Date(q.due_date) >= now && q.status !== 'paid')
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    return upcoming[0] || null;
  }, [quarterStatuses]);

  // Get instruction text for a checklist item
  function getInstruction(itemKey: string): string {
    return DEFAULT_CHECKLIST_ITEMS.find(d => d.key === itemKey)?.instruction || '';
  }

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
            <p className="text-xs text-muted-foreground">Tax Readiness</p>
            <p className="text-xl font-bold">{readinessPercent}%</p>
            <p className="text-xs text-muted-foreground">{completedCount}/{activeChecklist.length} tasks</p>
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

      {/* Overall Readiness Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Tax Readiness Overview</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{completedCount} of {activeChecklist.length} tasks complete · {checklist.filter(c => c.ignored).length} ignored</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{readinessPercent}%</p>
              <p className="text-xs text-muted-foreground">Readiness</p>
            </div>
          </div>
          <Progress value={readinessPercent} className="mt-2" />
        </CardHeader>
      </Card>

      {/* Quarterly Statuses with Checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Quarterly Planning & Readiness</CardTitle>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>{[currentYear - 1, currentYear, currentYear + 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {quarterStatuses.map(qs => {
            const qi = quarterlyIncome.find(q => q.quarter === qs.quarter);
            const sa = setAsideData.find(q => q.quarter === qs.quarter);
            const isPast = new Date(qs.due_date) < new Date();
            const quarterCompletedCount = activeChecklist.filter(c => c.completed).length;
            const quarterProgress = activeChecklist.length > 0 ? Math.round((quarterCompletedCount / activeChecklist.length) * 100) : 0;
            const isCurrentQuarter = selectedYear === currentYear && qs.quarter === currentQuarter;

            const quarterHeader = (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {!isCurrentQuarter && <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=closed]_&]:rotate-[-90deg]" />}
                  <div>
                    <p className="font-medium text-base">Q{qs.quarter} — Due {new Date(qs.due_date).toLocaleDateString()}</p>
                    {isPast && qs.status !== 'paid' && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-0.5"><AlertCircle className="h-3 w-3" /> Past due</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isCurrentQuarter && <span className="text-xs text-muted-foreground">{quarterProgress}%</span>}
                  <Badge variant={qs.status === 'paid' ? 'default' : 'secondary'}>
                    {STATUS_OPTIONS.find(o => o.value === qs.status)?.label || qs.status}
                  </Badge>
                </div>
              </div>
            );

            const quarterBody = (
              <>
                {/* Income & Reserve */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-muted-foreground">Income: <span className="font-medium text-foreground">${(qi?.income || 0).toLocaleString()}</span></p>
                  <p className="text-muted-foreground">Reserve: <span className="font-medium text-foreground">${(sa?.amount || 0).toLocaleString()}</span></p>
                </div>

                {/* Status Selector */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select value={qs.status} onValueChange={v => setQuarterStatuses(prev => prev.map(q => q.quarter === qs.quarter ? { ...q, status: v } : q))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => saveQuarterStatus(qs)}>Save</Button>
                </div>

                {/* Readiness Progress Bar */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Readiness Checklist</p>
                    <span className="text-xs text-muted-foreground">{quarterProgress}%</span>
                  </div>
                  <Progress value={quarterProgress} className="h-2 mb-3" />

                  {/* Checklist Items */}
                  <div className="space-y-1">
                    {checklist.map((item, i) => {
                      const instruction = getInstruction(item.item_key);
                      if (item.ignored) {
                        return (
                          <div key={item.item_key} className="flex items-center gap-2 py-1 opacity-50">
                            <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground line-through flex-1">{item.label}</span>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-muted-foreground" onClick={() => toggleIgnore(i)}>Restore</Button>
                          </div>
                        );
                      }

                      return (
                        <div key={item.item_key} className="rounded-md border px-3 py-2">
                          <div className="flex items-start gap-3">
                            <Checkbox checked={item.completed} onCheckedChange={() => toggleChecklist(i)} id={`q${qs.quarter}-${item.item_key}`} className="mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <Label htmlFor={`q${qs.quarter}-${item.item_key}`} className={`text-sm cursor-pointer font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {item.label}
                              </Label>
                              {!item.completed && instruction && (
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{instruction}</p>
                              )}
                            </div>
                            {!item.completed && (
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-muted-foreground shrink-0" onClick={() => toggleIgnore(i)} title="Ignore this item">
                                <EyeOff className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Incomplete Reminders */}
                {incompleteItems.length > 0 && qs.status !== 'paid' && (
                  <div className="rounded-md bg-warning/10 border border-warning/20 p-3 mt-2">
                    <p className="text-xs font-medium text-warning mb-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Reminders</p>
                    <ul className="space-y-0.5">
                      {incompleteItems.slice(0, 3).map(item => (
                        <li key={item.item_key} className="text-xs text-muted-foreground">• {item.label}</li>
                      ))}
                      {incompleteItems.length > 3 && (
                        <li className="text-xs text-muted-foreground">+ {incompleteItems.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </>
            );

            if (isCurrentQuarter) {
              return (
                <Card key={qs.quarter} className="border border-primary/30 shadow-sm">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">Current</Badge>
                    </div>
                    {quarterHeader}
                    {quarterBody}
                  </CardContent>
                </Card>
              );
            }

            return (
              <Collapsible key={qs.quarter}>
                <Card className="border">
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      {quarterHeader}
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-4 pt-0 space-y-4">
                      {quarterBody}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

export { DEFAULT_CHECKLIST_ITEMS };
