import { useSearchParams } from 'react-router-dom';
import { Receipt, Car, ClipboardList } from 'lucide-react';
import ExpenseLogTab from '@/components/expenses/ExpenseLogTab';
import MileageTrackerTab from '@/components/expenses/MileageTrackerTab';
import ExpenseSummaryTab from '@/components/expenses/ExpenseSummaryTab';
import { useExpenses } from '@/hooks/useExpenses';
import { useTaxIntelligence } from '@/hooks/useTaxIntelligence';

export default function ExpensesPage() {
  const expenseData = useExpenses();
  const { profile: taxProfile } = useTaxIntelligence();
  const draftCount = expenseData.draftMileageExpenses.length;

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'expenses';
  const setTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Receipt className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="page-title">Expense and Mileage Tracking</h1>
            <p className="page-subtitle">Track business expenses, mileage, and tax write-offs</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 sm:gap-3 flex-wrap">
        <button
          onClick={() => setTab('expenses')}
          className={`primary-tab-btn ${activeTab === 'expenses' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Expenses</span>
        </button>
        <button
          onClick={() => setTab('mileage')}
          className={`primary-tab-btn relative ${activeTab === 'mileage' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <Car className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Mileage Tracker</span>
          {draftCount > 0 && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive" />
          )}
        </button>
        <button
          onClick={() => setTab('summary')}
          className={`primary-tab-btn ${activeTab === 'summary' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Write-Off Summary</span>
        </button>
      </div>

      {activeTab === 'expenses' && <ExpenseLogTab {...expenseData} taxProfile={taxProfile} />}
      {activeTab === 'mileage' && <MileageTrackerTab {...expenseData} />}
      {activeTab === 'summary' && <ExpenseSummaryTab {...expenseData} />}
    </div>
  );
}
