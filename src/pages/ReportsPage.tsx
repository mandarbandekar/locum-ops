import { useMemo, useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, addMonths, isWithinInterval, differenceInDays, differenceInHours, getDay } from 'date-fns';
import { DollarSign, TrendingUp, Calendar, Building2 } from 'lucide-react';

const db = (table: string) => supabase.from(table as any);

export default function ReportsPage() {
  const { shifts, invoices, facilities } = useData();
  const { user, isDemo } = useAuth();
  const [monthRange, setMonthRange] = useState('6');
  const [taxSetAsidePercent, setTaxSetAsidePercent] = useState<number>(0);

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

  const revenueData = useMemo(() => {
    return months.map(month => {
      const monthEnd = endOfMonth(month);
      const monthInvoices = invoices.filter(inv => {
        const periodEnd = parseISO(inv.period_end);
        return isWithinInterval(periodEnd, { start: month, end: monthEnd });
      });
      const total = monthInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      const paid = monthInvoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.total_amount, 0);
      const outstanding = total - paid;

      const invoicedShiftIds = new Set(
        monthInvoices.flatMap(inv => (inv as any).line_items?.map((li: any) => li.shift_id) || [])
      );
      const anticipatedShifts = shifts.filter(s => {
        const shiftDate = parseISO(s.start_datetime);
        return isWithinInterval(shiftDate, { start: month, end: monthEnd }) &&
          (s.status === 'proposed' || s.status === 'booked') &&
          !invoicedShiftIds.has(s.id);
      });
      const anticipated = anticipatedShifts.reduce((sum, s) => sum + s.rate_applied, 0);

      const anticipatedTax = taxSetAsidePercent > 0
        ? Math.round((taxSetAsidePercent / 100) * anticipated * 100) / 100
        : 0;

      return { month: format(month, 'MMM yyyy'), total, paid, outstanding, anticipated, anticipatedTax };
    });
  }, [months, invoices, shifts, taxSetAsidePercent]);

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
        name: facilities.find(c => c.id === facilityId)?.name || 'Unknown',
        shifts: count,
      }))
      .sort((a, b) => b.shifts - a.shifts);
  }, [months, shifts, facilities]);

  // Facility Payment Speed: avg days from sent_at to paid_at
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
        name: facilities.find(c => c.id === facilityId)?.name || 'Unknown',
        avgDays: Math.round(days.reduce((a, b) => a + b, 0) / days.length),
      }))
      .sort((a, b) => a.avgDays - b.avgDays);
  }, [invoices, facilities]);

  // Revenue by Facility: total paid amount
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
        name: facilities.find(c => c.id === facilityId)?.name || 'Unknown',
        revenue: Math.round(revenue * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [months, invoices, facilities]);

  // Avg Rate per Facility
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
        name: facilities.find(c => c.id === facilityId)?.name || 'Unknown',
        avgRate: Math.round(rates.reduce((a, b) => a + b, 0) / rates.length),
      }))
      .sort((a, b) => b.avgRate - a.avgRate);
  }, [months, shifts, facilities]);

  // Earnings by Day of Week
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

  // Monthly Hours Worked
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

  const totalRevenue = revenueData.reduce((s, d) => s + d.total, 0);
  const totalPaid = revenueData.reduce((s, d) => s + d.paid, 0);
  const totalShifts = shiftsPerFacility.reduce((s, d) => s + d.shifts, 0);
  const activeFacilities = shiftsPerFacility.length;
  const totalAnticipated = revenueData.reduce((s, d) => s + d.anticipated, 0);

  const revenueChartConfig = {
    paid: { label: 'Paid', color: 'hsl(142, 71%, 45%)' },
    outstanding: { label: 'Outstanding', color: 'hsl(38, 92%, 50%)' },
    anticipated: { label: 'Anticipated Income', color: 'hsl(215, 25%, 75%)' },
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{monthRange}-month period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0}% collection rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalShifts}</div>
            <p className="text-xs text-muted-foreground">Non-canceled shifts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Facilities</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeFacilities}</div>
            <p className="text-xs text-muted-foreground">With shifts in period</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue — full width */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue</CardTitle>
          <CardDescription>Paid vs outstanding invoice amounts · anticipated income shown separately</CardDescription>
        </CardHeader>
        <CardContent>
          {totalAnticipated > 0 && (
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-2">
              <span>Anticipated income: <span className="font-semibold">${totalAnticipated.toLocaleString()}</span></span>
              <span className="italic">(not included in Total Revenue)</span>
            </div>
          )}
          <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
            <BarChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-muted-foreground" fontSize={12} />
              <YAxis className="text-muted-foreground" fontSize={12} tickFormatter={v => `$${v}`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="paid" stackId="a" fill="var(--color-paid)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="outstanding" stackId="a" fill="var(--color-outstanding)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="anticipated" fill="var(--color-anticipated)" radius={[4, 4, 0, 0]} fillOpacity={0.5} strokeDasharray="4 2" stroke="var(--color-anticipated)" />
            </BarChart>
          </ChartContainer>
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
                <BarChart data={facilityPaymentSpeed} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" fontSize={12} className="text-muted-foreground" tickFormatter={v => `${v}d`} />
                  <YAxis dataKey="name" type="category" fontSize={12} className="text-muted-foreground" width={75} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="avgDays" fill="var(--color-avgDays)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
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
                <BarChart data={revenueByFacility} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" fontSize={12} className="text-muted-foreground" tickFormatter={v => `$${v}`} />
                  <YAxis dataKey="name" type="category" fontSize={12} className="text-muted-foreground" width={75} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
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
                <BarChart data={shiftsPerFacility} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" fontSize={12} className="text-muted-foreground" />
                  <YAxis dataKey="name" type="category" fontSize={12} className="text-muted-foreground" width={75} />
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
                <BarChart data={avgRatePerFacility} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" fontSize={12} className="text-muted-foreground" tickFormatter={v => `$${v}`} />
                  <YAxis dataKey="name" type="category" fontSize={12} className="text-muted-foreground" width={75} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="avgRate" fill="var(--color-avgRate)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
