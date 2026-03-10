import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Calendar, CheckCircle2, TrendingUp } from 'lucide-react';
import { QUARTER_STATUS_OPTIONS } from '@/types/taxStrategy';
import type { TaxStrategyData } from '@/hooks/useTaxStrategy';

interface Props {
  data: TaxStrategyData;
}

const QUARTER_LABELS: Record<number, string> = {
  1: 'Q1 (Jan–Mar)',
  2: 'Q2 (Apr–Jun)',
  3: 'Q3 (Jul–Sep)',
  4: 'Q4 (Oct–Dec)',
};

const DEFAULT_DUE_DATES = (year: number): Record<number, string> => ({
  1: `${year}-04-15`,
  2: `${year}-06-15`,
  3: `${year}-09-15`,
  4: `${year + 1}-01-15`,
});

export function TrackerTab({ data }: Props) {
  const {
    ytdPaidIncome, reserveAmount, readinessScore, nextQuarterDue, checklist,
    quarterStatuses, profile, currentYear, saveProfile, toggleChecklistItem,
    initializeChecklist, initializeQuarterStatuses, saveQuarterStatus,
  } = data;

  const [reservePct, setReservePct] = useState(profile?.reserve_percent?.toString() || '30');

  useEffect(() => {
    initializeChecklist();
    initializeQuarterStatuses();
  }, [initializeChecklist, initializeQuarterStatuses]);

  useEffect(() => {
    setReservePct(profile?.reserve_percent?.toString() || '30');
  }, [profile?.reserve_percent]);

  const handleReserveChange = () => {
    const pct = parseFloat(reservePct) || 30;
    saveProfile({ reserve_percent: pct });
  };

  const getQuarterStatus = (q: number) => {
    return quarterStatuses.find(qs => qs.quarter === q) || {
      quarter: q, tax_year: currentYear,
      due_date: DEFAULT_DUE_DATES(currentYear)[q],
      status: 'not_started', notes: '',
    };
  };

  const daysUntilNextDue = Math.ceil(
    (new Date(nextQuarterDue.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const completedCount = checklist.filter(i => i.completed).length;
  const nextTask = checklist.find(i => !i.completed);

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> YTD Paid Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              ${ytdPaidIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Reserve Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              ${reserveAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {profile?.reserve_percent ?? 30}% reserve preference
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Next Quarter Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">Q{nextQuarterDue.q}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {daysUntilNextDue > 0 ? `${daysUntilNextDue} days away` : 'Past due'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Tax Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{readinessScore}%</p>
            <Progress value={readinessScore} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Use this as a planning tracker for your relief / locum income. Confirm actual amounts and due dates with your CPA.
      </p>

      {/* Reserve % editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reserve Preference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="space-y-2">
              <Label>Reserve %</Label>
              <Input
                type="number" className="w-24"
                value={reservePct}
                onChange={e => setReservePct(e.target.value)}
                min={0} max={100}
              />
            </div>
            <Button variant="outline" onClick={handleReserveChange}>Update</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This is your personal reserve preference for planning, not an actual tax calculation.
          </p>
        </CardContent>
      </Card>

      {/* Quarterly statuses */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Quarterly Status</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map(q => {
            const qs = getQuarterStatus(q);
            return (
              <Card key={q}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{QUARTER_LABELS[q]}</p>
                    <Badge variant={qs.status === 'paid' ? 'default' : 'secondary'}>
                      {QUARTER_STATUS_OPTIONS.find(o => o.value === qs.status)?.label || qs.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Due: {qs.due_date}</p>
                  <Select
                    value={qs.status}
                    onValueChange={v => saveQuarterStatus({ ...qs, status: v, tax_year: currentYear })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {QUARTER_STATUS_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Readiness checklist */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Tax Readiness Checklist</h2>
          <p className="text-sm text-muted-foreground">
            {completedCount} of {checklist.length} complete
          </p>
        </div>

        {nextTask && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-sm">
              <span className="font-medium">Next recommended:</span> {nextTask.label}
            </p>
          </div>
        )}

        <Card>
          <CardContent className="pt-4 space-y-2">
            {checklist.map(item => (
              <div key={item.item_key} className="flex items-center gap-3 py-1.5">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => toggleChecklistItem(item)}
                />
                <span className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {item.label}
                </span>
              </div>
            ))}
            {checklist.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading checklist…</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
