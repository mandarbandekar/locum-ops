import { useMemo } from 'react';
import { Activity, Heart, BarChart3, Building2, DollarSign, AlertTriangle, Calendar, Shield } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import FinancialHealthTab from '@/components/business/FinancialHealthTab';
import PerformanceInsightsTab from '@/components/business/PerformanceInsightsTab';
import ClinicScorecardTab from '@/components/business/ClinicScorecardTab';

export default function BusinessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'financial-health';
  const { invoices, shifts, facilities, lineItems } = useData();

  // Hero KPIs
  const kpis = useMemo(() => {
    const year = new Date().getFullYear();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Paid invoices
    const paidTotal = invoices
      .filter(i => i.status === 'paid' && i.paid_at && new Date(i.paid_at).getFullYear() === year)
      .reduce((s, i) => s + i.total_amount, 0);

    let outstanding = 0;
    let overdueCount = 0;
    invoices.forEach(inv => {
      const status = computeInvoiceStatus(inv);
      if (status === 'sent' || status === 'partial' || status === 'overdue') {
        outstanding += inv.balance_due ?? inv.total_amount;
      }
      if (status === 'overdue') overdueCount++;
    });

    // Uninvoiced shift revenue
    const invoicedShiftIds = new Set(lineItems.map(li => li.shift_id).filter(Boolean));
    const uninvoicedRevenue = shifts
      .filter(s => new Date(s.start_datetime).getFullYear() === year && !invoicedShiftIds.has(s.id))
      .reduce((sum, s) => sum + (s.rate_applied || 0), 0);

    const ytdAnticipated = paidTotal + outstanding + uninvoicedRevenue;

    const monthShifts = shifts.filter(s => {
      const d = new Date(s.start_datetime);
      return d >= monthStart && d <= monthEnd;
    }).length;

    return { ytdAnticipated, outstanding, overdueCount, monthShifts };
  }, [invoices, shifts, lineItems]);

  // Attention badges
  const badges = useMemo(() => {
    let financialAttention = false;
    let scorecardAttention = false;
    invoices.forEach(inv => {
      const status = computeInvoiceStatus(inv);
      if (status === 'overdue') financialAttention = true;
    });

    // Check if any facility has 3+ overdue
    const facilityOverdue: Record<string, number> = {};
    invoices.forEach(inv => {
      if (inv.status === 'overdue' || (inv.due_date && !inv.paid_at && new Date() > new Date(inv.due_date) && inv.status === 'sent')) {
        facilityOverdue[inv.facility_id] = (facilityOverdue[inv.facility_id] || 0) + 1;
      }
    });
    if (Object.values(facilityOverdue).some(c => c >= 3)) scorecardAttention = true;

    return { financialAttention, scorecardAttention };
  }, [invoices]);

  const fmtK = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="page-title">Relief Business Hub</h1>
            <p className="page-subtitle">Your relief practice at a glance</p>
          </div>
        </div>
      </div>

      {/* Hero Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">YTD Revenue</p>
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold">{fmtK(kpis.ytdPaid)}</p>
          </CardContent>
        </Card>
        <Card className={kpis.overdueCount > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <AlertTriangle className={`h-3.5 w-3.5 ${kpis.overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
            <p className={`text-xl font-bold ${kpis.overdueCount > 0 ? 'text-destructive' : ''}`}>{fmtK(kpis.outstanding)}</p>
            {kpis.overdueCount > 0 && (
              <p className="text-[10px] text-destructive">{kpis.overdueCount} overdue</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">This Month</p>
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold">{kpis.monthShifts} <span className="text-sm font-normal text-muted-foreground">shifts</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Clinics</p>
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold">{facilities.filter(f => f.status === 'active').length} <span className="text-sm font-normal text-muted-foreground">active</span></p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 sm:gap-3 flex-wrap">
        <button
          onClick={() => setSearchParams({ tab: 'financial-health' }, { replace: true })}
          className={`primary-tab-btn relative ${activeTab === 'financial-health' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Financial Health</span>
          {badges.financialAttention && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive" />
          )}
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'performance' }, { replace: true })}
          className={`primary-tab-btn ${activeTab === 'performance' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Performance Insights</span>
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'scorecard' }, { replace: true })}
          className={`primary-tab-btn relative ${activeTab === 'scorecard' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Clinic Scorecard</span>
          {badges.scorecardAttention && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive" />
          )}
        </button>
      </div>

      {activeTab === 'financial-health' && <FinancialHealthTab />}
      {activeTab === 'performance' && <PerformanceInsightsTab />}
      {activeTab === 'scorecard' && <ClinicScorecardTab />}
    </div>
  );
}
