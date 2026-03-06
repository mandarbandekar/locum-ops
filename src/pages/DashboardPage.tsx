import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, FileText, AlertTriangle, CheckCircle, Plus, Building2, Mail, Send, Calculator } from 'lucide-react';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { aggregateQuarterlyIncome, calculateSetAside, getDefaultDueDates } from '@/lib/taxCalculations';
import { format, differenceInDays } from 'date-fns';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const { shifts, invoices, facilities } = useData();
  const navigate = useNavigate();

  const now = new Date();
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);

  const nextShifts = shifts
    .filter(s => new Date(s.start_datetime) >= now && new Date(s.start_datetime) <= in7Days && (s.status === 'booked' || s.status === 'proposed'))
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

  const draftInvoices = invoices.filter(i => i.status === 'draft');
  const overdueInvoices = invoices.filter(i => computeInvoiceStatus(i) === 'overdue');
  const proposedShifts = shifts.filter(s => s.status === 'proposed');

  const getFacilityName = (id: string) => facilities.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div>
      <div className="page-header flex-col sm:flex-row gap-3">
        <h1 className="page-title">Dashboard</h1>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={() => navigate('/schedule')}>
            <Plus className="mr-1 h-4 w-4" /> <span className="hidden xs:inline">Add</span> Shift
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/facilities')}>
            <Building2 className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">Add</span> Facility
          </Button>
          <Button size="sm" variant="outline" className="hidden sm:inline-flex" onClick={() => navigate('/outreach')}>
            <Mail className="mr-1 h-4 w-4" /> Outreach
          </Button>
          <Button size="sm" variant="outline" className="hidden sm:inline-flex" onClick={() => navigate('/confirmations')}>
            <Send className="mr-1 h-4 w-4" /> Confirmations
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
        <Card className="stat-card border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Next 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{nextShifts.length}</div>
            <p className="text-xs text-muted-foreground">upcoming shifts</p>
          </CardContent>
        </Card>

        <Card className="stat-card border-l-4 border-l-warning">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> Invoices to Send
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{draftInvoices.length}</div>
            <p className="text-xs text-muted-foreground">draft invoices</p>
          </CardContent>
        </Card>

        <Card className="stat-card border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overdueInvoices.length}</div>
            <p className="text-xs text-muted-foreground">overdue invoices</p>
          </CardContent>
        </Card>

        <Card className="stat-card border-l-4 border-l-accent-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Confirmations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{proposedShifts.length}</div>
            <p className="text-xs text-muted-foreground">proposed shifts</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            {nextShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shifts in the next 7 days</p>
            ) : (
              <div className="space-y-3">
                {nextShifts.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{getFacilityName(s.facility_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(s.start_datetime), 'EEE, MMM d')} · {format(new Date(s.start_datetime), 'h:mm a')} - {format(new Date(s.end_datetime), 'h:mm a')}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overdue Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {overdueInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No overdue invoices 🎉</p>
            ) : (
              <div className="space-y-3">
                {overdueInvoices.map(inv => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 rounded-md bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                  >
                    <div>
                      <p className="font-medium text-sm">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{getFacilityName(inv.facility_id)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">${inv.total_amount.toLocaleString()}</p>
                      <p className="text-xs text-destructive">Due {inv.due_date ? format(new Date(inv.due_date), 'MMM d') : 'N/A'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
