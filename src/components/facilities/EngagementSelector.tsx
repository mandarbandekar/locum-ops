import { Building2, Briefcase } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import {
  THIRD_PARTY_PRESETS,
  type EngagementType,
  type TaxFormType,
} from '@/lib/engagementOptions';

interface Props {
  engagementType: EngagementType;
  onEngagementTypeChange: (t: EngagementType) => void;
  sourceName: string;
  onSourceNameChange: (s: string) => void;
  taxFormType: TaxFormType;
  onTaxFormTypeChange: (t: TaxFormType) => void;
  /** Whether LocumOps generates invoices for this direct facility. */
  generatesInvoices?: boolean;
  onGeneratesInvoicesChange?: (v: boolean) => void;
  /** Whether to render a compact title instead of large heading (used in dialogs). */
  compact?: boolean;
}

const OPTIONS: { value: EngagementType; title: string; sub: string; icon: typeof Building2 }[] = [
  { value: 'direct', title: 'Direct / Independent', sub: 'You bill the clinic yourself', icon: Building2 },
  { value: 'third_party', title: 'Via Platform or Agency', sub: 'Roo, IndeVets, staffing firm', icon: Briefcase },
];

export function EngagementSelector({
  engagementType,
  onEngagementTypeChange,
  sourceName,
  onSourceNameChange,
  taxFormType,
  onTaxFormTypeChange,
  generatesInvoices = true,
  onGeneratesInvoicesChange,
  compact,
}: Props) {
  const isThird = engagementType === 'third_party';
  const isDirect = engagementType === 'direct';

  const presets = THIRD_PARTY_PRESETS;
  const isOther = !!sourceName && !(presets as readonly string[]).includes(sourceName);
  const selectValue = !sourceName ? '' : isOther ? '__other__' : sourceName;

  const sourceDisplay = sourceName.trim() || 'the platform';

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className={compact ? 'text-sm font-medium' : 'text-base font-semibold'}>
          How do you work with this facility? <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          This determines whether LocumOps generates invoices for these shifts.
        </p>
      </div>

      <RadioGroup
        value={engagementType}
        onValueChange={(v) => onEngagementTypeChange(v as EngagementType)}
        className="grid grid-cols-1 gap-2"
      >
        {OPTIONS.map(({ value, title, sub, icon: Icon }) => {
          const selected = engagementType === value;
          return (
            <label
              key={value}
              htmlFor={`eng-${value}`}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                selected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border hover:border-primary/40 hover:bg-muted/40',
              )}
            >
              <RadioGroupItem id={`eng-${value}`} value={value} className="mt-0.5" />
              <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')} />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
            </label>
          );
        })}
      </RadioGroup>

      {isDirect && onGeneratesInvoicesChange && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="space-y-1">
            <Label className="text-xs">Do you send this clinic invoices?</Label>
            <p className="text-[11px] text-muted-foreground">
              Some clinics pay you directly via deposit and issue a 1099 — no invoice needed.
            </p>
          </div>
          <RadioGroup
            value={generatesInvoices ? 'yes' : 'no'}
            onValueChange={(v) => onGeneratesInvoicesChange(v === 'yes')}
            className="grid grid-cols-1 gap-2"
          >
            <label
              htmlFor="gi-yes"
              className={cn(
                'flex items-start gap-2 rounded-md border p-2.5 cursor-pointer transition-colors',
                generatesInvoices
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border hover:border-primary/40 hover:bg-muted/40',
              )}
            >
              <RadioGroupItem id="gi-yes" value="yes" className="mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">Yes — I send invoices</p>
                <p className="text-xs text-muted-foreground mt-0.5">LocumOps will generate invoices for these shifts.</p>
              </div>
            </label>
            <label
              htmlFor="gi-no"
              className={cn(
                'flex items-start gap-2 rounded-md border p-2.5 cursor-pointer transition-colors',
                !generatesInvoices
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border hover:border-primary/40 hover:bg-muted/40',
              )}
            >
              <RadioGroupItem id="gi-no" value="no" className="mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">No — clinic pays me directly and issues a 1099</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We won't generate invoices. Shifts still count toward your 1099 income and tax projections.
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>
      )}

      {isThird && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Platform or agency name</Label>
            <Select
              value={selectValue}
              onValueChange={(v) => {
                if (v === '__other__') onSourceNameChange('');
                else onSourceNameChange(v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
                <SelectItem value="__other__">Other…</SelectItem>
              </SelectContent>
            </Select>
            {(isOther || (selectValue === '__other__')) && (
              <Input
                value={sourceName}
                onChange={(e) => onSourceNameChange(e.target.value)}
                placeholder="Platform or agency name"
                autoFocus
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">How does {sourceDisplay} pay you?</Label>
            <RadioGroup
              value={taxFormType}
              onValueChange={(v) => onTaxFormTypeChange(v as TaxFormType)}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="1099" id="tax-1099" />
                <span className="text-sm">1099</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="w2" id="tax-w2" />
                <span className="text-sm">W-2</span>
              </label>
            </RadioGroup>
          </div>

          <p className="text-xs text-muted-foreground">
            We won't generate invoices for these shifts — {sourceDisplay} handles billing. We'll still track your earnings and taxes.
          </p>
        </div>
      )}
    </div>
  );
}
