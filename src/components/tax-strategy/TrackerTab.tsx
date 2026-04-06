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
import {
  DollarSign, CalendarDays, CheckCircle2, AlertCircle, EyeOff,
  ChevronDown, ChevronRight, TrendingUp, TrendingDown, Building2,
  Calculator, Settings2, Receipt, ArrowRight,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  aggregateQuarterlyIncome,
  calculateSetAside,
  getDefaultDueDates,
  estimateTotalTax,
  estimateTotalTaxSCorp,
  estimateQuarterlyInstallments,
  getDefaultReasonableSalary,
  type FilingStatus,
  type SCorpTaxEstimate,
} from '@/lib/taxCalculations';

const db = (table: string) => supabase.from(table as any);

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not started', icon: '○' },
  { value: 'discussed', label: 'Reviewed with CPA', icon: '💬' },
  { value: 'scheduled', label: 'Payment scheduled', icon: '📅' },
  { value: 'paid', label: 'Paid', icon: '✓' },
];

const DEFAULT_CHECKLIST_ITEMS: { key: string; label: string; instruction: string; quarter?: number }[] = [
  { key: 'entity_setup', label: 'Entity setup reviewed', instruction: 'Confirm your business entity type (sole prop, LLC, S-corp) is still the best fit. Discuss with your CPA if your relief income has changed significantly.' },
  { key: 'estimated_taxes', label: 'Estimated taxes reviewed this quarter', instruction: 'Review your YTD income and reserve amount. Confirm quarterly payment amounts with your CPA before each due date.' },
  { key: 'cpa_consulted', label: 'CPA consulted this year', instruction: 'Schedule at least one annual check-in with your CPA to review entity structure, deductions, and quarterly estimates.' },
  { key: 'payroll_reviewed', label: 'Payroll reviewed (if S-corp)', instruction: 'If you operate as an S-corp, ensure payroll is set up and reasonable compensation is being paid. Confirm amounts with your CPA.' },
  { key: 'reasonable_comp', label: 'Reasonable compensation discussed (if S-corp)', instruction: 'S-corp owners must pay themselves a reasonable salary. Discuss the appropriate amount based on your relief work volume and industry norms.' },
  { key: 'accountable_plan', label: 'Accountable plan discussed (if S-corp)', instruction: 'An accountable plan lets your S-corp reimburse you for business expenses like mileage, CE, and licensing. Ask your CPA if this applies.' },
  { key: 'deductions_reviewed', label: 'Deduction categories reviewed', instruction: 'Go to the Deductions tab and ensure all your business expense categories have accurate YTD totals and documentation status.' },
  { key: 'receipts_organized', label: 'Receipts / docs organized', instruction: 'Gather and organize receipts for all business expenses. Digital copies are fine — ensure each category has supporting documentation.' },
  { key: 'mileage_tracking', label: 'Multi-clinic mileage tracking reviewed', instruction: 'If you travel between multiple clinics or facilities, keep a mileage log with dates, destinations, and business purpose for each trip.' },
  { key: 'ce_licensing', label: 'CE / licensing costs organized', instruction: 'Compile all continuing education fees, license renewals, DEA registrations, and professional certification costs for the year.' },
  { key: 'travel_docs', label: 'Travel / lodging documentation reviewed', instruction: 'For out-of-town assignments, keep records of lodging, travel expenses, and per diem meals. Note the business purpose for each trip.' },
  { key: 'cpa_packet', label: 'Year-end CPA packet ready', instruction: 'Visit the CPA Packet tab to generate a summary of your income, deductions, and questions. Share this with your CPA before year-end.' },
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

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDetailed(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const QUARTER_LABELS = ['Jan – Mar', 'Apr – Jun', 'Jul – Sep', 'Oct – Dec'];

interface TrackerTabProps {
  isScorp?: boolean;
}

export default function TrackerTab({ isScorp = false }: TrackerTabProps) {
  const { invoices } = useData();
  const { user, isDemo } = useAuth();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(!isDemo);
  const [expandedQuarter, setExpandedQuarter] = useState<number | null>(currentQuarter);

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
        setSettings({
          set_aside_mode: d.set_aside_mode,
          set_aside_percent: Number(d.set_aside_percent),
          set_aside_fixed_monthly: Number(d.set_aside_fixed_monthly),
        });
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
    const payload = {
      set_aside_mode: settings.set_aside_mode,
      set_aside_percent: settings.set_aside_percent,
      set_aside_fixed_monthly: settings.set_aside_fixed_monthly,
    };
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
    const nowStr = new Date().toISOString();
    const updated = { ...item, completed: !item.completed, completed_at: !item.completed ? nowStr : null, ignored: false };
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

  // ── Computed Values ──
  const quarterlyIncome = useMemo(() => aggregateQuarterlyIncome(invoices, selectedYear), [invoices, selectedYear]);
  const setAsideData = useMemo(() => calculateSetAside(quarterlyIncome, settings.set_aside_mode, settings.set_aside_percent, settings.set_aside_fixed_monthly), [quarterlyIncome, settings]);
  const totalIncome = quarterlyIncome.reduce((s, q) => s + q.income, 0);
  const totalSetAside = setAsideData.reduce((s, q) => s + q.amount, 0);

  // Real tax estimate using IRS brackets
  const filingStatus: FilingStatus = 'single';
  const [reasonableSalary, setReasonableSalary] = useState(() => getDefaultReasonableSalary(totalIncome));

  // Update default salary when income changes significantly
  useEffect(() => {
    if (isScorp && totalIncome > 0) {
      setReasonableSalary(prev => {
        const suggested = getDefaultReasonableSalary(totalIncome);
        // Only auto-update if user hasn't manually adjusted (within 10% of default)
        if (prev === 0) return suggested;
        return prev;
      });
    }
  }, [totalIncome, isScorp]);

  const taxEstimate = useMemo(() => {
    if (isScorp) {
      return estimateTotalTaxSCorp(totalIncome, filingStatus, 0, reasonableSalary);
    }
    return estimateTotalTax(totalIncome, filingStatus, 0);
  }, [totalIncome, isScorp, reasonableSalary]);

  const scorpEstimate = isScorp ? (taxEstimate as SCorpTaxEstimate) : null;

  // Annualized income installment method for quarterly payments
  const quarterlyInstallments = useMemo(
    () => estimateQuarterlyInstallments(quarterlyIncome, filingStatus, 0),
    [quarterlyIncome]
  );

  const monthsElapsed = Math.max(1, now.getMonth() + 1);
  const annualizedIncome = (totalIncome / monthsElapsed) * 12;
  const annualizedEstimate = useMemo(() => {
    if (isScorp) {
      return estimateTotalTaxSCorp(annualizedIncome, filingStatus, 0, getDefaultReasonableSalary(annualizedIncome));
    }
    return estimateTotalTax(annualizedIncome, filingStatus, 0);
  }, [annualizedIncome, isScorp]);
  const showScorpNudge = !isScorp && annualizedIncome >= 80000 && totalIncome > 0;

  const activeChecklist = checklist.filter(c => !c.ignored);
  const completedCount = activeChecklist.filter(c => c.completed).length;
  const readinessPercent = activeChecklist.length > 0 ? Math.round((completedCount / activeChecklist.length) * 100) : 0;

  const paidQuarters = quarterStatuses.filter(q => q.status === 'paid').length;

  const nextDue = useMemo(() => {
    const upcoming = quarterStatuses
      .filter(q => new Date(q.due_date) >= now && q.status !== 'paid')
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    return upcoming[0] || null;
  }, [quarterStatuses]);

  function getInstruction(itemKey: string): string {
    return DEFAULT_CHECKLIST_ITEMS.find(d => d.key === itemKey)?.instruction || '';
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'discussed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  }

  if (loading) return <p className="text-muted-foreground py-8 text-center">Loading…</p>;

  return (
    <div className="space-y-6">
      {/* ═══ TAX SNAPSHOT HERO ═══ */}
      <Card className="overflow-hidden border-primary/20">
        <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-5 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                {selectedYear} Tax Snapshot
                {isScorp && (
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                    S-Corp
                  </Badge>
                )}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Based on ${fmt(totalIncome)} in paid income · Filing as single{isScorp ? ' · S-Corp' : ''}
              </p>
            </div>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[90px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{[currentYear - 1, currentYear, currentYear + 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Main Tax Numbers */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-3.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">YTD Income</p>
              <p className="text-2xl font-bold mt-1">${fmt(totalIncome)}</p>
              {totalIncome > 0 && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  ~${fmt(annualizedIncome)} annualized
                </p>
              )}
            </div>
            <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-3.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Estimated Tax</p>
              <p className="text-2xl font-bold text-destructive mt-1">${fmt(taxEstimate.totalEstimatedTax)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {taxEstimate.effectiveRate}% effective rate
              </p>
            </div>
            <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-3.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {isScorp ? 'Payroll Tax (on salary)' : 'SE Tax'}
              </p>
              <p className="text-2xl font-bold mt-1">${fmt(taxEstimate.selfEmploymentTax)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isScorp
                  ? `15.3% on $${fmt(scorpEstimate?.reasonableSalary || 0)} salary`
                  : '15.3% on net earnings'
                }
              </p>
            </div>
            <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-3.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Federal Income Tax</p>
              <p className="text-2xl font-bold mt-1">${fmt(taxEstimate.federalIncomeTax)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                After ${fmt(taxEstimate.businessDeductions || 15700)} deduction
              </p>
            </div>
          </div>

          {/* S-Corp Savings Callout */}
          {isScorp && scorpEstimate && scorpEstimate.sCorpSavings > 0 && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 flex items-center gap-3 mb-4">
              <TrendingDown className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Saving ~${fmt(scorpEstimate.sCorpSavings)} vs Sole Prop
                </p>
                <p className="text-xs text-green-700/70 dark:text-green-400/70">
                  ${fmt(scorpEstimate.distribution)} in distributions not subject to payroll tax
                </p>
              </div>
            </div>
          )}

          {/* S-Corp Reasonable Salary Input */}
          {isScorp && (
            <div className="rounded-lg bg-background/60 border p-3 flex items-center gap-3 mb-4">
              <Building2 className="h-4 w-4 text-primary shrink-0" />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Reasonable salary:</span>
                <div className="w-32">
                  <Input
                    type="number"
                    min={0}
                    value={reasonableSalary}
                    onChange={e => setReasonableSalary(Number(e.target.value))}
                    className="h-7 text-sm"
                  />
                </div>
                <span className="text-[11px] text-muted-foreground">Confirm with your CPA</span>
              </div>
            </div>
          )}

          {/* Projection callout */}
          {totalIncome > 0 && (
            <div className="rounded-lg bg-background/60 border border-dashed p-3 flex items-center gap-3">
              <TrendingUp className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">At this pace</span>, you'll owe roughly{' '}
                  <span className="font-bold">${fmt(annualizedEstimate.totalEstimatedTax)}</span> for {selectedYear}
                  {' '}— or about <span className="font-bold">${fmt(annualizedEstimate.quarterlyPayment)}/quarter</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* S-Corp Nudge */}
      {showScorpNudge && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
          <Building2 className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Your income may qualify for S-Corp savings.</p>
            <p className="text-xs text-muted-foreground">Could reduce the 15.3% self-employment tax. Explore below.</p>
          </div>
          <a href="/business?tab=tax-estimate" className="shrink-0">
            <Button variant="outline" size="sm" className="text-xs">Explore S-Corp →</Button>
          </a>
        </div>
      )}

      {/* ═══ QUARTERLY PAYMENT GUIDE ═══ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Quarterly Payment Guide
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {paidQuarters}/4 quarters completed · Confirm amounts with your CPA
            </p>
          </div>
        </div>

        {/* Quarterly Progress Timeline */}
        <div className="flex items-center gap-0 mb-4 px-2">
          {[1, 2, 3, 4].map((q, i) => {
            const qs = quarterStatuses.find(s => s.quarter === q);
            const isPaid = qs?.status === 'paid';
            const isCurrent = selectedYear === currentYear && q === currentQuarter;
            const isPast = qs ? new Date(qs.due_date) < now : false;

            return (
              <div key={q} className="flex items-center flex-1">
                <button
                  onClick={() => setExpandedQuarter(expandedQuarter === q ? null : q)}
                  className={`
                    relative flex flex-col items-center gap-1 flex-1 py-2 rounded-lg transition-all cursor-pointer
                    ${expandedQuarter === q ? 'bg-primary/10' : 'hover:bg-muted/50'}
                  `}
                >
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${isPaid ? 'bg-green-500 text-white' : ''}
                    ${isCurrent && !isPaid ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background' : ''}
                    ${!isPaid && !isCurrent && isPast ? 'bg-destructive/20 text-destructive border border-destructive/30' : ''}
                    ${!isPaid && !isCurrent && !isPast ? 'bg-muted text-muted-foreground border border-border' : ''}
                  `}>
                    {isPaid ? <CheckCircle2 className="h-4 w-4" /> : `Q${q}`}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{QUARTER_LABELS[i]}</span>
                  {isCurrent && !isPaid && (
                    <span className="absolute -top-1 -right-1 text-[8px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">
                      NOW
                    </span>
                  )}
                </button>
                {i < 3 && (
                  <div className={`h-0.5 w-4 shrink-0 ${isPaid ? 'bg-green-400' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Expanded Quarter Detail */}
        {expandedQuarter && (() => {
          const q = expandedQuarter;
          const qs = quarterStatuses.find(s => s.quarter === q);
          if (!qs) return null;
          const qi = quarterlyIncome.find(s => s.quarter === q);
          const installment = quarterlyInstallments.find(s => s.quarter === q);
          const sa = setAsideData.find(s => s.quarter === q);
          const quarterIncome = qi?.income || 0;
          const isPast = new Date(qs.due_date) < now;
          const isCurrent = selectedYear === currentYear && q === currentQuarter;

          return (
            <Card className={`border ${isCurrent ? 'border-primary/30 shadow-md' : ''}`}>
              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Quarter Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold">Q{q} — {QUARTER_LABELS[q - 1]}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-muted-foreground">
                        Due {new Date(qs.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {isPast && qs.status !== 'paid' && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">PAST DUE</Badge>
                      )}
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(qs.status)}`}>
                    {STATUS_OPTIONS.find(o => o.value === qs.status)?.label}
                  </div>
                </div>

                {/* Income & Payment Breakdown */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Quarter Income</p>
                    <p className="text-lg font-bold mt-1">${fmt(quarterIncome)}</p>
                    {qi && qi.monthlyBreakdown.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {qi.monthlyBreakdown.map(m => (
                          <p key={m.month} className="text-[10px] text-muted-foreground flex justify-between">
                            <span>{m.monthLabel}</span>
                            <span>${fmt(m.income)}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Suggested Payment</p>
                    <p className="text-lg font-bold text-destructive mt-1">${fmt(installment?.installmentPayment || 0)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">IRS annualized method</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Your Reserve</p>
                    <p className="text-lg font-bold mt-1">${fmt(sa?.amount || 0)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {settings.set_aside_mode === 'percent' ? `${settings.set_aside_percent}% of income` : `$${settings.set_aside_fixed_monthly}/mo`}
                    </p>
                  </div>
                </div>

                {/* Guided Steps */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    Steps for Q{q}
                  </p>
                  <div className="space-y-2">
                    {[
                      { label: 'Review your income for this quarter', done: quarterIncome > 0 },
                      { label: 'Set your reserve percentage', done: settings.set_aside_percent > 0 },
                      { label: 'Review with your CPA', done: qs.status === 'discussed' || qs.status === 'scheduled' || qs.status === 'paid' },
                      { label: 'Schedule or pay estimated tax', done: qs.status === 'scheduled' || qs.status === 'paid' },
                      { label: 'Mark as paid', done: qs.status === 'paid' },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                          step.done
                            ? 'bg-green-500 text-white'
                            : 'bg-background border-2 border-muted-foreground/30 text-muted-foreground'
                        }`}>
                          {step.done ? '✓' : i + 1}
                        </div>
                        <span className={`text-sm ${step.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Update */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Update Status</Label>
                    <Select value={qs.status} onValueChange={v => setQuarterStatuses(prev => prev.map(q2 => q2.quarter === qs.quarter ? { ...q2, status: v } : q2))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.icon} {o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={() => saveQuarterStatus(qs)}>Save</Button>
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* ═══ RESERVE SETTINGS (collapsible) ═══ */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-1 group">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium flex-1">Reserve Settings</span>
          <span className="text-xs text-muted-foreground mr-2">
            {settings.set_aside_mode === 'percent' ? `${settings.set_aside_percent}%` : `$${settings.set_aside_fixed_monthly}/mo`}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="p-4 space-y-4">
              <p className="text-xs text-muted-foreground">Most relief professionals set aside 25–35% for federal + state taxes. Adjust based on your CPA's recommendation.</p>
              <RadioGroup value={settings.set_aside_mode} onValueChange={v => setSettings(s => ({ ...s, set_aside_mode: v as any }))} className="flex gap-4">
                <div className="flex items-center gap-1.5"><RadioGroupItem value="percent" id="t-pct" /><Label htmlFor="t-pct" className="text-sm">% of paid income</Label></div>
                <div className="flex items-center gap-1.5"><RadioGroupItem value="fixed" id="t-fix" /><Label htmlFor="t-fix" className="text-sm">Fixed $/month</Label></div>
              </RadioGroup>
              <div className="flex gap-4 items-end">
                {settings.set_aside_mode === 'percent' ? (
                  <div className="w-40"><Label>Percent (%)</Label><Input type="number" min={0} max={100} value={settings.set_aside_percent} onChange={e => setSettings(s => ({ ...s, set_aside_percent: Number(e.target.value) }))} /></div>
                ) : (
                  <div className="w-40"><Label>Monthly ($)</Label><Input type="number" min={0} value={settings.set_aside_fixed_monthly} onChange={e => setSettings(s => ({ ...s, set_aside_fixed_monthly: Number(e.target.value) }))} /></div>
                )}
                <Button size="sm" onClick={saveSettings}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* ═══ TAX READINESS CHECKLIST (collapsible) ═══ */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-1 group">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium flex-1">Tax Readiness Checklist</span>
          <div className="flex items-center gap-2 mr-2">
            <Progress value={readinessPercent} className="h-1.5 w-16" />
            <span className="text-xs text-muted-foreground">{readinessPercent}%</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="p-4 space-y-1.5">
              <p className="text-xs text-muted-foreground mb-3">{completedCount} of {activeChecklist.length} tasks · {checklist.filter(c => c.ignored).length} hidden</p>
              {checklist.map((item, i) => {
                const instruction = getInstruction(item.item_key);
                if (item.ignored) {
                  return (
                    <div key={item.item_key} className="flex items-center gap-2 py-1 opacity-50">
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground line-through flex-1">{item.label}</span>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => toggleIgnore(i)}>Restore</Button>
                    </div>
                  );
                }
                return (
                  <div key={item.item_key} className="rounded-md border px-3 py-2">
                    <div className="flex items-start gap-3">
                      <Checkbox checked={item.completed} onCheckedChange={() => toggleChecklist(i)} id={`cl-${item.item_key}`} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={`cl-${item.item_key}`} className={`text-sm cursor-pointer font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {item.label}
                        </Label>
                        {!item.completed && instruction && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{instruction}</p>
                        )}
                      </div>
                      {!item.completed && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-muted-foreground shrink-0" onClick={() => toggleIgnore(i)} title="Ignore">
                          <EyeOff className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export { DEFAULT_CHECKLIST_ITEMS };
