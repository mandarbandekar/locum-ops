import { useMemo, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isWithinInterval } from 'date-fns';
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

export default function ReportsPage() {
  const { shifts, invoices, facilities } = useData();
  const [monthRange, setMonthRange] = useState('6');

  const months = useMemo(() => {
    const now = new Date();
    return eachMonthOfInterval({
      start: subMonths(startOfMonth(now), parseInt(monthRange) - 1),
      end: endOfMonth(now),
    });
  }, [monthRange]);

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
      return { month: format(month, 'MMM yyyy'), total, paid, outstanding };
    });
  }, [months, invoices]);

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

  const revenueChartConfig = {
    paid: { label: 'Paid', color: 'hsl(142, 71%, 45%)' },
    outstanding: { label: 'Outstanding', color: 'hsl(38, 92%, 50%)' },
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
          <CardDescription>Paid vs outstanding invoice amounts</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
            <BarChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-muted-foreground" fontSize={12} />
              <YAxis className="text-muted-foreground" fontSize={12} tickFormatter={v => `$${v}`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="paid" stackId="a" fill="var(--color-paid)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="outstanding" stackId="a" fill="var(--color-outstanding)" radius={[4, 4, 0, 0]} />
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
