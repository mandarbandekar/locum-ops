import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Car, Check, Info, MoreVertical, Sparkles } from 'lucide-react';
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
  const facilityMap: Record<string, { name: string; parent?: string }> = {};
  facilities.forEach(f => {
    facilityMap[f.id] = { name: f.name, parent: (f as any).parent_group || (f as any).parent_organization || undefined };
  });

  if (drafts.length === 0) return null;

  const fmt = (cents: number) => '$' + (cents / 100).toFixed(2);
  const totalCents = drafts.reduce((s, e) => s + e.amount_cents, 0);

  return (
    <div className="space-y-3">
      {/* Review queue header */}
      <div className="flex items-center justify-between rounded-xl border border-[#F0C77A] bg-[#FAEEDA] px-4 py-3">
        <div className="flex items-center gap-3">
          <Sparkles className="h-[18px] w-[18px] text-[#A07D3E] shrink-0" />
          <div>
            <p className="text-[14px] font-medium text-foreground">
              {fmt(totalCents)} ready to claim
            </p>
            <p className="text-[12px] text-muted-foreground">
              {drafts.length} {drafts.length === 1 ? 'trip' : 'trips'} auto-found from your shifts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <IrsCommuteTooltip />
          <Button
            size="sm"
            onClick={onConfirmAll}
            className="bg-[#1A5C6B] text-white hover:bg-[#1A5C6B]/90 text-[13px] font-medium h-9"
          >
            Confirm all
          </Button>
        </div>
      </div>

      {/* Per-row review cards */}
      <div className="space-y-2">
        {drafts.map(exp => {
          const fac = exp.facility_id ? facilityMap[exp.facility_id] : undefined;
          const clinicName = fac?.name || 'Mileage';
          const parent = fac?.parent;
          const dateStr = new Date(exp.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const subtitleParts = [dateStr];
          if (exp.mileage_miles) subtitleParts.push(`${exp.mileage_miles} mi round trip`);
          if (parent) subtitleParts.push(parent);

          return (
            <div
              key={exp.id}
              className="flex items-center gap-3 rounded-lg border border-[#F0C77A] bg-[#FAEEDA] px-3.5 py-3"
            >
              <Car className="h-[18px] w-[18px] text-[#A07D3E] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{clinicName}</p>
                <p className="text-[12px] text-muted-foreground truncate">{subtitleParts.join(' · ')}</p>
              </div>
              <p className="text-[16px] font-medium text-[#1A5C6B] shrink-0 tabular-nums">
                {fmt(exp.amount_cents)}
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => onConfirm(exp.id)}
                  title="Confirm"
                  className="h-[30px] w-[30px] rounded-lg border border-border/60 bg-white flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Check className="h-4 w-4 text-[#2D6B4A]" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      title="More options"
                      className="h-[30px] w-[30px] rounded-lg border border-border/60 bg-white flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(exp)}>
                      Edit details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDismiss(exp.id)}>
                      Not a work trip
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
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
