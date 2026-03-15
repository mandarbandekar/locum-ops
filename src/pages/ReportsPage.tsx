import { useMemo, useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, addMonths, isWithinInterval } from 'date-fns';
import { DollarSign, TrendingUp, Calendar, Building2 } from 'lucide-react';

const COLORS = [
  'hsl(173, 58%, 39%)',
  'hsl(215, 25%, 27%)',
  'hsl(38, 92%, 50%)',
  'hsl(142, 71%, 45%)',
  'hsl(0, 72%, 51%)',
  'hsl(173, 40%, 55%)',
  'hsl(260, 50%, 55%)',
  'hsl(30, 70%, 50%)',
];

const db = (table: string) => supabase.from(table as any);

export default function ReportsPage() {
  const { shifts, invoices, facilities } = useData();
  const { user, isDemo } = useAuth();
  const [monthRange, setMonthRange] = useState('6');
  const [taxSetAsidePercent, setTaxSetAsidePercent] = useState<number>(0);

  // Fetch tax set-aside settings
  useEffect(() => {
    if (isDemo || !user) return;
    const currentYear = new Date().getFullYear();
    db('tax_settings')
      .select('set_aside_mode, set_aside_percent, set_aside_fixed_monthly')
      .eq('user_id', user.id)
      .eq('tax_year', currentYear)
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.set_aside_mode === 'percent') {
          setTaxSetAsidePercent(data.set_aside_percent || 0);
        }
      });
  }, [user, isDemo]);

  // Extend range to include future months that have shifts
  const months = useMemo(() => {
    const now = new Date();
    const pastStart = subMonths(startOfMonth(now), parseInt(monthRange) - 1);
    // Find the latest shift date to determine how far into the future to show
    const futureShifts = shifts.filter(s => s.status === 'proposed' || s.status === 'booked');
    let futureEnd = endOfMonth(now);
    futureShifts.forEach(s => {
      const d = parseISO(s.start_datetime);
      if (d > futureEnd) futureEnd = endOfMonth(d);
    });
    // Cap at 6 months into the future
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

      // Anticipated income from future proposed/booked shifts not yet invoiced
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

  const paymentTrends = useMemo(() => {
    return months.map(month => {
      const monthEnd = endOfMonth(month);
      const monthInvoices = invoices.filter(inv => {
        const periodEnd = parseISO(inv.period_end);
        return isWithinInterval(periodEnd, { start: month, end: monthEnd });
      });
      return {
        month: format(month, 'MMM'),
        paid: monthInvoices.filter(i => i.status === 'paid').length,
        sent: monthInvoices.filter(i => i.status === 'sent').length,
        overdue: monthInvoices.filter(i => i.status === 'overdue').length,
        draft: monthInvoices.filter(i => i.status === 'draft').length,
      };
    });
  }, [months, invoices]);

  const totalRevenue = revenueData.reduce((s, d) => s + d.total, 0);
  const totalPaid = revenueData.reduce((s, d) => s + d.paid, 0);
  const totalShifts = shiftsPerFacility.reduce((s, d) => s + d.shifts, 0);
  const activeFacilities = shiftsPerFacility.length;

  const totalAnticipated = revenueData.reduce((s, d) => s + d.anticipated, 0);
  const totalAnticipatedTax = revenueData.reduce((s, d) => s + d.anticipatedTax, 0);

  const revenueChartConfig = {
    paid: { label: 'Paid', color: 'hsl(142, 71%, 45%)' },
    outstanding: { label: 'Outstanding', color: 'hsl(38, 92%, 50%)' },
    anticipated: { label: 'Anticipated Income', color: 'hsl(215, 25%, 75%)' },
    anticipatedTax: { label: 'Anticipated Taxes', color: 'hsl(0, 60%, 65%)' },
  };

  const paymentChartConfig = {
    paid: { label: 'Paid', color: 'hsl(142, 71%, 45%)' },
    sent: { label: 'Sent', color: 'hsl(173, 58%, 39%)' },
    overdue: { label: 'Overdue', color: 'hsl(0, 72%, 51%)' },
    draft: { label: 'Draft', color: 'hsl(215, 13%, 50%)' },
  };

  const shiftsChartConfig = {
    shifts: { label: 'Shifts', color: 'hsl(173, 58%, 39%)' },
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

      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue</CardTitle>
          <CardDescription>Paid vs outstanding invoice amounts · anticipated income shown separately</CardDescription>
        </CardHeader>
        <CardContent>
          {totalAnticipated > 0 && (
            <p className="text-xs text-muted-foreground mb-2">
              Anticipated income: <span className="font-semibold">${totalAnticipated.toLocaleString()}</span> (not included in Total Revenue)
            </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Shifts per Facility</CardTitle>
            <CardDescription>Distribution of shifts across facilities</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={shiftsChartConfig} className="h-[300px] w-full">
              <BarChart data={shiftsPerFacility} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" fontSize={12} className="text-muted-foreground" />
                <YAxis dataKey="name" type="category" fontSize={12} className="text-muted-foreground" width={75} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="shifts" fill="var(--color-shifts)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Trends</CardTitle>
            <CardDescription>Invoice status distribution over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={paymentChartConfig} className="h-[300px] w-full">
              <LineChart data={paymentTrends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" fontSize={12} className="text-muted-foreground" />
                <YAxis fontSize={12} className="text-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="paid" stroke="var(--color-paid)" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="sent" stroke="var(--color-sent)" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="overdue" stroke="var(--color-overdue)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
