import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, Clock, AlertTriangle, CalendarDays, DollarSign, FileText } from 'lucide-react';

type Range = '3' | '6' | '12';

export default function ClinicScorecardTab() {
  const { facilities, shifts, invoices } = useData();
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>('12');

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - Number(range));
    return d;
  }, [range]);

  const activeFacilities = useMemo(() => facilities.filter(f => f.status === 'active'), [facilities]);

  const scorecards = useMemo(() => {
    return activeFacilities.map(facility => {
      const fShifts = shifts
        .filter(s => s.facility_id === facility.id && new Date(s.start_datetime) >= cutoff)
        .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

      const totalShifts = fShifts.length;
      const revenue = fShifts.reduce((sum, s) => sum + (s.rate_applied || 0), 0);
      const avgPay = totalShifts > 0 ? revenue / totalShifts : 0;

      const fInvoices = invoices.filter(i => i.facility_id === facility.id);
      const paidInvoices = fInvoices.filter(i => i.paid_at && i.sent_at);
      const avgDays = paidInvoices.length > 0
        ? paidInvoices.reduce((sum, i) => {
            const diff = (new Date(i.paid_at!).getTime() - new Date(i.sent_at!).getTime()) / 86400000;
            return sum + Math.max(0, diff);
          }, 0) / paidInvoices.length
        : null;

      const overdueCount = fInvoices.filter(i => i.status === 'overdue' || (i.due_date && !i.paid_at && new Date() > new Date(i.due_date) && i.status === 'sent')).length;

      let repeatFreq: string | null = null;
      if (fShifts.length >= 2) {
        const gaps: number[] = [];
        for (let i = 1; i < fShifts.length; i++) {
          const diff = (new Date(fShifts[i].start_datetime).getTime() - new Date(fShifts[i - 1].start_datetime).getTime()) / 86400000;
          gaps.push(diff);
        }
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        repeatFreq = `Every ${Math.round(avgGap)} days`;
      } else if (fShifts.length === 1) {
        repeatFreq = 'One-time';
      }

      return {
        facility,
        totalShifts,
        revenue,
        avgPay,
        avgDays,
        overdueCount,
        repeatFreq,
      };
    }).sort((a, b) => b.totalShifts - a.totalShifts);
  }, [activeFacilities, shifts, invoices, cutoff]);

  function paymentBadge(days: number | null) {
    if (days === null) return <Badge variant="secondary">No data</Badge>;
    if (days <= 14) return <Badge variant="success">{Math.round(days)}d avg — Fast</Badge>;
    if (days <= 30) return <Badge variant="warning">{Math.round(days)}d avg</Badge>;
    return <Badge variant="destructive">{Math.round(days)}d avg — Slow</Badge>;
  }

  function overdueBadge(count: number) {
    if (count === 0) return <Badge variant="success">None</Badge>;
    if (count <= 2) return <Badge variant="warning">{count} invoice{count > 1 ? 's' : ''}</Badge>;
    return <Badge variant="destructive">{count} invoices</Badge>;
  }

  if (activeFacilities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Add clinics to see your scorecard.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Performance snapshot per clinic</p>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(['3', '6', '12'] as Range[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${range === r ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {r}mo
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scorecards.map(({ facility, totalShifts, revenue, avgPay, avgDays, overdueCount, repeatFreq }) => (
          <Card key={facility.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle
                className="text-base cursor-pointer hover:text-primary transition-colors"
                onClick={() => navigate(`/facilities/${facility.id}`)}
              >
                {facility.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <Row icon={<CalendarDays className="h-4 w-4" />} label="Total Shifts" value={totalShifts.toString()} />
              <Row icon={<DollarSign className="h-4 w-4" />} label="Revenue" value={`$${revenue.toLocaleString()}`} />
              <Row icon={<TrendingUp className="h-4 w-4" />} label="Avg Pay / Shift" value={`$${Math.round(avgPay).toLocaleString()}`} />
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /> Payment Speed</span>
                {paymentBadge(avgDays)}
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground"><AlertTriangle className="h-4 w-4" /> Overdue History</span>
                {overdueBadge(overdueCount)}
              </div>
              <Row icon={<FileText className="h-4 w-4" />} label="Repeat Booking" value={repeatFreq || '—'} />
              {facility.notes && (
                <p className="text-xs text-muted-foreground line-clamp-2 pt-1 border-t border-border">{facility.notes}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">{icon} {label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
