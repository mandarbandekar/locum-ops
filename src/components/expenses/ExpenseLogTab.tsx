import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Search, Receipt, DollarSign, TrendingUp, CalendarDays, X, Repeat, PiggyBank } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { EXPENSE_CATEGORIES, findSubcategory } from '@/lib/expenseCategories';
import AddExpenseDialog from './AddExpenseDialog';
import LogExpenseSheet from './LogExpenseSheet';
import { ExpenseOnboarding } from './ExpenseOnboarding';
import type { Expense } from '@/hooks/useExpenses';
import type { TaxIntelligenceProfile } from '@/hooks/useTaxIntelligence';
import { getCombinedMarginalRate, getAnnualizedIncome } from '@/lib/taxStrategies';
import { STATE_TAX_DATA } from '@/lib/stateTaxData';
import type { FilingStatus } from '@/lib/taxConstants2026';

function getStateTaxRate(stateCode: string): number {
  const entry = STATE_TAX_DATA[stateCode];
  if (!entry || entry.type === 'none') return 0;
  if (entry.type === 'flat') return (entry.flatRate ?? 0) / 100;
  // Progressive: use top bracket as approximation
  const brackets = entry.brackets?.single;
  if (brackets && brackets.length > 0) return brackets[brackets.length - 1].rate / 100;
  return 0.05;
}

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
  confirmedMileageExpenses: Expense[];
  ytdMileageMiles: number;
  ytdMileageDeductionCents: number;
  confirmMileage: (id: string) => Promise<void>;
  dismissMileage: (id: string) => Promise<void>;
  confirmAllMileage: () => Promise<void>;
  reload: () => void;
  taxProfile?: TaxIntelligenceProfile | null;
}

export default function ExpenseLogTab({
  expenses, loading, config, addExpense, editExpense, deleteExpense, uploadReceipt,
  ytdTotalCents, ytdDeductibleCents, thisMonthCents, taxProfile,
}: Props) {
  const { facilities, shifts, invoices } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [initialSubcategory, setInitialSubcategory] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('expense-onboarding-dismissed') !== 'true';
  });

  // Calculate estimated tax savings
  const estimatedTaxSavingsCents = useMemo(() => {
    if (!taxProfile?.setup_completed_at) {
      return Math.round(ytdDeductibleCents * 0.24);
    }
    const annualized = getAnnualizedIncome(shifts, invoices);
    const stateRate = getStateTaxRate(taxProfile.state_code);
    const rate = getCombinedMarginalRate(
      annualized,
      taxProfile.filing_status as FilingStatus,
      stateRate,
      taxProfile.entity_type,
      taxProfile.scorp_salary,
    );
    return Math.round(ytdDeductibleCents * rate);
  }, [ytdDeductibleCents, taxProfile, shifts, invoices]);

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

  const hasExpenses = expenses.length > 0;
  const fmt = (cents: number) => '$' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-5">

      {/* Dismissible onboarding for new users */}
      {!hasExpenses && showOnboarding && (
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 z-10 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setShowOnboarding(false);
              localStorage.setItem('expense-onboarding-dismissed', 'true');
            }}
          >
            <X className="h-4 w-4" />
          </Button>
          <ExpenseOnboarding onAddExpense={openNew} />
        </div>
      )}

      {/* Welcome header for new users (always visible) OR YTD stats for returning users */}
      {!hasExpenses && !showOnboarding ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-6 px-4 text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Track Every Deductible Expense</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Tap "Log Expense" below to record your first expense. We'll auto-calculate deductions and build your YTD summary.
            </p>
          </CardContent>
        </Card>
      ) : hasExpenses ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'YTD Spent', value: fmt(ytdTotalCents), icon: DollarSign, color: 'text-primary' },
            { label: 'Est. Tax Savings YTD', value: fmt(estimatedTaxSavingsCents), icon: PiggyBank, color: 'text-green-600' },
            { label: 'YTD Write-Offs', value: fmt(ytdDeductibleCents), icon: TrendingUp, color: 'text-blue-600' },
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
      ) : null}

      {/* Primary Log Expense Button */}
      <Button className="w-full gap-2 h-12 text-base" onClick={() => setSheetOpen(true)}>
        <Plus className="h-5 w-5" />
        Log Expense
      </Button>

      {/* IRS Receipt Reminder */}
      <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <Receipt className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
          <span className="font-medium">IRS Receipt Rule:</span> The IRS requires documentation for all business expenses over $75. Upload receipts when logging expenses to protect your deductions in case of audit.
        </AlertDescription>
      </Alert>

      {/* Expense Log — only when there are expenses */}
      {hasExpenses && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Expense Log</h3>
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
          </div>

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
                        {(exp.recurrence_type === 'monthly' || exp.recurrence_type === 'yearly') && (
                          <Badge variant="outline" className="text-[10px] gap-1 text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 shrink-0">
                            <Repeat className="h-3 w-3" />
                            {exp.recurrence_type === 'monthly' ? 'Monthly' : 'Yearly'}
                          </Badge>
                        )}
                        {exp.recurrence_parent_id && (
                          <Badge variant="outline" className="text-[10px] gap-1 text-blue-600 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800 shrink-0">
                            <Repeat className="h-3 w-3" />
                            Auto
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
        </div>
      )}

      {/* Log Expense Bottom Sheet */}
      <LogExpenseSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onManualEntry={openNew}
      />

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
