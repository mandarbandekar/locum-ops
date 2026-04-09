import { VET_DEDUCTIONS, type StrategyInputs } from '@/lib/taxStrategies';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DollarSign } from 'lucide-react';

interface Props {
  inputs: StrategyInputs;
  combinedRate: number;
  onUpdate: (patch: Partial<StrategyInputs>) => void;
}

export default function DeductionChecklist({ inputs, combinedRate, onUpdate }: Props) {
  const checklist = inputs.deduction_checklist;

  const toggleItem = (key: string, defaultAmount: number) => {
    const current = { ...checklist };
    if (current[key] !== undefined) {
      delete current[key];
    } else {
      current[key] = defaultAmount;
    }
    onUpdate({ deduction_checklist: current });
  };

  const updateAmount = (key: string, value: number) => {
    const current = { ...checklist };
    current[key] = value;
    onUpdate({ deduction_checklist: current });
  };

  const totalDeductions = Object.values(checklist).reduce((s, v) => s + (v || 0), 0);
  const taxSavings = Math.round(totalDeductions * combinedRate);

  return (
    <div className="space-y-3">
      {VET_DEDUCTIONS.map(item => {
        const isChecked = checklist[item.key] !== undefined;
        const amount = checklist[item.key] ?? item.defaultAmount;

        return (
          <div key={item.key} className="flex items-center gap-3">
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => toggleItem(item.key, item.defaultAmount)}
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${isChecked ? 'text-foreground' : 'text-muted-foreground'}`}>
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <div className="relative w-24 shrink-0">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="number"
                value={isChecked ? amount : ''}
                placeholder={String(item.defaultAmount)}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  if (!isChecked) toggleItem(item.key, val);
                  else updateAmount(item.key, val);
                }}
                className="pl-7 h-8 text-sm"
              />
            </div>
          </div>
        );
      })}

      <div className="pt-3 border-t border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Total deductible expenses</p>
          <p className="text-xs text-muted-foreground">{Object.keys(checklist).length} of {VET_DEDUCTIONS.length} items tracked</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-foreground">${totalDeductions.toLocaleString()}</p>
          <p className="text-xs text-emerald-500 font-medium">≈ ${taxSavings.toLocaleString()} tax savings</p>
        </div>
      </div>
    </div>
  );
}
