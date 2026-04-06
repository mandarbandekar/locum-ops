import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { PLMonthRow, PLQuarterRow, PLRow } from '@/hooks/useCPAPrepData';

const fmt = (c: number) => `$${(Math.abs(c) / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
const sign = (c: number) => c < 0 ? `-${fmt(c)}` : fmt(c);

interface Props { monthly: PLMonthRow[]; quarterly: PLQuarterRow[]; byCategory: PLRow[]; totalIncomeCents: number; totalExpenseCents: number }

export default function ProfitLossSummary({ monthly, quarterly, byCategory, totalIncomeCents, totalExpenseCents }: Props) {
  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div><p className="text-xs text-muted-foreground">Income</p><p className="text-lg font-bold text-green-600 dark:text-green-400">{fmt(totalIncomeCents)}</p></div>
        <div><p className="text-xs text-muted-foreground">Expenses</p><p className="text-lg font-bold text-red-600 dark:text-red-400">{fmt(totalExpenseCents)}</p></div>
        <div><p className="text-xs text-muted-foreground">Net Income</p><p className="text-lg font-bold">{sign(totalIncomeCents - totalExpenseCents)}</p></div>
      </div>

      {/* Expense by category */}
      {byCategory.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Expenses by Category</p>
          <div className="space-y-1">
            {byCategory.map(r => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-medium">{fmt(r.amountCents)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="quarterly" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="quarterly" className="flex-1">Quarterly</TabsTrigger>
          <TabsTrigger value="monthly" className="flex-1">Monthly</TabsTrigger>
        </TabsList>
        <TabsContent value="quarterly">
          <Table>
            <TableHeader><TableRow><TableHead>Quarter</TableHead><TableHead className="text-right">Income</TableHead><TableHead className="text-right">Expenses</TableHead><TableHead className="text-right">Net</TableHead></TableRow></TableHeader>
            <TableBody>
              {quarterly.map(r => (
                <TableRow key={r.quarter}><TableCell>{r.quarter}</TableCell><TableCell className="text-right">{fmt(r.incomeCents)}</TableCell><TableCell className="text-right">{fmt(r.expenseCents)}</TableCell><TableCell className="text-right font-medium">{sign(r.netCents)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="monthly">
          <Table>
            <TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Income</TableHead><TableHead className="text-right">Expenses</TableHead><TableHead className="text-right">Net</TableHead></TableRow></TableHeader>
            <TableBody>
              {monthly.filter(r => r.incomeCents > 0 || r.expenseCents > 0).map(r => (
                <TableRow key={r.month}><TableCell>{r.month}</TableCell><TableCell className="text-right">{fmt(r.incomeCents)}</TableCell><TableCell className="text-right">{fmt(r.expenseCents)}</TableCell><TableCell className="text-right font-medium">{sign(r.netCents)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
