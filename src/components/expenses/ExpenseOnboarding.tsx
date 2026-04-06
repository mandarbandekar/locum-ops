import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Receipt, Car, Briefcase, ShieldCheck, GraduationCap,
  TrendingUp, Download, ArrowRight, Plus, Sparkles,
  Home, Utensils, Phone
} from 'lucide-react';

interface Props {
  onAddExpense: () => void;
}

const HOW_IT_WORKS_STEPS = [
  {
    icon: Plus,
    title: 'Log expenses as you go',
    description: 'Add mileage, meals, CE fees, insurance, and more — takes under 30 seconds each.',
  },
  {
    icon: Sparkles,
    title: 'Auto-calculated deductions',
    description: 'Mileage uses the IRS rate, meals auto-flag at 50%, and home office calculates from square footage.',
  },
  {
    icon: TrendingUp,
    title: 'Track your write-offs',
    description: 'See running YTD totals by category and deductibility type — know where you stand at any time.',
  },
  {
    icon: Download,
    title: 'Export for your CPA',
    description: 'One-click CSV export with every column your accountant needs. No more shoebox of receipts.',
  },
];

const COMMON_CATEGORIES = [
  { icon: Car, label: 'Mileage', detail: '$0.70/mi IRS rate', color: 'text-blue-600' },
  { icon: GraduationCap, label: 'CE & Licensing', detail: '100% deductible', color: 'text-purple-600' },
  { icon: ShieldCheck, label: 'Insurance', detail: 'Malpractice, health', color: 'text-emerald-600' },
  { icon: Utensils, label: 'Business Meals', detail: '50% deductible', color: 'text-orange-600' },
  { icon: Home, label: 'Home Office', detail: '$5/sq ft simplified', color: 'text-rose-600' },
  { icon: Phone, label: 'Phone & Internet', detail: 'Business % only', color: 'text-cyan-600' },
  { icon: Briefcase, label: 'Equipment', detail: 'Stethoscope, scrubs…', color: 'text-amber-600' },
];

export function ExpenseOnboarding({ onAddExpense }: Props) {
  return (
    <div className="max-w-3xl mx-auto py-6 space-y-8">
      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Receipt className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Expense Tracker</h2>
          <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Built for relief vets, not generic freelancers. Every category is tailored to your 
            1099 life — mileage between clinics, CE courses, malpractice insurance, and more.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-center">How it works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <Card key={step.title} className="border-border/50">
              <CardContent className="p-4 flex gap-3">
                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 shrink-0">
                  <step.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Common categories preview */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-center">
          What you can track
        </h3>
        <div className="flex flex-wrap justify-center gap-2">
          {COMMON_CATEGORIES.map(cat => (
            <Badge
              key={cat.label}
              variant="outline"
              className="gap-1.5 py-1.5 px-3 text-xs font-medium border-border/60"
            >
              <cat.icon className={`h-3.5 w-3.5 ${cat.color}`} />
              {cat.label}
              <span className="text-muted-foreground font-normal">· {cat.detail}</span>
            </Badge>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 text-center space-y-3">
          <h3 className="text-lg font-bold">Ready to start tracking?</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Log your first expense — we'll auto-calculate the deductible amount and start building your YTD summary.
          </p>
          <Button size="lg" className="gap-2" onClick={onAddExpense}>
            <Plus className="h-4 w-4" /> Log Your First Expense
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
