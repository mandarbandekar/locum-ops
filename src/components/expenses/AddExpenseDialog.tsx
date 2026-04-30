import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Repeat } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { MultiFileDropzone } from '@/components/ui/multi-file-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  onEdit?: (id: string, data: Partial<Expense>) => Promise<any>;
  uploadReceipt: (file: File) => Promise<string | null>;
  config: { irs_mileage_rate_cents: number; home_office_rate_cents: number };
  editingExpense?: Expense | null;
  initialSubcategory?: string;
}

export default function AddExpenseDialog({ open, onOpenChange, onSubmit, onEdit, uploadReceipt, config, editingExpense, initialSubcategory }: Props) {
  const { facilities } = useData();
  const today = new Date().toISOString().split('T')[0];
  const isEditing = !!editingExpense;

  const [date, setDate] = useState(today);
  const [subcategoryKey, setSubcategoryKey] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [facilityId, setFacilityId] = useState('none');
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<{ id: string; name: string }[]>([]);
  const { user } = useAuth();
  const [milesStr, setMilesStr] = useState('');
  const [sqftStr, setSqftStr] = useState('');
  const [proratePercent, setProratePercent] = useState(50);
  const [saving, setSaving] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<string>('none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  const sub = useMemo(() => findSubcategory(subcategoryKey), [subcategoryKey]);
  const parentGroup = useMemo(() =>
    EXPENSE_CATEGORIES.find(g => g.subcategories.some(s => s.key === subcategoryKey)),
  [subcategoryKey]);

  const isMileage = subcategoryKey === 'mileage';
  const isHomeOffice = subcategoryKey === 'home_office_deduction';
  const isProrate = needsProrate(subcategoryKey);
  const isMeals = subcategoryKey === 'business_meals';

  const calculatedCents = useMemo(() => {
    if (isMileage) return calculateMileageAmountCents(parseFloat(milesStr) || 0, config.irs_mileage_rate_cents);
    if (isHomeOffice) return calculateHomeOfficeAmountCents(parseFloat(sqftStr) || 0, config.home_office_rate_cents);
    if (isProrate) return Math.round((Math.round((parseFloat(amountStr) || 0) * 100)) * (proratePercent / 100));
    return null;
  }, [isMileage, isHomeOffice, isProrate, milesStr, sqftStr, amountStr, proratePercent, config]);

  useEffect(() => {
    if (isMileage || isHomeOffice) {
      setAmountStr(calculatedCents !== null ? (calculatedCents / 100).toFixed(2) : '');
    }
  }, [calculatedCents, isMileage, isHomeOffice]);

  // Reset / pre-fill form when opening
  useEffect(() => {
    if (!open) return;
    if (editingExpense) {
      setDate(editingExpense.expense_date);
      setSubcategoryKey(editingExpense.subcategory);
      setAmountStr((editingExpense.amount_cents / 100).toFixed(2));
      setDescription(editingExpense.description);
      setFacilityId(editingExpense.facility_id || 'none');
      setMilesStr(editingExpense.mileage_miles?.toString() || '');
      setSqftStr(editingExpense.home_office_sqft?.toString() || '');
      setProratePercent(editingExpense.prorate_percent ?? 50);
      setReceiptFiles([]);
      setRecurrenceType(editingExpense.recurrence_type || 'none');
      setRecurrenceEndDate(editingExpense.recurrence_end_date || '');
      // Load existing attachments
      (async () => {
        const { data } = await (supabase as any)
          .from('expense_attachments')
          .select('id, file_name')
          .eq('expense_id', editingExpense.id)
          .order('uploaded_at', { ascending: true });
        setExistingAttachments((data || []).map((d: any) => ({ id: d.id, name: d.file_name })));
      })();
    } else {
      setDate(today);
      setSubcategoryKey(initialSubcategory || '');
      setAmountStr('');
      setDescription('');
      setFacilityId('none');
      setReceiptFiles([]);
      setExistingAttachments([]);
      setMilesStr('');
      setSqftStr('');
      setProratePercent(50);
      setRecurrenceType('none');
      setRecurrenceEndDate('');
    }
  }, [open, editingExpense, initialSubcategory]);

  const removeExistingAttachment = async (id: string) => {
    await (supabase as any).from('expense_attachments').delete().eq('id', id);
    setExistingAttachments(prev => prev.filter(a => a.id !== id));
  };


  async function handleSubmit() {
    if (!subcategoryKey || !amountStr) return;
    setSaving(true);
    try {
      // Upload all newly selected receipt files
      const uploaded: { path: string; name: string; type: string }[] = [];
      for (const f of receiptFiles) {
        const path = await uploadReceipt(f);
        if (path) uploaded.push({ path, name: f.name, type: f.type });
      }

      // Legacy single receipt_url: keep first existing or first newly uploaded
      let receiptUrl: string | null = editingExpense?.receipt_url ?? null;
      if (!receiptUrl && uploaded.length > 0) receiptUrl = uploaded[0].path;

      const amountCents = Math.round((parseFloat(amountStr) || 0) * 100);
      const payload: Partial<Expense> = {
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
        recurrence_type: recurrenceType,
        recurrence_end_date: recurrenceEndDate || null,
      };

      let expenseId: string | undefined;
      if (isEditing && onEdit) {
        await onEdit(editingExpense!.id, payload);
        expenseId = editingExpense!.id;
      } else {
        const created = await onSubmit(payload);
        expenseId = (created as any)?.id;
      }

      // Persist additional attachment rows
      if (expenseId && uploaded.length > 0 && user) {
        await (supabase as any).from('expense_attachments').insert(
          uploaded.map(u => ({
            user_id: user.id,
            expense_id: expenseId,
            file_path: u.path,
            file_name: u.name,
            file_type: u.type,
          }))
        );
      }

      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} key={editingExpense?.id || 'new'}>
      <DialogContent className="max-w-[680px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Expense' : 'Log Expense'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>

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

            {isMileage && (
              <div>
                <Label>Miles Driven</Label>
                <Input type="number" placeholder="e.g. 45" value={milesStr} onChange={e => setMilesStr(e.target.value)} min={0} step="0.1" />
                <p className="text-xs text-muted-foreground mt-1">
                  IRS rate: ${(config.irs_mileage_rate_cents / 100).toFixed(2)}/mile
                  {milesStr && ` → $${(calculatedCents! / 100).toFixed(2)}`}
                </p>
              </div>
            )}

            {isHomeOffice && (
              <div>
                <Label>Dedicated Office Space (sq ft)</Label>
                <Input type="number" placeholder="e.g. 150" value={sqftStr} onChange={e => setSqftStr(e.target.value)} min={0} max={300} />
                <p className="text-xs text-muted-foreground mt-1">
                  Simplified method: ${(config.home_office_rate_cents / 100).toFixed(2)}/sq ft (max 300)
                  {sqftStr && ` → $${(calculatedCents! / 100).toFixed(2)}`}
                </p>
              </div>
            )}

            {isProrate && (
              <div>
                <Label>Business Use: {proratePercent}%</Label>
                <Slider value={[proratePercent]} onValueChange={v => setProratePercent(v[0])} min={0} max={100} step={5} className="mt-2" />
                {amountStr && calculatedCents !== null && (
                  <p className="text-xs text-muted-foreground mt-1">Deductible portion: ${(calculatedCents / 100).toFixed(2)}</p>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            <div>
              <Label>Amount ($)</Label>
              <Input type="number" placeholder="0.00" value={amountStr} onChange={e => setAmountStr(e.target.value)} min={0} step="0.01" disabled={isMileage || isHomeOffice} />
              {isMeals && amountStr && (
                <p className="text-xs text-muted-foreground mt-1">50% deductible: ${((parseFloat(amountStr) || 0) * 0.5).toFixed(2)}</p>
              )}
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea placeholder="What was this for?" value={description} onChange={e => setDescription(e.target.value)} className="min-h-[60px]" />
            </div>

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

            <div>
              <Label>Receipt (optional)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => document.getElementById('receipt-input')?.click()}>
                  <Camera className="h-4 w-4" />
                  {receiptFile ? receiptFile.name : (editingExpense?.receipt_url ? 'Replace Receipt' : 'Upload Receipt')}
                </Button>
                <input id="receipt-input" type="file" accept="image/*,.pdf" className="hidden" onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
              </div>
            </div>
          </div>
        </div>

        {/* Recurrence - full width below the grid */}
        {!isMileage && (
          <div className="border rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Recurring Expense</Label>
            </div>
            <RadioGroup value={recurrenceType} onValueChange={setRecurrenceType} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="rec-none" />
                <Label htmlFor="rec-none" className="text-sm font-normal cursor-pointer">One-time</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="rec-monthly" />
                <Label htmlFor="rec-monthly" className="text-sm font-normal cursor-pointer">Monthly</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yearly" id="rec-yearly" />
                <Label htmlFor="rec-yearly" className="text-sm font-normal cursor-pointer">Yearly</Label>
              </div>
            </RadioGroup>
            {recurrenceType !== 'none' && (
              <div>
                <Label className="text-xs text-muted-foreground">End date (optional)</Label>
                <Input type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">
                  This expense will automatically repeat {recurrenceType === 'monthly' ? 'every month' : 'every year'} on the same day. Leave end date blank for indefinite.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Submit - full width below the grid */}
        <Button className="w-full mt-2" onClick={handleSubmit} disabled={saving || !subcategoryKey || !amountStr}>
          {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Log Expense'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
