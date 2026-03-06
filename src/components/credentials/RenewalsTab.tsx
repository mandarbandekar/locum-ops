import { useState, useMemo } from 'react';
import { useCredentials } from '@/hooks/useCredentials';
import { CREDENTIAL_TYPE_LABELS, CREDENTIAL_STATUS_LABELS, computeCredentialStatus, getDaysUntilExpiration } from '@/lib/credentialTypes';
import { CredentialStatusBadge } from '@/components/credentials/CredentialStatusBadge';
import { CredentialExpirationChip } from '@/components/credentials/CredentialExpirationChip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  CalendarDays, Clock, AlertTriangle, CheckCircle2, RefreshCw,
  ListTodo, CalendarIcon, LayoutList, ChevronRight
} from 'lucide-react';
import { format, isSameMonth, isSameDay, addMonths, startOfMonth } from 'date-fns';

type ViewMode = 'timeline' | 'calendar' | 'checklist';
type GroupBy = 'month' | 'type' | 'state';

export default function RenewalsTab() {
  const { credentials, isLoading, updateCredential } = useCredentials();
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [groupBy, setGroupBy] = useState<GroupBy>('month');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  const renewalItems = useMemo(() => {
    return credentials
      .filter(c => c.status !== 'archived' && c.expiration_date)
      .map(c => ({
        ...c,
        computedStatus: computeCredentialStatus(c.expiration_date, c.status),
        daysLeft: getDaysUntilExpiration(c.expiration_date),
        expDate: new Date(c.expiration_date!),
      }))
      .sort((a, b) => a.expDate.getTime() - b.expDate.getTime());
  }, [credentials]);

  const overdue = useMemo(() => renewalItems.filter(i => i.daysLeft !== null && i.daysLeft < 0), [renewalItems]);
  const upcoming = useMemo(() => renewalItems.filter(i => i.daysLeft !== null && i.daysLeft >= 0), [renewalItems]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof renewalItems> = {};
    upcoming.forEach(item => {
      let key: string;
      if (groupBy === 'month') {
        key = format(item.expDate, 'MMMM yyyy');
      } else if (groupBy === 'type') {
        key = CREDENTIAL_TYPE_LABELS[item.credential_type] || item.credential_type;
      } else {
        key = item.jurisdiction || 'No State';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [upcoming, groupBy]);

  // Calendar: dates with expirations
  const expirationDates = useMemo(() => {
    return renewalItems.map(i => i.expDate);
  }, [renewalItems]);

  const calendarModifiers = useMemo(() => ({
    expiring: expirationDates.filter(d => {
      const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 60;
    }),
    expired: expirationDates.filter(d => d < new Date()),
    safe: expirationDates.filter(d => {
      const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days > 60;
    }),
  }), [expirationDates]);

  const selectedDateItems = useMemo(() => {
    return renewalItems.filter(i => isSameDay(i.expDate, calendarDate));
  }, [renewalItems, calendarDate]);

  const handleMarkRenewed = async (cred: typeof renewalItems[0]) => {
    const newExpDate = new Date();
    if (cred.renewal_frequency === 'annually') newExpDate.setFullYear(newExpDate.getFullYear() + 1);
    else if (cred.renewal_frequency === 'biannually') newExpDate.setFullYear(newExpDate.getFullYear() + 2);
    else if (cred.renewal_frequency === 'quarterly') newExpDate.setMonth(newExpDate.getMonth() + 3);
    else newExpDate.setFullYear(newExpDate.getFullYear() + 1);
    await updateCredential.mutateAsync({
      id: cred.id,
      expiration_date: newExpDate.toISOString().split('T')[0],
      status: 'active',
    });
  };

  const handleMarkStatus = async (id: string, status: string) => {
    await updateCredential.mutateAsync({ id, status });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Loading…</p></div>;
  }

  if (renewalItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <div className="p-4 rounded-full bg-muted inline-block mb-4">
            <CalendarDays className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Renewals to Track</h2>
          <p className="text-muted-foreground max-w-md mx-auto">Add credentials with expiration dates to start tracking renewals here.</p>
        </CardContent>
      </Card>
    );
  }

  const totalTasks = renewalItems.length;
  const completedTasks = renewalItems.filter(i => i.computedStatus === 'active' && i.daysLeft !== null && i.daysLeft > 60).length;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex border rounded-md">
            {([
              { mode: 'timeline' as const, icon: LayoutList, label: 'Timeline' },
              { mode: 'calendar' as const, icon: CalendarIcon, label: 'Calendar' },
              { mode: 'checklist' as const, icon: ListTodo, label: 'Checklist' },
            ]).map(({ mode, icon: Icon, label }) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'secondary' : 'ghost'}
                size="sm"
                className={cn('rounded-none first:rounded-l-md last:rounded-r-md gap-1.5')}
                onClick={() => setViewMode(mode)}
              >
                <Icon className="h-4 w-4" /> {label}
              </Button>
            ))}
          </div>
          {viewMode === 'timeline' && (
            <Select value={groupBy} onValueChange={v => setGroupBy(v as GroupBy)}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">By Month</SelectItem>
                <SelectItem value="type">By Type</SelectItem>
                <SelectItem value="state">By State</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" /> {overdue.length} Overdue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-warning" /> {upcoming.filter(i => i.daysLeft! <= 60).length} Expiring Soon
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-success" /> {upcoming.filter(i => i.daysLeft! > 60).length} On Track
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <SummaryCard icon={AlertTriangle} label="Overdue" count={overdue.length} color="text-destructive" bgColor="bg-destructive/10" />
        <SummaryCard icon={Clock} label="Due in 30 Days" count={upcoming.filter(i => i.daysLeft! <= 30).length} color="text-warning" bgColor="bg-warning/10" />
        <SummaryCard icon={CalendarDays} label="Due in 60 Days" count={upcoming.filter(i => i.daysLeft! <= 60 && i.daysLeft! > 30).length} color="text-primary" bgColor="bg-primary/10" />
        <SummaryCard icon={CheckCircle2} label="On Track" count={upcoming.filter(i => i.daysLeft! > 60).length} color="text-success" bgColor="bg-success/10" />
      </div>

      {/* Overdue Section */}
      {overdue.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Overdue Renewals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdue.map(item => (
              <RenewalRow key={item.id} item={item} onRenew={handleMarkRenewed} onStatusChange={handleMarkStatus} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([groupLabel, items]) => (
            <Card key={groupLabel}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{groupLabel}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map(item => (
                  <RenewalRow key={item.id} item={item} onRenew={handleMarkRenewed} onStatusChange={handleMarkStatus} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
          <Card className="p-4">
            <Calendar
              mode="single"
              selected={calendarDate}
              onSelect={d => d && setCalendarDate(d)}
              className="pointer-events-auto"
              modifiers={calendarModifiers}
              modifiersStyles={{
                expiring: { backgroundColor: 'hsl(var(--warning) / 0.2)', borderRadius: '50%' },
                expired: { backgroundColor: 'hsl(var(--destructive) / 0.2)', borderRadius: '50%' },
                safe: { backgroundColor: 'hsl(var(--success) / 0.2)', borderRadius: '50%' },
              }}
            />
            <div className="mt-4 space-y-1.5 text-xs text-muted-foreground px-3">
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-destructive/20 border border-destructive/40" /> Expired</div>
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-warning/20 border border-warning/40" /> Expiring ≤60d</div>
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-success/20 border border-success/40" /> On Track</div>
            </div>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {format(calendarDate, 'MMMM d, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateItems.length === 0 ? (
                <p className="text-muted-foreground text-sm py-6 text-center">No renewals on this date.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDateItems.map(item => (
                    <RenewalRow key={item.id} item={item} onRenew={handleMarkRenewed} onStatusChange={handleMarkStatus} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Checklist View */}
      {viewMode === 'checklist' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Renewal Checklist</CardTitle>
              <span className="text-sm text-muted-foreground">{completedTasks}/{totalTasks} on track</span>
            </div>
            <Progress value={(completedTasks / totalTasks) * 100} className="h-2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-1">
            {renewalItems.map(item => (
              <ChecklistRow key={item.id} item={item} onRenew={handleMarkRenewed} onStatusChange={handleMarkStatus} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ---- Sub-components ---- */

function SummaryCard({ icon: Icon, label, count, color, bgColor }: {
  icon: React.ElementType; label: string; count: number; color: string; bgColor: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', bgColor)}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
        <div>
          <p className="text-2xl font-bold">{count}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface RenewalItem {
  id: string;
  custom_title: string;
  credential_type: string;
  jurisdiction: string | null;
  expiration_date: string | null;
  computedStatus: string;
  daysLeft: number | null;
  issuing_authority: string | null;
  renewal_frequency: string | null;
  status: string;
}

function RenewalRow({ item, onRenew, onStatusChange }: {
  item: RenewalItem;
  onRenew: (item: any) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{item.custom_title}</span>
          <CredentialStatusBadge status={item.computedStatus} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
          <span>{CREDENTIAL_TYPE_LABELS[item.credential_type]}</span>
          {item.jurisdiction && <span>{item.jurisdiction}</span>}
          {item.issuing_authority && <span>{item.issuing_authority}</span>}
          {item.expiration_date && (
            <span>Exp: {format(new Date(item.expiration_date), 'MMM d, yyyy')}</span>
          )}
        </div>
      </div>
      <CredentialExpirationChip expirationDate={item.expiration_date} />
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {item.computedStatus !== 'renewing' && (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onStatusChange(item.id, 'renewing')}>
            In Progress
          </Button>
        )}
        <Button variant="default" size="sm" className="h-7 text-xs gap-1" onClick={() => onRenew(item)}>
          <RefreshCw className="h-3 w-3" /> Renew
        </Button>
      </div>
    </div>
  );
}

function ChecklistRow({ item, onRenew, onStatusChange }: {
  item: RenewalItem;
  onRenew: (item: any) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const isOnTrack = item.daysLeft !== null && item.daysLeft > 60 && item.computedStatus === 'active';

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
      <Checkbox checked={isOnTrack} disabled className="pointer-events-none" />
      <div className="flex-1 min-w-0">
        <span className={cn('font-medium text-sm', isOnTrack && 'line-through text-muted-foreground')}>
          {item.custom_title}
        </span>
        <span className="ml-2 text-xs text-muted-foreground">
          {CREDENTIAL_TYPE_LABELS[item.credential_type]}
          {item.jurisdiction ? ` · ${item.jurisdiction}` : ''}
        </span>
      </div>
      <CredentialExpirationChip expirationDate={item.expiration_date} />
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="default" size="sm" className="h-7 text-xs gap-1" onClick={() => onRenew(item)}>
          <RefreshCw className="h-3 w-3" /> Renew
        </Button>
      </div>
    </div>
  );
}
