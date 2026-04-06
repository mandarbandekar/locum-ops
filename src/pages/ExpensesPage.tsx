import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ExpenseLogTab from '@/components/expenses/ExpenseLogTab';
import ExpenseSummaryTab from '@/components/expenses/ExpenseSummaryTab';
import { useExpenses } from '@/hooks/useExpenses';

export default function ExpensesPage() {
  const expenseData = useExpenses();
  const draftCount = expenseData.draftMileageExpenses.length;

  return (
    <Tabs defaultValue="tracker" className="space-y-4">
      <TabsList>
        <TabsTrigger value="tracker" className="gap-1.5">
          Expense Tracker
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
      <TabsContent value="summary">
        <ExpenseSummaryTab {...expenseData} />
      </TabsContent>
    </Tabs>
  );
}
