import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Calendar, CheckCircle2, TrendingUp, Download } from 'lucide-react';
import { QUARTER_STATUS_OPTIONS } from '@/types/taxStrategy';
import { aggregateQuarterlyIncome, calculateSetAside, generateTaxExportCSV } from '@/lib/taxCalculations';
import { toast } from 'sonner';
import type { TaxStrategyData } from '@/hooks/useTaxStrategy';

interface Props {
  data: TaxStrategyData;
}

const QUARTER_LABELS: Record<number, string> = {
  1: 'Q1 (Jan–Mar)',
  2: 'Q2 (Apr–Jun)',
  3: 'Q3 (Jul–Sep)',
  4: 'Q4 (Oct–Dec)',
};

export function TrackerTab({ data }: Props) {
  const {
    ytdPaidIncome, reserveAmount, readinessScore, nextQuarterDue, checklist,
    quarterStatuses, profile, currentYear, saveProfile, toggleChecklistItem,
    initializeChecklist, initializeQuarterStatuses, saveQuarterStatus, invoices,
  } = data;

  const [reservePct, setReservePct] = useState(profile?.reserve_percent?.toString() || '30');
  const [setAsideMode, setSetAsideMode] = useState<'percent' | 'fixed'>('percent');
  const [fixedMonthly, setFixedMonthly] = useState(0);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    initializeChecklist();
    initializeQuarterStatuses();
  }, [initializeChecklist, initializeQuarterStatuses]);

  useEffect(() => {
    setReservePct(profile?.reserve_percent?.toString() || '30');
  }, [profile?.reserve_percent]);

  const handleReserveChange = () => {
    const pct = parseFloat(reservePct) || 30;
    saveProfile({ reserve_percent: pct });
    toast.success('Reserve preference saved');
  };

  const getQuarterStatus = (q: number) => {
    return quarterStatuses.find(qs => qs.quarter === q) || {
      quarter: q, tax_year: currentYear,
      due_date: `${currentYear}-${q === 1 ? '04' : q === 2 ? '06' : q === 3 ? '09' : '01'}-15`,
      status: 'not_started', notes: '',
    };
  };

  // Quarterly income from invoices
  const quarterlyIncome = useMemo(
    () => aggregateQuarterlyIncome(invoices, selectedYear),
    [invoices, selectedYear]
  );

  const setAsideData = useMemo(
    () => calculateSetAside(quarterlyIncome, setAsideMode, parseFloat(reservePct) || 30, fixedMonthly),
    [quarterlyIncome, setAsideMode, reservePct, fixedMonthly]
  );

  const totalIncome = quarterlyIncome.reduce((s, q) => s + q.income, 0);
  const totalSetAside = setAsideData.reduce((s, q) => s + q.amount, 0);

  const daysUntilNextDue = Math.ceil(
    (new Date(nextQuarterDue.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const completedCount = checklist.filter(i => i.completed).length;
  const nextTask = checklist.find(i => !i.completed);

  const exportCSV = useCallback(() => {
    const csv = generateTaxExportCSV(
      selectedYear, quarterlyIncome, setAsideData,
      setAsideMode, parseFloat(reservePct) || 30, fixedMonthly,
      quarterStatuses.map(qs => ({ quarter: qs.quarter, due_date: qs.due_date, status: qs.status, notes: qs.notes || '' }))
    );
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LocumOps_Tax_Summary_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, [selectedYear, quarterlyIncome, setAsideData, setAsideMode, reservePct, fixedMonthly, quarterStatuses]);

  return (
    <div className="space-y-8">
      {/* Header row with year selector + export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-muted-foreground max-w-xl">
          Use this as a planning tracker for your relief / locum income. Confirm actual amounts and due dates with your CPA.
        </p>
        <div className="flex items-center gap-2">
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Paid Income ({selectedYear})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Est. Set-Aside
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              ${totalSetAside.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {setAsideMode === 'percent'
                ? `Based on ${reservePct}% reserve`
                : `$${fixedMonthly}/mo fixed`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Next Quarter Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">Q{nextQuarterDue.q}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {daysUntilNextDue > 0 ? `${daysUntilNextDue} days away` : 'Past due'}
            </p>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Tax Readiness
              </CardTitle>
              <span className="text-2xl font-bold text-foreground">{readinessScore}%</span>
            </div>
            <Progress value={readinessScore} className="mt-1 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {completedCount} of {checklist.length} complete
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quarterly due dates */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Quarterly Due Dates</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[1, 2, 3, 4].map(q => {
                  const qs = getQuarterStatus(q);
                  const isPast = new Date(qs.due_date) < new Date();
                  const isPaid = qs.status === 'paid';
                  return (
                    <div
                      key={q}
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        isPaid
                          ? 'border-primary/30 bg-primary/5'
                          : isPast
                            ? 'border-destructive/30 bg-destructive/5'
                            : 'border-border bg-muted/30'
                      }`}
                    >
                      <span className="font-medium">Q{q}</span>
                      <span className="text-muted-foreground ml-1">{qs.due_date}</span>
                      {isPaid && <CheckCircle2 className="inline h-3 w-3 ml-1 text-primary" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Checklist */}
            <div className="border-t border-border pt-3 space-y-1.5">
              {nextTask && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 mb-2">
                  <p className="text-xs">
                    <span className="font-medium">Next:</span> {nextTask.label}
                  </p>
                </div>
              )}
              {checklist.map(item => (
                <div key={item.item_key} className="flex items-center gap-3 py-1">
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => toggleChecklistItem(item)}
                  />
                  <span className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
              {checklist.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Loading checklist…</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Set-aside preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Set-Aside Preference
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={setAsideMode}
            onValueChange={v => setSetAsideMode(v as 'percent' | 'fixed')}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="percent" id="mode-percent" />
              <Label htmlFor="mode-percent">Percent of paid income</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed" id="mode-fixed" />
              <Label htmlFor="mode-fixed">Fixed $ per month</Label>
            </div>
          </RadioGroup>

          <div className="flex flex-col sm:flex-row gap-4 items-end">
            {setAsideMode === 'percent' ? (
              <div className="space-y-2">
                <Label>Reserve %</Label>
                <Input
                  type="number" className="w-24"
                  value={reservePct}
                  onChange={e => setReservePct(e.target.value)}
                  min={0} max={100}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Monthly amount ($)</Label>
                <Input
                  type="number" className="w-32"
                  value={fixedMonthly}
                  onChange={e => setFixedMonthly(Number(e.target.value))}
                  min={0}
                />
              </div>
            )}
            <Button variant="outline" onClick={handleReserveChange}>Save</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This is your personal reserve preference for planning, not an actual tax calculation.
          </p>
        </CardContent>
      </Card>

      {/* Quarterly breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Quarterly Estimated Tax Tracker</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quarterlyIncome.map(q => {
            const sa = setAsideData.find(s => s.quarter === q.quarter);
            const qs = getQuarterStatus(q.quarter);
            return (
              <Card key={q.quarter}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{QUARTER_LABELS[q.quarter]}</p>
                    <Badge variant={qs.status === 'paid' ? 'default' : 'secondary'}>
                      {QUARTER_STATUS_OPTIONS.find(o => o.value === qs.status)?.label || qs.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground block text-xs">Paid Income</span>
                      <span className="font-medium">${q.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Set-Aside</span>
                      <span className="font-medium">${(sa?.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground text-xs">
                      Monthly breakdown
                    </summary>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {q.monthlyBreakdown.map(m => (
                        <div key={m.month} className="text-xs">
                          <span className="text-muted-foreground">{m.monthLabel}:</span>{' '}
                          <span className="font-medium">${m.income.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </details>

                  <p className="text-xs text-muted-foreground">Due: {qs.due_date}</p>

                  <Select
                    value={qs.status}
                    onValueChange={v => saveQuarterStatus({ ...qs, status: v, tax_year: selectedYear })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {QUARTER_STATUS_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Readiness checklist */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Tax Readiness Checklist</h2>
          <p className="text-sm text-muted-foreground">
            {completedCount} of {checklist.length} complete
          </p>
        </div>

        {nextTask && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-sm">
              <span className="font-medium">Next recommended:</span> {nextTask.label}
            </p>
          </div>
        )}

        <Card>
          <CardContent className="pt-4 space-y-2">
            {checklist.map(item => (
              <div key={item.item_key} className="flex items-center gap-3 py-1.5">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => toggleChecklistItem(item)}
                />
                <span className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {item.label}
                </span>
              </div>
            ))}
            {checklist.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading checklist…</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
