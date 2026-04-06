import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, DollarSign, TrendingUp, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { EXPENSE_CATEGORIES, findSubcategory, getDeductibilityLabel } from '@/lib/expenseCategories';
import type { Expense } from '@/hooks/useExpenses';
import { useData } from '@/contexts/DataContext';

interface Props {
  expenses: Expense[];
  loading: boolean;
  ytdTotalCents: number;
  ytdDeductibleCents: number;
  ytdByCategory: Record<string, { totalCents: number; deductibleCents: number; count: number }>;
  categoriesTracked: number;
  ytdExpenses: Expense[];
}

export default function ExpenseSummaryTab({
  loading,
  ytdTotalCents,
  ytdDeductibleCents,
  ytdByCategory,
  categoriesTracked,
  ytdExpenses,
}: Props) {
  const { facilities } = useData();
  const facilityMap = useMemo(() => {
    const m: Record<string, string> = {};
    facilities.forEach(f => { m[f.id] = f.name; });
    return m;
  }, [facilities]);

  // Deductibility breakdown
  const byDeductibility = useMemo(() => {
    const map: Record<string, { totalCents: number; deductibleCents: number; count: number }> = {};
    ytdExpenses.forEach(e => {
      const key = e.deductibility_type;
      if (!map[key]) map[key] = { totalCents: 0, deductibleCents: 0, count: 0 };
      map[key].totalCents += e.amount_cents;
      map[key].deductibleCents += e.deductible_amount_cents;
      map[key].count += 1;
    });
    return map;
  }, [ytdExpenses]);

  const maxCategoryCents = useMemo(() =>
    Math.max(...Object.values(ytdByCategory).map(v => v.totalCents), 1),
  [ytdByCategory]);

  function exportCSV() {
    const currentYear = new Date().getFullYear();
    let csv = 'Date,Category,Subcategory,Description,Amount,Deductible Amount,Deductibility Type,Clinic,Miles,Sq Ft,Business Use %\n';
    ytdExpenses.forEach(e => {
      const sub = findSubcategory(e.subcategory);
      const catGroup = EXPENSE_CATEGORIES.find(g => g.key === e.category);
      csv += [
        e.expense_date,
        `"${catGroup?.label || e.category}"`,
        `"${sub?.label || e.subcategory}"`,
        `"${e.description.replace(/"/g, '""')}"`,
        (e.amount_cents / 100).toFixed(2),
        (e.deductible_amount_cents / 100).toFixed(2),
        getDeductibilityLabel(e.deductibility_type as any),
        `"${e.facility_id ? (facilityMap[e.facility_id] || '') : ''}"`,
        e.mileage_miles ?? '',
        e.home_office_sqft ?? '',
        e.prorate_percent ?? '',
      ].join(',') + '\n';
    });

    csv += `\nYTD Total,$${(ytdTotalCents / 100).toFixed(2)}\n`;
    csv += `YTD Deductible,$${(ytdDeductibleCents / 100).toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LocumOps_Expenses_${currentYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Expense report exported');
  }

  if (loading) return <p className="text-muted-foreground py-8 text-center">Loading…</p>;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">YTD Total Expenses</p>
              <p className="text-xl font-bold">${(ytdTotalCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">YTD Write-Offs</p>
              <p className="text-xl font-bold">${(ytdDeductibleCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent">
              <Layers className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Categories Tracked</p>
              <p className="text-xl font-bold">{categoriesTracked}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={ytdExpenses.length === 0}>
          <Download className="h-4 w-4 mr-1" /> Export for CPA
        </Button>
      </div>

      {/* Category breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {EXPENSE_CATEGORIES.filter(g => ytdByCategory[g.key]).map(group => {
            const data = ytdByCategory[group.key];
            const pct = Math.round((data.totalCents / maxCategoryCents) * 100);
            return (
              <div key={group.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{group.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">{data.count} entries</span>
                    <span className="font-semibold">${(data.totalCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
          {Object.keys(ytdByCategory).length === 0 && (
            <div className="text-center py-8 space-y-3">
              <p className="text-muted-foreground text-sm">No expenses logged this year yet.</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Start tracking mileage, CE courses, and other deductible expenses to see your write-off breakdown here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deductibility breakdown */}
      {Object.keys(byDeductibility).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Write-Off Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(byDeductibility).map(([type, data]) => (
                <div key={type} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {getDeductibilityLabel(type as any)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{data.count} entries</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">${(data.deductibleCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    {data.deductibleCents !== data.totalCents && (
                      <span className="text-xs text-muted-foreground ml-1">
                        of ${(data.totalCents / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
