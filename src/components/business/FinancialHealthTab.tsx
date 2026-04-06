import { useMemo, useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useExpenses } from '@/hooks/useExpenses';
import { supabase } from '@/integrations/supabase/client';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { estimateTotalTax, type FilingStatus } from '@/lib/taxCalculations';
import { EXPENSE_CATEGORIES } from '@/lib/expenseCategories';
import ReportsPage from '@/pages/ReportsPage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, FileText, Receipt, Shield, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO, differenceInDays, startOfMonth, eachMonthOfInterval, subMonths, endOfMonth, isWithinInterval } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

const db = (table: string) => supabase.from(table as any);
const fmtDollars = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtAmount = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function SectionHeader({ title, icon: Icon, open, onToggle }: { title: string; icon: React.ElementType; open: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-2 w-full text-left group">
      <div className="p-1.5 rounded-md bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h2 className="text-base font-semibold flex-1">{title}</h2>
      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  );
}

export default function FinancialHealthTab() {
  const { invoices, facilities, payments } = useData();
  const { user, isDemo } = useAuth();
  const [, setSearchParams] = useSearchParams();
  const expenseData = useExpenses();

  const [openSections, setOpenSections] = useState({ revenue: true, cashflow: true, taxReserve: true, expenses: true });
  const toggle = (key: keyof typeof openSections) => setOpenSections(p => ({ ...p, [key]: !p[key] }));

  // Tax settings for reserve section
  const [taxSettings, setTaxSettings] = useState<any>(null);
  const [quarterStatuses, setQuarterStatuses] = useState<any[]>([]);

  useEffect(() => {
    if (isDemo || !user) return;
    const year = new Date().getFullYear();
    Promise.all([
      db('tax_settings').select('*').eq('user_id', user.id).eq('tax_year', year).maybeSingle(),
      db('tax_quarter_statuses').select('*').eq('user_id', user.id).eq('tax_year', year),
    ]).then(([tsRes, qsRes]) => {
      if (tsRes.data) setTaxSettings(tsRes.data);
      if (qsRes.data) setQuarterStatuses(qsRes.data as any[]);
    });
  }, [user?.id, isDemo]);

  // ── Invoice & Cash Flow ──
  const cashFlowMetrics = useMemo(() => {
    let draftCount = 0, draftAmount = 0;
    let sentCount = 0, sentAmount = 0;
    let overdueCount = 0, overdueAmount = 0;
    let paidCount = 0, paidAmount = 0;
    const daysToPay: number[] = [];

    invoices.forEach(inv => {
      const status = computeInvoiceStatus(inv);
      const bal = inv.balance_due ?? inv.total_amount;
      switch (status) {
        case 'draft': draftCount++; draftAmount += inv.total_amount; break;
        case 'sent': case 'partial': sentCount++; sentAmount += bal; break;
        case 'overdue': overdueCount++; overdueAmount += bal; break;
        case 'paid': paidCount++; paidAmount += inv.total_amount; break;
      }
      if (status === 'paid' && inv.sent_at && inv.paid_at) {
        const days = differenceInDays(parseISO(inv.paid_at), parseISO(inv.sent_at));
        if (days >= 0) daysToPay.push(days);
      }
    });

    const avgDays = daysToPay.length > 0 ? Math.round(daysToPay.reduce((a, b) => a + b, 0) / daysToPay.length) : null;

    // Aging buckets for overdue
    const now = new Date();
    const aging = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    invoices.forEach(inv => {
      const status = computeInvoiceStatus(inv);
      if ((status === 'overdue' || status === 'sent' || status === 'partial') && inv.due_date) {
        const days = differenceInDays(now, parseISO(inv.due_date));
        if (days <= 0) return; // not yet due
        const bal = inv.balance_due ?? inv.total_amount;
        if (days <= 30) aging['0-30'] += bal;
        else if (days <= 60) aging['31-60'] += bal;
        else if (days <= 90) aging['61-90'] += bal;
        else aging['90+'] += bal;
      }
    });

    return { draftCount, draftAmount, sentCount, sentAmount, overdueCount, overdueAmount, paidCount, paidAmount, avgDays, aging };
  }, [invoices]);

  // ── Tax Reserve ──
  const taxReserve = useMemo(() => {
    const year = new Date().getFullYear();
    const ytdPaidInvoices = invoices.filter(inv => inv.status === 'paid' && inv.paid_at && new Date(inv.paid_at).getFullYear() === year);
    const ytdIncome = ytdPaidInvoices.reduce((s, inv) => s + inv.total_amount, 0);
    const ytdDeductions = expenseData.ytdDeductibleCents / 100;
    const filingStatus: FilingStatus = taxSettings?.filing_status || 'single';
    const estimate = estimateTotalTax(ytdIncome, filingStatus, ytdDeductions);

    // Annualize
    const monthsElapsed = new Date().getMonth() + 1;
    const projectedAnnualIncome = (ytdIncome / monthsElapsed) * 12;
    const projectedAnnualDeductions = (ytdDeductions / monthsElapsed) * 12;
    const annualEstimate = estimateTotalTax(projectedAnnualIncome, filingStatus, projectedAnnualDeductions);

    const paidYTD = quarterStatuses
      .filter((qs: any) => qs.status === 'paid' && qs.amount_paid)
      .reduce((s: number, qs: any) => s + Number(qs.amount_paid || 0), 0);

    const remaining = Math.max(0, annualEstimate.totalEstimatedTax - paidYTD);
    const requiredYTD = annualEstimate.quarterlyPayment * Math.ceil(monthsElapsed / 3);
    let status: 'on_track' | 'behind' | 'at_risk' = 'on_track';
    if (paidYTD < requiredYTD * 0.5) status = 'at_risk';
    else if (paidYTD < requiredYTD * 0.9) status = 'behind';

    return {
      estimatedAnnualTax: annualEstimate.totalEstimatedTax,
      quarterlyPayment: annualEstimate.quarterlyPayment,
      paidYTD,
      remaining,
      status,
      effectiveRate: annualEstimate.effectiveRate,
      projectedAnnualIncome,
    };
  }, [invoices, expenseData.ytdDeductibleCents, taxSettings, quarterStatuses]);

  // ── Expense Visibility ──
  const expenseMetrics = useMemo(() => {
    const { ytdExpenses, ytdTotalCents, ytdDeductibleCents, ytdByCategory, categoriesTracked } = expenseData;

    // Monthly trend (last 6 months)
    const now = new Date();
    const monthStarts = eachMonthOfInterval({
      start: startOfMonth(subMonths(now, 5)),
      end: startOfMonth(now),
    });
    const monthlyTrend = monthStarts.map(m => {
      const end = endOfMonth(m);
      const total = ytdExpenses
        .filter(e => {
          const d = new Date(e.expense_date);
          return isWithinInterval(d, { start: m, end });
        })
        .reduce((s, e) => s + e.amount_cents, 0);
      return { month: format(m, 'MMM'), totalCents: total };
    });

    // Top 5 categories
    const catEntries = Object.entries(ytdByCategory)
      .map(([key, val]) => {
        const group = EXPENSE_CATEGORIES.find(c => c.key === key);
        return { key, label: group?.label || key, ...val };
      })
      .sort((a, b) => b.totalCents - a.totalCents)
      .slice(0, 5);

    // Warnings
    const uncategorized = ytdExpenses.filter(e => !e.category || e.category === '').length;
    const missingReceipts = ytdExpenses.filter(e => e.amount_cents > 7500 && !e.receipt_url).length;

    return { ytdTotalCents, ytdDeductibleCents, categoriesTracked, monthlyTrend, topCategories: catEntries, uncategorized, missingReceipts };
  }, [expenseData]);

  const expenseTrendConfig = { totalCents: { label: 'Expenses', color: 'hsl(var(--primary))' } };
  const expenseCatConfig = { totalCents: { label: 'Amount', color: 'hsl(var(--primary))' } };

  return (
    <div className="space-y-6">
      {/* Section 1: Revenue Overview */}
      <Collapsible open={openSections.revenue} onOpenChange={() => toggle('revenue')}>
        <CollapsibleTrigger asChild>
          <div><SectionHeader title="Revenue Overview" icon={FileText} open={openSections.revenue} onToggle={() => toggle('revenue')} /></div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <ReportsPage />
        </CollapsibleContent>
      </Collapsible>

      {/* Section 2: Invoice & Cash Flow */}
      <Collapsible open={openSections.cashflow} onOpenChange={() => toggle('cashflow')}>
        <CollapsibleTrigger asChild>
          <div><SectionHeader title="Invoice & Cash Flow" icon={Receipt} open={openSections.cashflow} onToggle={() => toggle('cashflow')} /></div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">Draft</p>
                <p className="text-xl font-bold">{cashFlowMetrics.draftCount}</p>
                <p className="text-xs text-muted-foreground">{fmtAmount(cashFlowMetrics.draftAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">Sent / Partial</p>
                <p className="text-xl font-bold">{cashFlowMetrics.sentCount}</p>
                <p className="text-xs text-muted-foreground">{fmtAmount(cashFlowMetrics.sentAmount)}</p>
              </CardContent>
            </Card>
            <Card className={cashFlowMetrics.overdueCount > 0 ? 'border-destructive/30' : ''}>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className={`text-xl font-bold ${cashFlowMetrics.overdueCount > 0 ? 'text-destructive' : ''}`}>{cashFlowMetrics.overdueCount}</p>
                <p className="text-xs text-muted-foreground">{fmtAmount(cashFlowMetrics.overdueAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-xl font-bold">{cashFlowMetrics.paidCount}</p>
                <p className="text-xs text-muted-foreground">{fmtAmount(cashFlowMetrics.paidAmount)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cashFlowMetrics.avgDays !== null && (
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-xs text-muted-foreground">Avg Days to Payment</p>
                  <p className="text-2xl font-bold">{cashFlowMetrics.avgDays} <span className="text-sm font-normal text-muted-foreground">days</span></p>
                </CardContent>
              </Card>
            )}
            {(cashFlowMetrics.aging['0-30'] > 0 || cashFlowMetrics.aging['31-60'] > 0 || cashFlowMetrics.aging['61-90'] > 0 || cashFlowMetrics.aging['90+'] > 0) && (
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-xs text-muted-foreground mb-2">Aging Buckets (Past Due)</p>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    {(['0-30', '31-60', '61-90', '90+'] as const).map(bucket => (
                      <div key={bucket}>
                        <p className="font-medium">{bucket}d</p>
                        <p className={`font-semibold ${cashFlowMetrics.aging[bucket] > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {fmtAmount(cashFlowMetrics.aging[bucket])}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 3: Tax Reserve Status */}
      <Collapsible open={openSections.taxReserve} onOpenChange={() => toggle('taxReserve')}>
        <CollapsibleTrigger asChild>
          <div><SectionHeader title="Tax Reserve Status" icon={Shield} open={openSections.taxReserve} onToggle={() => toggle('taxReserve')} /></div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <Card>
            <CardContent className="pt-5 pb-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Projected Annual Tax</p>
                  <p className="text-2xl font-bold">{fmtAmount(taxReserve.estimatedAnnualTax)}</p>
                  <p className="text-xs text-muted-foreground">
                    {taxReserve.effectiveRate}% effective rate on {fmtAmount(taxReserve.projectedAnnualIncome)} projected income
                  </p>
                </div>
                <Badge
                  variant={taxReserve.status === 'on_track' ? 'success' : taxReserve.status === 'behind' ? 'warning' : 'destructive'}
                  className="text-xs"
                >
                  {taxReserve.status === 'on_track' ? '✓ On Track' : taxReserve.status === 'behind' ? '⚠ Behind' : '⚠ At Risk'}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Quarterly Payment</p>
                  <p className="text-lg font-semibold">{fmtAmount(taxReserve.quarterlyPayment)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid YTD</p>
                  <p className="text-lg font-semibold">{fmtAmount(taxReserve.paidYTD)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="text-lg font-semibold">{fmtAmount(taxReserve.remaining)}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={() => setSearchParams({ tab: 'tax-estimate' }, { replace: true })}
              >
                View detailed tax estimate <ArrowRight className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 4: Expense Visibility */}
      <Collapsible open={openSections.expenses} onOpenChange={() => toggle('expenses')}>
        <CollapsibleTrigger asChild>
          <div><SectionHeader title="Expense Visibility" icon={Receipt} open={openSections.expenses} onToggle={() => toggle('expenses')} /></div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">YTD Expenses</p>
                <p className="text-xl font-bold">{fmtDollars(expenseMetrics.ytdTotalCents)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">YTD Deductible</p>
                <p className="text-xl font-bold">{fmtDollars(expenseMetrics.ytdDeductibleCents)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">Categories Tracked</p>
                <p className="text-xl font-bold">{expenseMetrics.categoriesTracked}</p>
              </CardContent>
            </Card>
          </div>

          {/* Warnings */}
          {(expenseMetrics.uncategorized > 0 || expenseMetrics.missingReceipts > 0) && (
            <div className="flex flex-wrap gap-3">
              {expenseMetrics.uncategorized > 0 && (
                <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {expenseMetrics.uncategorized} uncategorized expense{expenseMetrics.uncategorized !== 1 ? 's' : ''}
                </div>
              )}
              {expenseMetrics.missingReceipts > 0 && (
                <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {expenseMetrics.missingReceipts} expense{expenseMetrics.missingReceipts !== 1 ? 's' : ''} over $75 missing receipts
                </div>
              )}
            </div>
          )}

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly Expense Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Monthly Expense Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {expenseMetrics.monthlyTrend.some(m => m.totalCents > 0) ? (
                  <ChartContainer config={expenseTrendConfig} className="h-[200px] w-full">
                    <LineChart data={expenseMetrics.monthlyTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" fontSize={12} className="text-muted-foreground" />
                      <YAxis fontSize={12} className="text-muted-foreground" tickFormatter={v => `$${(v / 100).toFixed(0)}`} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(value: any) => fmtDollars(Number(value))} />} />
                      <Line type="monotone" dataKey="totalCents" stroke="var(--color-totalCents)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No expenses logged yet</p>
                )}
              </CardContent>
            </Card>

            {/* Top Categories */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top Expense Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {expenseMetrics.topCategories.length > 0 ? (
                  <ChartContainer config={expenseCatConfig} className="h-[200px] w-full">
                    <BarChart data={expenseMetrics.topCategories} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" fontSize={12} className="text-muted-foreground" tickFormatter={v => `$${(v / 100).toFixed(0)}`} />
                      <YAxis dataKey="label" type="category" fontSize={11} className="text-muted-foreground" width={110} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(value: any) => fmtDollars(Number(value))} />} />
                      <Bar dataKey="totalCents" fill="var(--color-totalCents)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Start tracking expenses to see categories</p>
                )}
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
