import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Camera, HelpCircle } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import {
  EXPENSE_CATEGORIES,
  findSubcategory,
  calculateMileageAmountCents,
  calculateHomeOfficeAmountCents,
  needsProrate,
  getDeductibilityLabel,
} from '@/lib/expenseCategories';
import type { Expense } from '@/hooks/useExpenses';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Expense>) => Promise<Expense | null>;
  uploadReceipt: (file: File) => Promise<string | null>;
  config: { irs_mileage_rate_cents: number; home_office_rate_cents: number };
}

export default function AddExpenseDialog({ open, onOpenChange, onSubmit, uploadReceipt, config }: Props) {
  const { facilities } = useData();
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [subcategoryKey, setSubcategoryKey] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [facilityId, setFacilityId] = useState('none');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [milesStr, setMilesStr] = useState('');
  const [sqftStr, setSqftStr] = useState('');
  const [proratePercent, setProratePercent] = useState(50);
  const [saving, setSaving] = useState(false);

  const sub = useMemo(() => findSubcategory(subcategoryKey), [subcategoryKey]);
  const parentGroup = useMemo(() =>
    EXPENSE_CATEGORIES.find(g => g.subcategories.some(s => s.key === subcategoryKey)),
  [subcategoryKey]);

  const isMileage = subcategoryKey === 'mileage';
  const isHomeOffice = subcategoryKey === 'home_office_deduction';
  const isProrate = needsProrate(subcategoryKey);
  const isMeals = subcategoryKey === 'business_meals';

  // Auto-calculate amount for special categories
  const calculatedCents = useMemo(() => {
    if (isMileage) {
      const miles = parseFloat(milesStr) || 0;
      return calculateMileageAmountCents(miles, config.irs_mileage_rate_cents);
    }
    if (isHomeOffice) {
      const sqft = parseFloat(sqftStr) || 0;
      return calculateHomeOfficeAmountCents(sqft, config.home_office_rate_cents);
    }
    if (isProrate) {
      const gross = Math.round((parseFloat(amountStr) || 0) * 100);
      return Math.round(gross * (proratePercent / 100));
    }
    return null;
  }, [isMileage, isHomeOffice, isProrate, milesStr, sqftStr, amountStr, proratePercent, config]);

  // Set displayed amount for calculated categories
  useEffect(() => {
    if (isMileage || isHomeOffice) {
      setAmountStr(calculatedCents !== null ? (calculatedCents / 100).toFixed(2) : '');
    }
  }, [calculatedCents, isMileage, isHomeOffice]);

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setDate(today);
      setSubcategoryKey('');
      setAmountStr('');
      setDescription('');
      setFacilityId('none');
      setReceiptFile(null);
      setMilesStr('');
      setSqftStr('');
      setProratePercent(50);
    }
  }, [open]);

  async function handleSubmit() {
    if (!subcategoryKey || !amountStr) return;
    setSaving(true);
    try {
      let receiptUrl: string | null = null;
      if (receiptFile) receiptUrl = await uploadReceipt(receiptFile);

      const amountCents = Math.round((parseFloat(amountStr) || 0) * 100);
      await onSubmit({
        expense_date: date,
        amount_cents: amountCents,
        category: parentGroup?.key || '',
        subcategory: subcategoryKey,
        description,
        facility_id: facilityId !== 'none' ? facilityId : null,
        receipt_url: receiptUrl,
        mileage_miles: isMileage ? parseFloat(milesStr) || null : null,
        home_office_sqft: isHomeOffice ? parseFloat(sqftStr) || null : null,
        prorate_percent: isProrate ? proratePercent : null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Expense</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Date */}
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Category */}
          <div>
            <Label>Category</Label>
            <Select value={subcategoryKey} onValueChange={setSubcategoryKey}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category…" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {EXPENSE_CATEGORIES.map(group => (
                  <SelectGroup key={group.key}>
                    <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </SelectLabel>
                    {group.subcategories.map(s => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {sub && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Badge variant="outline" className="text-[10px]">
                  {getDeductibilityLabel(sub.deductibilityType)}
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[220px]">
                      <p className="text-xs">{sub.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>

          {/* Mileage input */}
          {isMileage && (
            <div>
              <Label>Miles Driven</Label>
              <Input
                type="number"
                placeholder="e.g. 45"
                value={milesStr}
                onChange={e => setMilesStr(e.target.value)}
                min={0}
                step="0.1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                IRS rate: ${(config.irs_mileage_rate_cents / 100).toFixed(2)}/mile
                {milesStr && ` → $${(calculatedCents! / 100).toFixed(2)}`}
              </p>
            </div>
          )}

          {/* Home office input */}
          {isHomeOffice && (
            <div>
              <Label>Dedicated Office Space (sq ft)</Label>
              <Input
                type="number"
                placeholder="e.g. 150"
                value={sqftStr}
                onChange={e => setSqftStr(e.target.value)}
                min={0}
                max={300}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Simplified method: ${(config.home_office_rate_cents / 100).toFixed(2)}/sq ft (max 300)
                {sqftStr && ` → $${(calculatedCents! / 100).toFixed(2)}`}
              </p>
            </div>
          )}

          {/* Prorate slider */}
          {isProrate && (
            <div>
              <Label>Business Use: {proratePercent}%</Label>
              <Slider
                value={[proratePercent]}
                onValueChange={v => setProratePercent(v[0])}
                min={0}
                max={100}
                step={5}
                className="mt-2"
              />
              {amountStr && calculatedCents !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Deductible portion: ${(calculatedCents / 100).toFixed(2)}
                </p>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <Label>Amount ($)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
              min={0}
              step="0.01"
              disabled={isMileage || isHomeOffice}
            />
            {isMeals && amountStr && (
              <p className="text-xs text-muted-foreground mt-1">
                50% deductible: ${((parseFloat(amountStr) || 0) * 0.5).toFixed(2)}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="What was this for?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          {/* Clinic tag */}
          <div>
            <Label>Clinic (optional)</Label>
            <Select value={facilityId} onValueChange={setFacilityId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {facilities.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Receipt upload */}
          <div>
            <Label>Receipt (optional)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => document.getElementById('receipt-input')?.click()}
              >
                <Camera className="h-4 w-4" />
                {receiptFile ? receiptFile.name : 'Upload Receipt'}
              </Button>
              <input
                id="receipt-input"
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={e => setReceiptFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={saving || !subcategoryKey || !amountStr}
          >
            {saving ? 'Saving…' : 'Log Expense'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
