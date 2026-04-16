import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Receipt } from 'lucide-react';
import ExpenseLogTab from '@/components/expenses/ExpenseLogTab';
import MileageTrackerTab from '@/components/expenses/MileageTrackerTab';
import ExpenseSummaryTab from '@/components/expenses/ExpenseSummaryTab';
import { useExpenses } from '@/hooks/useExpenses';
import { useTaxIntelligence } from '@/hooks/useTaxIntelligence';

export default function ExpensesPage() {
  const expenseData = useExpenses();
  const { profile: taxProfile } = useTaxIntelligence();
  const draftCount = expenseData.draftMileageExpenses.length;

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

      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="mileage" className="gap-1.5">
            Mileage
            {draftCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold">
                {draftCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="summary">Write-Off Summary</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses">
          <ExpenseLogTab {...expenseData} taxProfile={taxProfile} />
        </TabsContent>
        <TabsContent value="mileage">
          <MileageTrackerTab {...expenseData} />
        </TabsContent>
        <TabsContent value="summary">
          <ExpenseSummaryTab {...expenseData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
