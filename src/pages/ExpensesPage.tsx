import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ExpenseLogTab from '@/components/expenses/ExpenseLogTab';
import MileageTrackerTab from '@/components/expenses/MileageTrackerTab';
import ExpenseSummaryTab from '@/components/expenses/ExpenseSummaryTab';
import { useExpenses } from '@/hooks/useExpenses';

export default function ExpensesPage() {
  const expenseData = useExpenses();
  const draftCount = expenseData.draftMileageExpenses.length;

  return (
    <Tabs defaultValue="tracker" className="space-y-4">
      <TabsList>
        <TabsTrigger value="tracker">Expense Tracker</TabsTrigger>
        <TabsTrigger value="mileage" className="gap-1.5">
          Mileage Tracker
          {draftCount > 0 && (
            <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold">
              {draftCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="summary">Write-Off Summary</TabsTrigger>
      </TabsList>
      <TabsContent value="tracker">
        <ExpenseLogTab {...expenseData} />
      </TabsContent>
      <TabsContent value="mileage">
        <MileageTrackerTab {...expenseData} />
      </TabsContent>
      <TabsContent value="summary">
        <ExpenseSummaryTab {...expenseData} />
      </TabsContent>
    </Tabs>
  );
}
