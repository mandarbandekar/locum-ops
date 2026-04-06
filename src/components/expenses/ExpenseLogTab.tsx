import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Search, Receipt, Car, Utensils, GraduationCap, FileText, DollarSign, TrendingUp, CalendarDays } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { EXPENSE_CATEGORIES, findSubcategory } from '@/lib/expenseCategories';
import AddExpenseDialog from './AddExpenseDialog';
import { ExpenseOnboarding } from './ExpenseOnboarding';
import { MileageReviewBanner } from './MileageReviewBanner';
import type { Expense } from '@/hooks/useExpenses';

const QUICK_ADD_CHIPS = [
  { label: 'Mileage', subcategory: 'mileage', icon: Car },
  { label: 'Business Meal', subcategory: 'business_meals', icon: Utensils },
  { label: 'CE Course', subcategory: 'ce_courses', icon: GraduationCap },
  { label: 'License Fee', subcategory: 'state_license', icon: FileText },
];

interface Props {
  expenses: Expense[];
  loading: boolean;
  config: { irs_mileage_rate_cents: number; home_office_rate_cents: number };
  addExpense: (data: Partial<Expense>) => Promise<Expense | null>;
  editExpense: (id: string, data: Partial<Expense>) => Promise<any>;
  deleteExpense: (id: string) => Promise<void>;
  uploadReceipt: (file: File) => Promise<string | null>;
  ytdTotalCents: number;
  ytdDeductibleCents: number;
  thisMonthCents: number;
  draftMileageExpenses: Expense[];
  confirmMileage: (id: string) => Promise<void>;
  dismissMileage: (id: string) => Promise<void>;
  confirmAllMileage: () => Promise<void>;
}

export default function ExpenseLogTab({ expenses, loading, config, addExpense, editExpense, deleteExpense, uploadReceipt, ytdTotalCents, ytdDeductibleCents, thisMonthCents, draftMileageExpenses, confirmMileage, dismissMileage, confirmAllMileage }: Props) {
  const { facilities } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [initialSubcategory, setInitialSubcategory] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

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

  function openQuickAdd(subcategory: string) {
    setEditingExpense(null);
    setInitialSubcategory(subcategory);
    setDialogOpen(true);
  }

  function openNew() {
    setEditingExpense(null);
    setInitialSubcategory('');
    setDialogOpen(true);
  }

  function openEdit(exp: Expense) {
    setEditingExpense(exp);
    setInitialSubcategory('');
    setDialogOpen(true);
  }

  if (loading) return <p className="text-muted-foreground py-8 text-center">Loading…</p>;

  if (expenses.length === 0) {
    return (
      <>
        <ExpenseOnboarding onAddExpense={openNew} />
        <AddExpenseDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={addExpense} uploadReceipt={uploadReceipt} config={config} />
      </>
    );
  }

  const fmt = (cents: number) => '$' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      {/* YTD Stat Strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'YTD Spent', value: fmt(ytdTotalCents), icon: DollarSign, color: 'text-primary' },
          { label: 'YTD Write-Offs', value: fmt(ytdDeductibleCents), icon: TrendingUp, color: 'text-green-600' },
          { label: 'This Month', value: fmt(thisMonthCents), icon: CalendarDays, color: 'text-muted-foreground' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="py-3 px-4 flex items-center gap-2.5">
              <stat.icon className={`h-4 w-4 ${stat.color} shrink-0`} />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground truncate">{stat.label}</p>
                <p className="font-semibold text-sm">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick-add chips */}
      <div className="flex flex-wrap gap-2">
        {QUICK_ADD_CHIPS.map(chip => (
          <Button key={chip.subcategory} variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => openQuickAdd(chip.subcategory)}>
            <chip.icon className="h-3.5 w-3.5" />
            {chip.label}
          </Button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search expenses…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Add Expense
        </Button>
      </div>

      {/* Expense list */}
      <div className="space-y-2">
        {filtered.map(exp => {
          const sub = findSubcategory(exp.subcategory);
          const catGroup = EXPENSE_CATEGORIES.find(g => g.key === exp.category);
          return (
            <Card key={exp.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(exp)}>
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
                      <Badge variant="outline" className="text-[10px] gap-1 text-green-700 border-green-300 bg-green-50 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800 shrink-0">
                        <Receipt className="h-3 w-3" />
                        Receipt
                      </Badge>
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
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(exp); }}
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
        onEdit={editExpense}
        uploadReceipt={uploadReceipt}
        config={config}
        editingExpense={editingExpense}
        initialSubcategory={initialSubcategory}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <span className="font-medium">{findSubcategory(deleteTarget.subcategory)?.label || deleteTarget.subcategory}</span>
                  {' — '}${(deleteTarget.amount_cents / 100).toFixed(2)} on {new Date(deleteTarget.expense_date).toLocaleDateString()}
                </>
              )}
              <br />This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteTarget) { deleteExpense(deleteTarget.id); setDeleteTarget(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
