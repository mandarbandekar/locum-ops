import { useMemo, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { TrendingUp, Calendar as CalendarDays } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, addMonths, isWithinInterval, differenceInDays, differenceInHours, getDay } from 'date-fns';
import { getBillableMinutes } from '@/lib/shiftBreak';

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

export default function PerformanceInsightsTab() {
  const { shifts, invoices, facilities } = useData();
  const [monthRange, setMonthRange] = useState('6');

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
          const hours = getBillableMinutes(shift) / 60;
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
