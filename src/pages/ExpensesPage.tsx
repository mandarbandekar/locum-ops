import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ExpenseLogTab from '@/components/expenses/ExpenseLogTab';
import ExpenseSummaryTab from '@/components/expenses/ExpenseSummaryTab';
import { useExpenses } from '@/hooks/useExpenses';

export default function ExpensesPage() {
  const expenseData = useExpenses();

  return (
    <Tabs defaultValue="log" className="space-y-4">
      <TabsList>
        <TabsTrigger value="log">Expenses</TabsTrigger>
        <TabsTrigger value="summary">Write-Off Summary</TabsTrigger>
      </TabsList>
      <TabsContent value="log">
        <ExpenseLogTab {...expenseData} />
      </TabsContent>
      <TabsContent value="summary">
        <ExpenseSummaryTab {...expenseData} />
      </TabsContent>
    </Tabs>
  );
}
