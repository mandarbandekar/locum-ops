import { useMemo, useState, useEffect, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useExpenses } from '@/hooks/useExpenses';
import { supabase } from '@/integrations/supabase/client';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { estimateTotalTax, type FilingStatus } from '@/lib/taxCalculations';
import { EXPENSE_CATEGORIES } from '@/lib/expenseCategories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ComposedChart, AreaChart, Area } from 'recharts';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, FileText, Receipt, Shield, AlertTriangle, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO, differenceInDays, startOfMonth, eachMonthOfInterval, subMonths, endOfMonth, isWithinInterval, addMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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

function InsightCallout({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="mt-3 px-3 py-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
      💡 {text}
    </div>
  );
}

export default function FinancialHealthTab() {
  const { invoices, facilities, payments, shifts, lineItems } = useData();
  const { user, isDemo } = useAuth();
  const navigate = useNavigate();
  const expenseData = useExpenses();

  const [openSections, setOpenSections] = useState({ revenue: true, cashflow: true, taxReserve: true, expenses: true });
  const toggle = (key: keyof typeof openSections) => setOpenSections(p => ({ ...p, [key]: !p[key] }));

  const [monthRange, setMonthRange] = useState('6');
  const [taxSettings, setTaxSettings] = useState<any>(null);
  const [quarterStatuses, setQuarterStatuses] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

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

  // ── Revenue charts (extracted from ReportsPage) ──
  const months = useMemo(() => {
    const now = new Date();
    const pastStart = subMonths(startOfMonth(now), parseInt(monthRange) - 1);
    const futureShifts = shifts.filter(s => new Date(s.start_datetime) > new Date());
    let futureEnd = endOfMonth(now);
    futureShifts.forEach(s => {
      const d = parseISO(s.start_datetime);
      if (d > futureEnd) futureEnd = endOfMonth(d);
    });
    const maxFuture = endOfMonth(addMonths(now, 6));
    if (futureEnd > maxFuture) futureEnd = maxFuture;
    return eachMonthOfInterval({ start: pastStart, end: futureEnd });
  }, [monthRange, shifts]);

  const invoicedShiftIds = useMemo(() => new Set(lineItems.filter(li => li.shift_id).map(li => li.shift_id)), [lineItems]);

  const revenueData = useMemo(() => {
    const now = new Date();
    return months.map(month => {
      const monthEnd = endOfMonth(month);
      const monthInvoices = invoices.filter(inv => {
        const invDate = parseISO(inv.invoice_date);
        return isWithinInterval(invDate, { start: month, end: monthEnd });
      });
      const collected = monthInvoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.total_amount, 0);
      const outstanding = monthInvoices
        .filter(i => { const s = computeInvoiceStatus(i); return s === 'sent' || s === 'partial' || s === 'overdue'; })
        .reduce((sum, inv) => sum + (inv.balance_due ?? inv.total_amount), 0);
      const isCurrentOrFuture = month >= startOfMonth(now) && month <= endOfMonth(addMonths(now, 3));
      let anticipated = 0;
      if (isCurrentOrFuture) {
        const draftTotal = monthInvoices.filter(i => i.status === 'draft').reduce((sum, inv) => sum + inv.total_amount, 0);
        const uninvoicedShiftTotal = shifts.filter(s => {
          const shiftDate = parseISO(s.start_datetime);
          return isWithinInterval(shiftDate, { start: month, end: monthEnd }) && !invoicedShiftIds.has(s.id);
        }).reduce((sum, s) => sum + s.rate_applied, 0);
        anticipated = draftTotal + uninvoicedShiftTotal;
      }
      return { month: format(month, 'MMM yyyy'), collected, outstanding, anticipated };
    });
  }, [months, invoices, shifts, lineItems, invoicedShiftIds]);

  const revenueByFacility = useMemo(() => {
    const rangeStart = months[0];
    const rangeEnd = endOfMonth(months[months.length - 1]);
    const facilityRevenue: Record<string, number> = {};
    invoices.forEach(inv => {
      if (inv.status === 'paid') {
        const periodEnd = parseISO(inv.period_end);
        if (isWithinInterval(periodEnd, { start: rangeStart, end: rangeEnd })) {
          facilityRevenue[inv.facility_id] = (facilityRevenue[inv.facility_id] || 0) + inv.total_amount;
        }
      }
    });
    return Object.entries(facilityRevenue)
      .map(([facilityId, revenue]) => {
        const name = facilities.find(c => c.id === facilityId)?.name || 'Unknown';
        return { name: name.length > 18 ? name.slice(0, 17) + '…' : name, revenue: Math.round(revenue * 100) / 100 };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [months, invoices, facilities]);

  const totalCollected = revenueData.reduce((s, d) => s + d.collected, 0);
  const totalOutstanding = revenueData.reduce((s, d) => s + d.outstanding, 0);
  const totalAnticipated = revenueData.reduce((s, d) => s + d.anticipated, 0);
  const collectionRate = (totalCollected + totalOutstanding) > 0 ? Math.round((totalCollected / (totalCollected + totalOutstanding)) * 100) : 0;
  const outstandingInvoiceCount = invoices.filter(i => { const s = computeInvoiceStatus(i); return s === 'sent' || s === 'partial' || s === 'overdue'; }).length;

  // AI Summary
  const fetchAiSummary = useCallback(async () => {
    const totalRevenue = totalCollected + totalOutstanding;
    if (totalRevenue === 0) return;
    setAiSummaryLoading(true);
    try {
      const metrics = { periodLabel: `${monthRange} months`, totalRevenue, totalPaid: totalCollected, collectionRate };
      const { data, error } = await supabase.functions.invoke('business-summary', { body: { metrics } });
      if (error) throw error;
      if (data?.summary) setAiSummary(data.summary);
    } catch {
      toast.error('Could not generate summary');
    } finally {
      setAiSummaryLoading(false);
    }
  }, [totalCollected, totalOutstanding, monthRange, collectionRate]);

  useEffect(() => {
    if (totalCollected > 0 || totalOutstanding > 0) fetchAiSummary();
  }, [monthRange]);

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

    const now = new Date();
    const aging = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    invoices.forEach(inv => {
      const status = computeInvoiceStatus(inv);
      if ((status === 'overdue' || status === 'sent' || status === 'partial') && inv.due_date) {
        const days = differenceInDays(now, parseISO(inv.due_date));
        if (days <= 0) return;
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
      paidYTD, remaining, status,
      effectiveRate: annualEstimate.effectiveRate,
      projectedAnnualIncome,
    };
  }, [invoices, expenseData.ytdDeductibleCents, taxSettings, quarterStatuses]);

  // ── Expense Visibility ──
  const expenseMetrics = useMemo(() => {
    const { ytdExpenses, ytdTotalCents, ytdDeductibleCents, ytdByCategory, categoriesTracked } = expenseData;
    const now = new Date();
    const monthStarts = eachMonthOfInterval({ start: startOfMonth(subMonths(now, 5)), end: startOfMonth(now) });
    const monthlyTrend = monthStarts.map(m => {
      const end = endOfMonth(m);
      const total = ytdExpenses
        .filter(e => { const d = new Date(e.expense_date); return isWithinInterval(d, { start: m, end }); })
        .reduce((s, e) => s + e.amount_cents, 0);
      return { month: format(m, 'MMM'), totalCents: total };
    });
    const catEntries = Object.entries(ytdByCategory)
      .map(([key, val]) => {
        const group = EXPENSE_CATEGORIES.find(c => c.key === key);
        return { key, label: group?.label || key, ...val };
      })
      .sort((a, b) => b.totalCents - a.totalCents)
      .slice(0, 5);
    const uncategorized = ytdExpenses.filter(e => !e.category || e.category === '').length;
    const missingReceipts = ytdExpenses.filter(e => e.amount_cents > 7500 && !e.receipt_url).length;
    return { ytdTotalCents, ytdDeductibleCents, categoriesTracked, monthlyTrend, topCategories: catEntries, uncategorized, missingReceipts };
  }, [expenseData]);

  const revenueChartConfig = {
    collected: { label: 'Collected', color: 'hsl(142, 71%, 45%)' },
    outstanding: { label: 'Outstanding', color: 'hsl(38, 92%, 50%)' },
    anticipated: { label: 'Anticipated', color: 'hsl(215, 25%, 75%)' },
  };
  const revenueByFacilityConfig = { revenue: { label: 'Revenue', color: 'hsl(142, 71%, 45%)' } };
  const expenseTrendConfig = { totalCents: { label: 'Expenses', color: 'hsl(var(--primary))' } };
  const expenseCatConfig = { totalCents: { label: 'Amount', color: 'hsl(var(--primary))' } };

  return (
    <div className="space-y-6">
      {/* Section 1: Revenue Overview (inline charts, no embedded page) */}
      <Collapsible open={openSections.revenue} onOpenChange={() => toggle('revenue')}>
        <CollapsibleTrigger asChild>
          <div><SectionHeader title="Revenue Overview" icon={FileText} open={openSections.revenue} onToggle={() => toggle('revenue')} /></div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <Select value={monthRange} onValueChange={setMonthRange}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* AI Summary (compact) */}
          {(aiSummary || aiSummaryLoading) && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-md bg-primary/5 border border-primary/10">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                {aiSummaryLoading && !aiSummary ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><RefreshCw className="h-3 w-3 animate-spin" /> Analyzing…</p>
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">{aiSummary}</p>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] shrink-0" onClick={fetchAiSummary} disabled={aiSummaryLoading}>
                <RefreshCw className={`h-3 w-3 ${aiSummaryLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          )}

          {/* Monthly Revenue Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-xs mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} />
                  <span className="text-muted-foreground">Collected: <span className="font-medium text-foreground">${totalCollected.toLocaleString()}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'hsl(38, 92%, 50%)' }} />
                  <span className="text-muted-foreground">Outstanding: <span className="font-medium text-foreground">${totalOutstanding.toLocaleString()}</span></span>
                </div>
                {totalAnticipated > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm opacity-50" style={{ backgroundColor: 'hsl(215, 25%, 75%)' }} />
                    <span className="text-muted-foreground">Anticipated: <span className="font-medium text-foreground">${totalAnticipated.toLocaleString()}</span></span>
                  </div>
                )}
              </div>
              <ChartContainer config={revenueChartConfig} className="h-[250px] w-full">
                <ComposedChart data={revenueData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-muted-foreground" fontSize={11} />
                  <YAxis className="text-muted-foreground" fontSize={11} tickFormatter={v => `$${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="collected" stackId="revenue" fill="var(--color-collected)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="outstanding" stackId="revenue" fill="var(--color-outstanding)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="anticipated" stackId="revenue" fill="var(--color-anticipated)" radius={[4, 4, 0, 0]} fillOpacity={0.5} />
                </ComposedChart>
              </ChartContainer>
              <InsightCallout text={
                totalCollected > 0 || totalOutstanding > 0
                  ? `You've collected ${collectionRate}% of invoiced revenue.${totalOutstanding > 0 ? ` $${totalOutstanding.toLocaleString()} awaiting payment across ${outstandingInvoiceCount} invoice${outstandingInvoiceCount !== 1 ? 's' : ''}.` : ''}`
                  : null
              } />
            </CardContent>
          </Card>

          {/* Revenue by Facility */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Revenue by Facility</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueByFacility.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No paid invoices in this period</p>
              ) : (
                <ChartContainer config={revenueByFacilityConfig} className="h-[250px] w-full">
                  <BarChart data={revenueByFacility} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" fontSize={11} className="text-muted-foreground" tickFormatter={v => `$${v}`} />
                    <YAxis dataKey="name" type="category" fontSize={11} className="text-muted-foreground" width={110} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
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

          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/invoices')}>
            View all invoices <ArrowRight className="h-3 w-3" />
          </Button>
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

              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/tax-center?tab=tax-estimate')}>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/expenses')}>
            Manage expenses <ArrowRight className="h-3 w-3" />
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
