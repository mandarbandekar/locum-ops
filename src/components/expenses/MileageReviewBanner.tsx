import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Car, Check, X, Info, CheckCheck } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import type { Expense } from '@/hooks/useExpenses';

interface Props {
  drafts: Expense[];
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
  onConfirmAll: () => void;
  onEdit: (exp: Expense) => void;
}

export function MileageReviewBanner({ drafts, onConfirm, onDismiss, onConfirmAll, onEdit }: Props) {
  const { facilities } = useData();
  const facilityMap: Record<string, string> = {};
  facilities.forEach(f => { facilityMap[f.id] = f.name; });

  if (drafts.length === 0) return null;

  const fmt = (cents: number) => '$' + (cents / 100).toFixed(2);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Car className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {drafts.length} mileage {drafts.length === 1 ? 'entry' : 'entries'} to review
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Auto-calculated from your completed shifts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IrsCommuteTooltip />
          <Button size="sm" variant="outline" className="gap-1.5 text-xs border-amber-300 dark:border-amber-700" onClick={onConfirmAll}>
            <CheckCheck className="h-3.5 w-3.5" />
            Confirm All
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {drafts.map(exp => (
          <Card key={exp.id} className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <Car className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {exp.facility_id && facilityMap[exp.facility_id]
                      ? facilityMap[exp.facility_id]
                      : 'Mileage'}
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                    Pending Review
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{new Date(exp.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  {exp.mileage_miles && <span>· {exp.mileage_miles} mi</span>}
                  {(exp as any).route_description && <span className="truncate">· {(exp as any).route_description}</span>}
                </div>
              </div>
              <p className="font-semibold text-sm shrink-0">{fmt(exp.amount_cents)}</p>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30" onClick={() => onConfirm(exp.id)} title="Confirm">
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => onEdit(exp)} title="Edit">
                  <Car className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDismiss(exp.id)} title="Dismiss">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function IrsCommuteTooltip() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          <p className="font-medium mb-1">IRS Mileage Deduction</p>
          <p>Relief vets with no fixed office can typically deduct all business travel to clinics. If you have a home office, all trips from home are generally considered business travel. Consult your CPA for your specific situation.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
