import { useMemo, useState, useEffect, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ComposedChart } from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, addMonths, isWithinInterval, differenceInDays, differenceInHours, getDay } from 'date-fns';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Clock, ArrowUp, ArrowDown, Minus, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const db = (table: string) => supabase.from(table as any);

const truncateName = (name: string, max = 18) =>
  name.length > max ? name.slice(0, max - 1) + '…' : name;

function DeltaBadge({ current, previous, format: fmt = 'percent' }: { current: number; previous: number; format?: 'percent' | 'value' }) {
  if (previous === 0 && current === 0) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" /> No change</span>;
  if (previous === 0) return <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"><ArrowUp className="h-3 w-3" /> New</span>;
  const delta = ((current - previous) / previous) * 100;
  const rounded = Math.abs(Math.round(delta));
  if (rounded === 0) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" /> No change</span>;
  if (delta > 0) return <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"><ArrowUp className="h-3 w-3" /> {rounded}%</span>;
  return <span className="text-xs text-red-500 flex items-center gap-0.5"><ArrowDown className="h-3 w-3" /> {rounded}%</span>;
}

function InsightCallout({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="mt-3 px-3 py-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
      💡 {text}
    </div>
  );
}

export default function ReportsPage() {
  const { shifts, invoices, facilities, lineItems } = useData();
  const { user, isDemo } = useAuth();
  const [monthRange, setMonthRange] = useState('6');
  const [taxSetAsidePercent, setTaxSetAsidePercent] = useState<number>(0);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  useEffect(() => {
    if (isDemo || !user) return;
    const currentYear = new Date().getFullYear();
    db('tax_settings')
      .select('set_aside_mode, set_aside_percent, set_aside_fixed_monthly')
      .eq('user_id', user.id)
      .eq('tax_year', currentYear)
      .maybeSingle()
      .then(({ data }: { data: any }) => {
        if (data && data.set_aside_mode === 'percent') {
          setTaxSetAsidePercent(data.set_aside_percent || 0);
        }
      });
  }, [user, isDemo]);

  const months = useMemo(() => {
    const now = new Date();
    const pastStart = subMonths(startOfMonth(now), parseInt(monthRange) - 1);
    const futureShifts = shifts.filter(s => s.status === 'proposed' || s.status === 'booked');
    let futureEnd = endOfMonth(now);
    futureShifts.forEach(s => {
      const d = parseISO(s.start_datetime);
      if (d > futureEnd) futureEnd = endOfMonth(d);
    });
    const maxFuture = endOfMonth(addMonths(now, 6));
    if (futureEnd > maxFuture) futureEnd = maxFuture;
    return eachMonthOfInterval({ start: pastStart, end: futureEnd });
  }, [monthRange, shifts]);

  // Previous period months for comparison
  const prevMonths = useMemo(() => {
    const rangeNum = parseInt(monthRange);
    const pastStart = months[0];
    const prevStart = subMonths(pastStart, rangeNum);
    const prevEnd = subMonths(pastStart, 1);
    if (prevEnd < prevStart) return [];
    return eachMonthOfInterval({ start: prevStart, end: endOfMonth(prevEnd) });
  }, [months, monthRange]);

  const revenueData = useMemo(() => {
    const now = new Date();
    // Build set of shift IDs that are already on any invoice
    const invoicedShiftIds = new Set(
      lineItems.filter(li => li.shift_id).map(li => li.shift_id)
    );

    return months.map(month => {
      const monthEnd = endOfMonth(month);
      const monthInvoices = invoices.filter(inv => {
        const periodEnd = parseISO(inv.period_end);
        return isWithinInterval(periodEnd, { start: month, end: monthEnd });
      });

      const collected = monthInvoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.total_amount, 0);

      const outstanding = monthInvoices
        .filter(i => {
          const s = computeInvoiceStatus(i);
          return s === 'sent' || s === 'partial' || s === 'overdue';
        })
        .reduce((sum, inv) => sum + (inv.balance_due ?? inv.total_amount), 0);

      // Anticipated income: only for the current month
      const isCurrentMonth = format(month, 'yyyy-MM') === format(now, 'yyyy-MM');
      let anticipated = 0;
      if (isCurrentMonth) {
        const draftTotal = monthInvoices
          .filter(i => i.status === 'draft')
          .reduce((sum, inv) => sum + inv.total_amount, 0);

        const uninvoicedShiftTotal = shifts.filter(s => {
          const shiftDate = parseISO(s.start_datetime);
          return isWithinInterval(shiftDate, { start: month, end: monthEnd }) &&
            (s.status === 'proposed' || s.status === 'booked') &&
            !invoicedShiftIds.has(s.id);
        }).reduce((sum, s) => sum + s.rate_applied, 0);

        anticipated = draftTotal + uninvoicedShiftTotal;
      }

      return {
        month: format(month, 'MMM yyyy'),
        collected,
        outstanding,
        anticipated,
        isCurrentMonth,
      };
    });
  }, [months, invoices, shifts, lineItems]);

  // Previous period revenue for comparison
  const prevRevenue = useMemo(() => {
    if (prevMonths.length === 0) return { total: 0, paid: 0, shifts: 0 };
    const rangeStart = prevMonths[0];
    const rangeEnd = endOfMonth(prevMonths[prevMonths.length - 1]);
    let total = 0, paid = 0, shiftCount = 0;
    invoices.forEach(inv => {
      const periodEnd = parseISO(inv.period_end);
      if (isWithinInterval(periodEnd, { start: rangeStart, end: rangeEnd })) {
        total += inv.total_amount;
        if (inv.status === 'paid') paid += inv.total_amount;
      }
    });
    shifts.forEach(shift => {
      const shiftDate = parseISO(shift.start_datetime);
      if (isWithinInterval(shiftDate, { start: rangeStart, end: rangeEnd }) && shift.status !== 'canceled') {
        shiftCount++;
      }
    });
    return { total, paid, shifts: shiftCount };
  }, [prevMonths, invoices, shifts]);

  const shiftsPerFacility = useMemo(() => {
    const counts: Record<string, number> = {};
    const rangeStart = months[0];
    const rangeEnd = endOfMonth(months[months.length - 1]);
    shifts.forEach(shift => {
      const shiftDate = parseISO(shift.start_datetime);
      if (isWithinInterval(shiftDate, { start: rangeStart, end: rangeEnd }) && shift.status !== 'canceled') {
        counts[shift.facility_id] = (counts[shift.facility_id] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([facilityId, count]) => ({
        name: truncateName(facilities.find(c => c.id === facilityId)?.name || 'Unknown'),
        shifts: count,
      }))
      .sort((a, b) => b.shifts - a.shifts);
  }, [months, shifts, facilities]);

  const facilityPaymentSpeed = useMemo(() => {
    const facilityDays: Record<string, number[]> = {};
    invoices.forEach(inv => {
      if (inv.status === 'paid' && inv.sent_at && inv.paid_at) {
        const days = differenceInDays(parseISO(inv.paid_at), parseISO(inv.sent_at));
        if (days >= 0) {
          if (!facilityDays[inv.facility_id]) facilityDays[inv.facility_id] = [];
          facilityDays[inv.facility_id].push(days);
        }
      }
    });
    return Object.entries(facilityDays)
      .map(([facilityId, days]) => ({
        name: truncateName(facilities.find(c => c.id === facilityId)?.name || 'Unknown'),
        avgDays: Math.round(days.reduce((a, b) => a + b, 0) / days.length),
      }))
      .sort((a, b) => a.avgDays - b.avgDays);
  }, [invoices, facilities]);

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
      .map(([facilityId, revenue]) => ({
        name: truncateName(facilities.find(c => c.id === facilityId)?.name || 'Unknown'),
        revenue: Math.round(revenue * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [months, invoices, facilities]);

  const avgRatePerFacility = useMemo(() => {
    const rangeStart = months[0];
    const rangeEnd = endOfMonth(months[months.length - 1]);
    const facilityRates: Record<string, number[]> = {};
    shifts.forEach(shift => {
      const shiftDate = parseISO(shift.start_datetime);
      if (isWithinInterval(shiftDate, { start: rangeStart, end: rangeEnd }) && shift.status !== 'canceled' && shift.rate_applied > 0) {
        if (!facilityRates[shift.facility_id]) facilityRates[shift.facility_id] = [];
        facilityRates[shift.facility_id].push(shift.rate_applied);
      }
    });
    return Object.entries(facilityRates)
      .map(([facilityId, rates]) => ({
        name: truncateName(facilities.find(c => c.id === facilityId)?.name || 'Unknown'),
        avgRate: Math.round(rates.reduce((a, b) => a + b, 0) / rates.length),
      }))
      .sort((a, b) => b.avgRate - a.avgRate);
  }, [months, shifts, facilities]);

  const earningsByDayOfWeek = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const rangeStart = months[0];
    const rangeEnd = endOfMonth(months[months.length - 1]);
    shifts.forEach(shift => {
      const shiftDate = parseISO(shift.start_datetime);
      if (isWithinInterval(shiftDate, { start: rangeStart, end: rangeEnd }) && shift.status !== 'canceled' && shift.rate_applied > 0) {
        const day = getDay(shiftDate);
        dayTotals[day] += shift.rate_applied;
        dayCounts[day] += 1;
      }
    });
    return dayNames.map((name, i) => ({
      day: name,
      total: Math.round(dayTotals[i]),
      shifts: dayCounts[i],
      avg: dayCounts[i] > 0 ? Math.round(dayTotals[i] / dayCounts[i]) : 0,
    }));
  }, [months, shifts]);

  const monthlyHoursWorked = useMemo(() => {
    return months.map(month => {
      const monthEnd = endOfMonth(month);
      let totalHours = 0;
      shifts.forEach(shift => {
        const shiftDate = parseISO(shift.start_datetime);
        if (isWithinInterval(shiftDate, { start: month, end: monthEnd }) && shift.status !== 'canceled') {
          const hours = differenceInHours(parseISO(shift.end_datetime), parseISO(shift.start_datetime));
          if (hours > 0) totalHours += hours;
        }
      });
      return { month: format(month, 'MMM yyyy'), hours: totalHours };
    });
  }, [months, shifts]);

  const totalCollected = revenueData.reduce((s, d) => s + d.collected, 0);
  const totalOutstanding = revenueData.reduce((s, d) => s + d.outstanding, 0);
  const totalPipeline = revenueData.reduce((s, d) => s + d.pipeline, 0);
  const totalRevenue = totalCollected + totalOutstanding;
  const totalPaid = totalCollected;
  const totalShifts = shiftsPerFacility.reduce((s, d) => s + d.shifts, 0);
  const totalHoursWorked = monthlyHoursWorked.reduce((s, d) => s + d.hours, 0);
  const effectiveRate = totalHoursWorked > 0 ? Math.round((totalPaid / totalHoursWorked) * 100) / 100 : 0;
  const collectionRate = (totalCollected + totalOutstanding) > 0 ? Math.round((totalCollected / (totalCollected + totalOutstanding)) * 100) : 0;
  const outstandingInvoiceCount = invoices.filter(i => { const s = computeInvoiceStatus(i); return s === 'sent' || s === 'partial' || s === 'overdue'; }).length;

  // Insight strings
  const paymentSpeedInsight = useMemo(() => {
    if (facilityPaymentSpeed.length === 0) return null;
    const fastest = facilityPaymentSpeed[0];
    if (facilityPaymentSpeed.length === 1) return `${fastest.name} pays in ${fastest.avgDays} days on average`;
    return `Fastest payer: ${fastest.name} (${fastest.avgDays} days avg)`;
  }, [facilityPaymentSpeed]);

  const revenueConcentrationInsight = useMemo(() => {
    if (revenueByFacility.length === 0) return null;
    const totalRev = revenueByFacility.reduce((s, d) => s + d.revenue, 0);
    if (totalRev === 0) return null;
    const top = revenueByFacility[0];
    const pct = Math.round((top.revenue / totalRev) * 100);
    return `${top.name} accounts for ${pct}% of your revenue`;
  }, [revenueByFacility]);

  const bestDayInsight = useMemo(() => {
    const withEarnings = earningsByDayOfWeek.filter(d => d.shifts > 0);
    if (withEarnings.length === 0) return null;
    const best = withEarnings.reduce((a, b) => b.avg > a.avg ? b : a);
    return `Your highest-earning day is ${best.day} — averaging $${best.avg}/shift`;
  }, [earningsByDayOfWeek]);

  const avgRateInsight = useMemo(() => {
    if (avgRatePerFacility.length === 0) return null;
    const top = avgRatePerFacility[0];
    return `${top.name} has your highest avg rate at $${top.avgRate}`;
  }, [avgRatePerFacility]);

  const fetchAiSummary = useCallback(async () => {
    if (totalRevenue === 0 && totalShifts === 0) return;
    setAiSummaryLoading(true);
    try {
      const prevTotal = prevRevenue.total;
      const revDelta = prevTotal === 0 ? 'N/A' : `${Math.round(((totalRevenue - prevTotal) / prevTotal) * 100)}%`;
      const prevShiftsVal = prevRevenue.shifts;
      const shiftsDelta = prevShiftsVal === 0 ? 'N/A' : `${Math.round(((totalShifts - prevShiftsVal) / prevShiftsVal) * 100)}%`;
      const metrics = {
        periodLabel: `${monthRange} months`,
        totalRevenue,
        totalPaid,
        collectionRate: totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0,
        revenueDelta: revDelta,
        totalShifts,
        shiftsDelta,
        effectiveRate,
        totalHours: totalHoursWorked,
        fastestPayer: facilityPaymentSpeed.length > 0 ? `${facilityPaymentSpeed[0].name} (${facilityPaymentSpeed[0].avgDays}d)` : null,
        topRevenueFacility: revenueByFacility.length > 0 ? revenueByFacility[0].name : null,
        bestDay: bestDayInsight,
      };
      const { data, error } = await supabase.functions.invoke('business-summary', { body: { metrics } });
      if (error) throw error;
      if (data?.summary) setAiSummary(data.summary);
    } catch (e: any) {
      console.error('AI summary error:', e);
      toast.error('Could not generate summary');
    } finally {
      setAiSummaryLoading(false);
    }
  }, [totalRevenue, totalPaid, totalShifts, effectiveRate, totalHoursWorked, monthRange, prevRevenue, facilityPaymentSpeed, revenueByFacility, bestDayInsight]);

  useEffect(() => {
    if (totalRevenue > 0 || totalShifts > 0) {
      fetchAiSummary();
    }
  }, [monthRange]);

  const revenueChartConfig = {
    collected: { label: 'Collected', color: 'hsl(142, 71%, 45%)' },
    outstanding: { label: 'Outstanding', color: 'hsl(38, 92%, 50%)' },
    pipeline: { label: 'Pipeline', color: 'hsl(215, 25%, 75%)' },
    cumulativeCollected: { label: 'Cumulative Collected', color: 'hsl(142, 71%, 35%)' },
  };

  const paymentSpeedConfig = {
    avgDays: { label: 'Avg Days to Pay', color: 'hsl(173, 58%, 39%)' },
  };

  const revenueByFacilityConfig = {
    revenue: { label: 'Revenue', color: 'hsl(142, 71%, 45%)' },
  };

  const shiftsChartConfig = {
    shifts: { label: 'Shifts', color: 'hsl(215, 25%, 27%)' },
  };

  const avgRateConfig = {
    avgRate: { label: 'Avg Rate', color: 'hsl(38, 92%, 50%)' },
  };

  const earningsByDayConfig = {
    total: { label: 'Total Earnings', color: 'hsl(260, 50%, 55%)' },
  };

  const monthlyHoursConfig = {
    hours: { label: 'Hours Worked', color: 'hsl(173, 58%, 39%)' },
  };

  return (
    <div className="space-y-6">
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

      {/* AI Business Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-md bg-primary/10 mt-0.5">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-foreground">AI Business Summary</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={fetchAiSummary}
                  disabled={aiSummaryLoading}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${aiSummaryLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              {aiSummaryLoading && !aiSummary ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Analyzing your business data…
                </div>
              ) : aiSummary ? (
                <p className="text-sm text-muted-foreground leading-relaxed">{aiSummary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Add shifts and invoices to get your AI-powered business summary.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards with period-over-period deltas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <DeltaBadge current={totalRevenue} previous={prevRevenue.total} />
              <span className="text-xs text-muted-foreground">vs prev {monthRange}mo</span>
            </div>
            {totalPipeline > 0 && (
              <p className="text-xs text-muted-foreground mt-1">+ ${totalPipeline.toLocaleString()} pipeline</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPaid.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <DeltaBadge current={totalPaid} previous={prevRevenue.paid} />
              <span className="text-xs text-muted-foreground">{totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0}% rate</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalShifts}</div>
            <div className="flex items-center gap-2 mt-1">
              <DeltaBadge current={totalShifts} previous={prevRevenue.shifts} />
              <span className="text-xs text-muted-foreground">vs prev {monthRange}mo</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Effective Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${effectiveRate.toLocaleString()}/hr</div>
            <p className="text-xs text-muted-foreground mt-1">{totalHoursWorked}h worked · {totalPaid > 0 ? 'from collected' : 'no payments yet'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue — full width */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue</CardTitle>
          <CardDescription>Collected, outstanding, and pipeline revenue at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary legend row */}
          <div className="flex flex-wrap gap-6 text-sm mb-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} />
              <span className="text-muted-foreground">Collected:</span>
              <span className="font-semibold">${totalCollected.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(38, 92%, 50%)' }} />
              <span className="text-muted-foreground">Outstanding:</span>
              <span className="font-semibold">${totalOutstanding.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm opacity-50" style={{ backgroundColor: 'hsl(215, 25%, 75%)' }} />
              <span className="text-muted-foreground">Pipeline:</span>
              <span className="font-semibold">${totalPipeline.toLocaleString()}</span>
            </div>
          </div>
          <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
            <ComposedChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-muted-foreground" fontSize={12} />
              <YAxis yAxisId="left" className="text-muted-foreground" fontSize={12} tickFormatter={v => `$${v}`} />
              <YAxis yAxisId="right" orientation="right" className="text-muted-foreground" fontSize={12} tickFormatter={v => `$${v}`} hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar yAxisId="left" dataKey="collected" stackId="revenue" fill="var(--color-collected)" radius={[0, 0, 0, 0]} />
              <Bar yAxisId="left" dataKey="outstanding" stackId="revenue" fill="var(--color-outstanding)" radius={[0, 0, 0, 0]} />
              <Bar yAxisId="left" dataKey="pipeline" stackId="revenue" fill="var(--color-pipeline)" radius={[4, 4, 0, 0]} fillOpacity={0.5} strokeDasharray="4 2" stroke="var(--color-pipeline)" />
              <Line yAxisId="left" type="monotone" dataKey="cumulativeCollected" stroke="var(--color-cumulativeCollected)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ChartContainer>
          {/* Insight callout */}
          <InsightCallout text={
            totalCollected > 0 || totalOutstanding > 0
              ? `You've collected ${collectionRate}% of invoiced revenue.${totalOutstanding > 0 ? ` $${totalOutstanding.toLocaleString()} is awaiting payment across ${outstandingInvoiceCount} invoice${outstandingInvoiceCount !== 1 ? 's' : ''}.` : ''}${totalPipeline > 0 ? ` Pipeline shows $${totalPipeline.toLocaleString()} in upcoming work.` : ''}`
              : null
          } />
        </CardContent>
      </Card>

      {/* Row 1: Payment Speed + Revenue by Facility */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Facility Payment Speed</CardTitle>
            <CardDescription>Average days from invoice sent to payment received</CardDescription>
          </CardHeader>
          <CardContent>
            {facilityPaymentSpeed.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                No paid invoices with sent dates yet
              </div>
            ) : (
              <ChartContainer config={paymentSpeedConfig} className="h-[300px] w-full">
                <BarChart data={facilityPaymentSpeed} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" fontSize={12} className="text-muted-foreground" tickFormatter={v => `${v}d`} />
                  <YAxis dataKey="name" type="category" fontSize={12} className="text-muted-foreground" width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="avgDays" fill="var(--color-avgDays)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
            <InsightCallout text={paymentSpeedInsight} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Facility</CardTitle>
            <CardDescription>Total paid revenue per facility in this period</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueByFacility.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                No paid invoices in this period
              </div>
            ) : (
              <ChartContainer config={revenueByFacilityConfig} className="h-[300px] w-full">
                <BarChart data={revenueByFacility} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" fontSize={12} className="text-muted-foreground" tickFormatter={v => `$${v}`} />
                  <YAxis dataKey="name" type="category" fontSize={12} className="text-muted-foreground" width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
            <InsightCallout text={revenueConcentrationInsight} />
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Shifts per Facility + Avg Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Shifts per Facility</CardTitle>
            <CardDescription>Distribution of shifts across facilities</CardDescription>
          </CardHeader>
          <CardContent>
            {shiftsPerFacility.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                No shifts in this period
              </div>
            ) : (
              <ChartContainer config={shiftsChartConfig} className="h-[300px] w-full">
                <BarChart data={shiftsPerFacility} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" fontSize={12} className="text-muted-foreground" />
                  <YAxis dataKey="name" type="category" fontSize={12} className="text-muted-foreground" width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="shifts" fill="var(--color-shifts)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg Rate per Facility</CardTitle>
            <CardDescription>Average shift rate across your facilities</CardDescription>
          </CardHeader>
          <CardContent>
            {avgRatePerFacility.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                No shifts with rates in this period
              </div>
            ) : (
              <ChartContainer config={avgRateConfig} className="h-[300px] w-full">
                <BarChart data={avgRatePerFacility} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" fontSize={12} className="text-muted-foreground" tickFormatter={v => `$${v}`} />
                  <YAxis dataKey="name" type="category" fontSize={12} className="text-muted-foreground" width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="avgRate" fill="var(--color-avgRate)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
            <InsightCallout text={avgRateInsight} />
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Earnings by Day of Week + Monthly Hours Worked */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Earnings by Day of Week</CardTitle>
            <CardDescription>Which days are most profitable for scheduling</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={earningsByDayConfig} className="h-[300px] w-full">
              <BarChart data={earningsByDayOfWeek} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" fontSize={12} className="text-muted-foreground" />
                <YAxis fontSize={12} className="text-muted-foreground" tickFormatter={v => `$${v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
            <InsightCallout text={bestDayInsight} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Hours Worked</CardTitle>
            <CardDescription>Total shift hours per month over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={monthlyHoursConfig} className="h-[300px] w-full">
              <LineChart data={monthlyHoursWorked} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" fontSize={12} className="text-muted-foreground" />
                <YAxis fontSize={12} className="text-muted-foreground" tickFormatter={v => `${v}h`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="hours" stroke="var(--color-hours)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
