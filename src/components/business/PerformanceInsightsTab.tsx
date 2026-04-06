import { useMemo, useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Zap, TrendingUp, Pencil, CheckCircle2, Info, Calendar as CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, addMonths, isWithinInterval, differenceInDays, differenceInHours, getDay } from 'date-fns';

const db = (table: string) => supabase.from(table as any);

const truncateName = (name: string, max = 18) =>
  name.length > max ? name.slice(0, max - 1) + '…' : name;

function InsightCallout({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="mt-3 px-3 py-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
      💡 {text}
    </div>
  );
}

// ── Production-to-Pay Onboarding ──
function ProductionOnboarding({ onComplete }: { onComplete: (cents: number) => void }) {
  const [step, setStep] = useState(0);
  const [dailyProduction, setDailyProduction] = useState('');

  const handleSubmit = () => {
    const val = parseFloat(dailyProduction);
    if (!val || val <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    onComplete(Math.round(val * 100));
  };

  if (step === 0) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="py-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-base">Unlock Your Production-to-Pay Ratio</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The <span className="font-medium text-foreground">5x Rule</span> says a relief vet should produce at least 5× their day rate in clinic revenue.
                If you're producing 6× or 7×, you have objective proof to negotiate a higher rate or production bonus.
              </p>
              <p className="text-sm text-muted-foreground">
                To calculate this, we need one number: the average daily revenue you generate for a clinic.
              </p>
            </div>
          </div>
          <Button onClick={() => setStep(1)} className="ml-11">
            Set Up My Ratio
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="py-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-3 flex-1">
            <h3 className="font-semibold text-base">What's Your Average Daily Production?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Estimate the total revenue you generate for a clinic on a typical work day — including exams, procedures, labs, and imaging.
              Most relief vets produce between <span className="font-medium text-foreground">$3,000 – $8,000/day</span>.
            </p>
            <div className="flex items-center gap-3 max-w-sm">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  placeholder="e.g. 5000"
                  value={dailyProduction}
                  onChange={e => setDailyProduction(e.target.value)}
                  className="pl-7"
                />
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">per day</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={!dailyProduction}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Save & Calculate
              </Button>
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Production-to-Pay Hero Card ──
function ProductionToPayCard({
  dailyProductionCents,
  avgDayRate,
  onEdit,
}: {
  dailyProductionCents: number;
  avgDayRate: number;
  onEdit: () => void;
}) {
  const production = dailyProductionCents / 100;
  const ratio = avgDayRate > 0 ? production / avgDayRate : 0;
  const ratioDisplay = ratio.toFixed(1);

  let status: 'excellent' | 'good' | 'below';
  let statusLabel: string;
  let statusColor: string;
  let insight: string;

  if (ratio >= 6) {
    status = 'excellent';
    statusLabel = 'Strong Leverage';
    statusColor = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
    insight = `You're producing ${ratioDisplay}× your pay — well above the 5× benchmark. You have strong grounds to negotiate a higher rate or production bonus.`;
  } else if (ratio >= 5) {
    status = 'good';
    statusLabel = 'On Target';
    statusColor = 'bg-primary/10 text-primary';
    insight = `You're at ${ratioDisplay}× — right at the industry benchmark. Consider tracking this over time to build a case for rate increases.`;
  } else if (ratio > 0) {
    status = 'below';
    statusLabel = 'Below Benchmark';
    statusColor = 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
    insight = `Your ratio is ${ratioDisplay}× — below the 5× target. This could mean your rate is already competitive, or there's room to increase production.`;
  } else {
    status = 'below';
    statusLabel = 'Need Shift Data';
    statusColor = 'bg-muted text-muted-foreground';
    insight = 'Add shifts with rates to calculate your production-to-pay ratio.';
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Production-to-Pay Ratio</h3>
                <Badge className={`text-[10px] px-1.5 py-0 font-medium ${statusColor}`}>
                  {statusLabel}
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight">{ratio > 0 ? `${ratioDisplay}×` : '—'}</span>
                <span className="text-sm text-muted-foreground">your day rate</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                <span>Daily production: <span className="font-medium text-foreground">${production.toLocaleString()}</span></span>
                <span>Avg day rate: <span className="font-medium text-foreground">${avgDayRate > 0 ? avgDayRate.toLocaleString() : '—'}</span></span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={onEdit}>
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>
        <div className="mt-3 px-3 py-2 rounded-md bg-muted/50 text-xs text-muted-foreground flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{insight}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PerformanceInsightsTab() {
  const { shifts, invoices, facilities, lineItems } = useData();
  const { user, isDemo } = useAuth();
  const [monthRange, setMonthRange] = useState('6');

  // Production benchmark state
  const [benchmark, setBenchmark] = useState<{ avg_daily_production_cents: number; onboarding_completed: boolean } | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (isDemo) {
      setBenchmark({ avg_daily_production_cents: 500000, onboarding_completed: true });
      setBenchmarkLoading(false);
      return;
    }
    if (!user) return;
    db('production_benchmarks')
      .select('avg_daily_production_cents, onboarding_completed')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) setBenchmark(data);
        setBenchmarkLoading(false);
      });
  }, [user?.id, isDemo]);

  const saveBenchmark = async (cents: number) => {
    if (isDemo) {
      setBenchmark({ avg_daily_production_cents: cents, onboarding_completed: true });
      setEditing(false);
      toast.success('Production benchmark saved');
      return;
    }
    if (!user) return;
    const payload = { user_id: user.id, avg_daily_production_cents: cents, onboarding_completed: true };
    const { error } = await db('production_benchmarks').upsert(payload as any, { onConflict: 'user_id' });
    if (error) {
      toast.error('Could not save benchmark');
      return;
    }
    setBenchmark({ avg_daily_production_cents: cents, onboarding_completed: true });
    setEditing(false);
    toast.success('Production benchmark saved');
  };

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

  // Avg day rate from shifts
  const avgDayRate = useMemo(() => {
    const rangeStart = months[0];
    const rangeEnd = endOfMonth(months[months.length - 1]);
    const rates = shifts
      .filter(s => {
        const d = parseISO(s.start_datetime);
        return isWithinInterval(d, { start: rangeStart, end: rangeEnd }) && s.rate_applied > 0;
      })
      .map(s => s.rate_applied);
    if (rates.length === 0) return 0;
    return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  }, [months, shifts]);

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

  const shiftsPerFacility = useMemo(() => {
    const counts: Record<string, number> = {};
    const rangeStart = months[0];
    const rangeEnd = endOfMonth(months[months.length - 1]);
    shifts.forEach(shift => {
      const shiftDate = parseISO(shift.start_datetime);
      if (isWithinInterval(shiftDate, { start: rangeStart, end: rangeEnd })) {
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

  const avgRatePerFacility = useMemo(() => {
    const rangeStart = months[0];
    const rangeEnd = endOfMonth(months[months.length - 1]);
    const facilityRates: Record<string, number[]> = {};
    shifts.forEach(shift => {
      const shiftDate = parseISO(shift.start_datetime);
      if (isWithinInterval(shiftDate, { start: rangeStart, end: rangeEnd }) && shift.rate_applied > 0) {
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
      if (isWithinInterval(shiftDate, { start: rangeStart, end: rangeEnd }) && shift.rate_applied > 0) {
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
        if (isWithinInterval(shiftDate, { start: month, end: monthEnd })) {
          const hours = differenceInHours(parseISO(shift.end_datetime), parseISO(shift.start_datetime));
          if (hours > 0) totalHours += hours;
        }
      });
      return { month: format(month, 'MMM yyyy'), hours: totalHours };
    });
  }, [months, shifts]);

  // Insights
  const paymentSpeedInsight = useMemo(() => {
    if (facilityPaymentSpeed.length === 0) return null;
    const fastest = facilityPaymentSpeed[0];
    if (facilityPaymentSpeed.length === 1) return `${fastest.name} pays in ${fastest.avgDays} days on average`;
    return `Fastest payer: ${fastest.name} (${fastest.avgDays} days avg)`;
  }, [facilityPaymentSpeed]);

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

  const paymentSpeedConfig = { avgDays: { label: 'Avg Days to Pay', color: 'hsl(173, 58%, 39%)' } };
  const shiftsChartConfig = { shifts: { label: 'Shifts', color: 'hsl(215, 25%, 27%)' } };
  const avgRateConfig = { avgRate: { label: 'Avg Rate', color: 'hsl(38, 92%, 50%)' } };
  const earningsByDayConfig = { total: { label: 'Total Earnings', color: 'hsl(260, 50%, 55%)' } };
  const monthlyHoursConfig = { hours: { label: 'Hours Worked', color: 'hsl(173, 58%, 39%)' } };

  const showOnboarding = !benchmarkLoading && (!benchmark?.onboarding_completed || editing);

  return (
    <div className="space-y-6">
      {/* Production-to-Pay Ratio — Top Metric */}
      {benchmarkLoading ? null : showOnboarding ? (
        <ProductionOnboarding onComplete={saveBenchmark} />
      ) : benchmark ? (
        <ProductionToPayCard
          dailyProductionCents={benchmark.avg_daily_production_cents}
          avgDayRate={avgDayRate}
          onEdit={() => setEditing(true)}
        />
      ) : null}

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

      {/* ── Section: Rate & Payment Analysis ── */}
      <div className="flex items-center gap-2 pt-2">
        <div className="p-1.5 rounded-md bg-primary/10">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-base font-semibold">Rate & Payment Analysis</h2>
      </div>

      {/* Facility Payment Speed */}
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

      {/* ── Section: Work Distribution ── */}
      <div className="flex items-center gap-2 pt-2">
        <div className="p-1.5 rounded-md bg-primary/10">
          <CalendarDays className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-base font-semibold">Work Distribution</h2>
      </div>

      {/* Shifts per Facility + Avg Rate */}
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

      {/* Earnings by Day of Week + Monthly Hours Worked */}
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
