import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Receipt, Search, Image } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { EXPENSE_CATEGORIES, findSubcategory, getDeductibilityLabel } from '@/lib/expenseCategories';
import AddExpenseDialog from './AddExpenseDialog';
import { ExpenseOnboarding } from './ExpenseOnboarding';
import type { Expense } from '@/hooks/useExpenses';

interface Props {
  expenses: Expense[];
  loading: boolean;
  config: { irs_mileage_rate_cents: number; home_office_rate_cents: number };
  addExpense: (data: Partial<Expense>) => Promise<Expense | null>;
  deleteExpense: (id: string) => Promise<void>;
  uploadReceipt: (file: File) => Promise<string | null>;
}

export default function ExpenseLogTab({ expenses, loading, config, addExpense, deleteExpense, uploadReceipt }: Props) {
  const { facilities } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filtered = useMemo(() => {
    let list = expenses;
    if (categoryFilter !== 'all') list = list.filter(e => e.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.description.toLowerCase().includes(q) ||
        (findSubcategory(e.subcategory)?.label || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [expenses, categoryFilter, search]);

  const facilityMap = useMemo(() => {
    const m: Record<string, string> = {};
    facilities.forEach(f => { m[f.id] = f.name; });
    return m;
  }, [facilities]);

  if (loading) return <p className="text-muted-foreground py-8 text-center">Loading…</p>;

  if (expenses.length === 0) {
    return (
      <div className="py-16 text-center space-y-4">
        <Receipt className="h-12 w-12 text-muted-foreground mx-auto" />
        <h3 className="text-lg font-semibold">No expenses yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Every mile and every license fee adds up. Start logging and we'll track what's deductible.
        </p>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Log First Expense
        </Button>
        <AddExpenseDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={addExpense}
          uploadReceipt={uploadReceipt}
          config={config}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {EXPENSE_CATEGORIES.map(g => (
              <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Expense
        </Button>
      </div>

      {/* Expense list */}
      <div className="space-y-2">
        {filtered.map(exp => {
          const sub = findSubcategory(exp.subcategory);
          const catGroup = EXPENSE_CATEGORIES.find(g => g.key === exp.category);
          return (
            <Card key={exp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">
                      {sub?.label || exp.subcategory || 'Expense'}
                    </span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {catGroup?.label || exp.category}
                    </Badge>
                    {exp.receipt_url && (
                      <Image className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{new Date(exp.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    {exp.description && <span className="truncate">· {exp.description}</span>}
                    {exp.facility_id && facilityMap[exp.facility_id] && (
                      <span className="truncate">· {facilityMap[exp.facility_id]}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">${(exp.amount_cents / 100).toFixed(2)}</p>
                  {exp.deductible_amount_cents !== exp.amount_cents && (
                    <p className="text-[10px] text-muted-foreground">
                      ${(exp.deductible_amount_cents / 100).toFixed(2)} deductible
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteExpense(exp.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No expenses match your filters.</p>
        )}
      </div>

      <AddExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={addExpense}
        uploadReceipt={uploadReceipt}
        config={config}
      />
    </div>
  );
}
