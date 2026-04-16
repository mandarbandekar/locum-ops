import { useMemo, useState, useEffect, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, AreaChart, Area } from 'recharts';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO, startOfMonth, eachMonthOfInterval, subMonths, endOfMonth, isWithinInterval, addMonths } from 'date-fns';
import { toast } from 'sonner';

const fmtAmount = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function InsightCallout({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="mt-3 px-3 py-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
      💡 {text}
    </div>
  );
}

export default function FinancialHealthTab() {
  const { invoices, facilities, shifts, lineItems } = useData();
  const { isDemo } = useAuth();

  const [monthRange, setMonthRange] = useState('6');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  // ── Revenue charts ──
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

  const revenueChartConfig = {
    collected: { label: 'Collected', color: 'hsl(142, 71%, 45%)' },
    outstanding: { label: 'Outstanding', color: 'hsl(38, 92%, 50%)' },
    anticipated: { label: 'Anticipated', color: 'hsl(215, 25%, 75%)' },
  };
  const revenueByFacilityConfig = { revenue: { label: 'Revenue', color: 'hsl(142, 71%, 45%)' } };
  const cumulativeEarningsConfig = { total: { label: 'Cumulative Earnings', color: 'hsl(var(--primary))' } };

  const cumulativeData = useMemo(() => {
    let running = 0;
    return revenueData.map(d => {
      running += d.collected + d.outstanding + d.anticipated;
      return { month: d.month, total: Math.round(running * 100) / 100 };
    });
  }, [revenueData]);

  return (
    <div className="space-y-4">
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

      {/* Total Earnings (Cumulative) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Total Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          {cumulativeData.length === 0 || cumulativeData[cumulativeData.length - 1].total === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No earnings data yet</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                Cumulative total: <span className="font-medium text-foreground">{fmtAmount(cumulativeData[cumulativeData.length - 1].total)}</span>
              </p>
              <ChartContainer config={cumulativeEarningsConfig} className="h-[220px] w-full">
                <AreaChart data={cumulativeData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="totalEarningsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-muted-foreground" fontSize={11} />
                  <YAxis className="text-muted-foreground" fontSize={11} tickFormatter={v => `$${v.toLocaleString()}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#totalEarningsGrad)" />
                </AreaChart>
              </ChartContainer>
            </>
          )}
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
    </div>
  );
}
