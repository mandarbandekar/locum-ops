import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { calculateDeductibleCents, findSubcategory } from '@/lib/expenseCategories';

const db = (table: string) => supabase.from(table as any);

export interface Expense {
  id: string;
  user_id: string;
  expense_date: string;
  amount_cents: number;
  category: string;
  subcategory: string;
  description: string;
  facility_id: string | null;
  shift_id: string | null;
  receipt_url: string | null;
  deductible_amount_cents: number;
  deductibility_type: string;
  mileage_miles: number | null;
  home_office_sqft: number | null;
  prorate_percent: number | null;
  is_auto_mileage: boolean;
  mileage_status: string;
  route_description: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseConfig {
  id: string;
  user_id: string;
  irs_mileage_rate_cents: number;
  home_office_rate_cents: number;
  tax_year: number;
}

const DEFAULT_CONFIG: Omit<ExpenseConfig, 'id' | 'user_id'> = {
  irs_mileage_rate_cents: 70,
  home_office_rate_cents: 500,
  tax_year: new Date().getFullYear(),
};

export function useExpenses() {
  const { user, isDemo } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [config, setConfig] = useState<ExpenseConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const loadExpenses = useCallback(async () => {
    if (isDemo || !user) { setLoading(false); return; }
    setLoading(true);
    try {
      const [eRes, cRes] = await Promise.all([
        db('expenses').select('*').order('expense_date', { ascending: false }),
        db('expense_config').select('*').maybeSingle(),
      ]);
      if (eRes.data) setExpenses(eRes.data as any as Expense[]);
      if (cRes.data) setConfig(cRes.data as any as ExpenseConfig);
    } catch (e) {
      console.error('Failed to load expenses', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isDemo]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const effectiveConfig = useMemo(() => ({
    irs_mileage_rate_cents: config?.irs_mileage_rate_cents ?? DEFAULT_CONFIG.irs_mileage_rate_cents,
    home_office_rate_cents: config?.home_office_rate_cents ?? DEFAULT_CONFIG.home_office_rate_cents,
    tax_year: config?.tax_year ?? DEFAULT_CONFIG.tax_year,
  }), [config]);

  const addExpense = useCallback(async (data: Partial<Expense>) => {
    if (!user) return null;
    const sub = findSubcategory(data.subcategory || '');
    const deductibilityType = sub?.deductibilityType || 'full';
    const deductibleCents = calculateDeductibleCents(data.amount_cents || 0, data.subcategory || '');

    const row = {
      user_id: user.id,
      expense_date: data.expense_date || new Date().toISOString().split('T')[0],
      amount_cents: data.amount_cents || 0,
      category: data.category || '',
      subcategory: data.subcategory || '',
      description: data.description || '',
      facility_id: data.facility_id || null,
      shift_id: data.shift_id || null,
      receipt_url: data.receipt_url || null,
      deductible_amount_cents: deductibleCents,
      deductibility_type: deductibilityType,
      mileage_miles: data.mileage_miles ?? null,
      home_office_sqft: data.home_office_sqft ?? null,
      prorate_percent: data.prorate_percent ?? null,
    };

    if (isDemo) {
      const fake: Expense = { ...row, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      setExpenses(prev => [fake, ...prev]);
      toast.success('Expense logged');
      return fake;
    }

    const { data: inserted, error } = await db('expenses').insert(row as any).select().single();
    if (error) { toast.error('Failed to save expense'); return null; }
    const newExp = inserted as any as Expense;
    setExpenses(prev => [newExp, ...prev]);
    toast.success('Expense logged');
    return newExp;
  }, [user, isDemo]);

  const editExpense = useCallback(async (id: string, data: Partial<Expense>) => {
    if (!user) return null;
    const sub = findSubcategory(data.subcategory || '');
    const deductibilityType = sub?.deductibilityType || 'full';
    const deductibleCents = calculateDeductibleCents(data.amount_cents || 0, data.subcategory || '');

    const updates: Record<string, unknown> = {};
    if (data.expense_date !== undefined) updates.expense_date = data.expense_date;
    if (data.amount_cents !== undefined) updates.amount_cents = data.amount_cents;
    if (data.category !== undefined) updates.category = data.category;
    if (data.subcategory !== undefined) { updates.subcategory = data.subcategory; updates.deductibility_type = deductibilityType; updates.deductible_amount_cents = deductibleCents; }
    if (data.description !== undefined) updates.description = data.description;
    if (data.facility_id !== undefined) updates.facility_id = data.facility_id;
    if (data.receipt_url !== undefined) updates.receipt_url = data.receipt_url;
    if (data.mileage_miles !== undefined) updates.mileage_miles = data.mileage_miles;
    if (data.home_office_sqft !== undefined) updates.home_office_sqft = data.home_office_sqft;
    if (data.prorate_percent !== undefined) updates.prorate_percent = data.prorate_percent;

    if (isDemo) {
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } as Expense : e));
      toast.success('Expense updated');
      return;
    }

    const { data: updated, error } = await db('expenses').update(updates as any).eq('id', id).select().single();
    if (error) { toast.error('Failed to update expense'); return null; }
    const exp = updated as any as Expense;
    setExpenses(prev => prev.map(e => e.id === id ? exp : e));
    toast.success('Expense updated');
    return exp;
  }, [user, isDemo]);

  const deleteExpense = useCallback(async (id: string) => {
    if (isDemo) {
      setExpenses(prev => prev.filter(e => e.id !== id));
      toast.success('Expense deleted');
      return;
    }
    const { error } = await db('expenses').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setExpenses(prev => prev.filter(e => e.id !== id));
    toast.success('Expense deleted');
  }, [isDemo]);

  const uploadReceipt = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('expense-receipts').upload(path, file);
    if (error) { toast.error('Failed to upload receipt'); return null; }
    return path;
  }, [user]);

  // YTD aggregations
  const currentYear = new Date().getFullYear();
  const ytdExpenses = useMemo(() =>
    expenses.filter(e => new Date(e.expense_date).getFullYear() === currentYear),
  [expenses, currentYear]);

  const ytdTotalCents = useMemo(() => ytdExpenses.reduce((s, e) => s + e.amount_cents, 0), [ytdExpenses]);
  const ytdDeductibleCents = useMemo(() => ytdExpenses.reduce((s, e) => s + e.deductible_amount_cents, 0), [ytdExpenses]);

  const ytdByCategory = useMemo(() => {
    const map: Record<string, { totalCents: number; deductibleCents: number; count: number }> = {};
    ytdExpenses.forEach(e => {
      const key = e.category;
      if (!map[key]) map[key] = { totalCents: 0, deductibleCents: 0, count: 0 };
      map[key].totalCents += e.amount_cents;
      map[key].deductibleCents += e.deductible_amount_cents;
      map[key].count += 1;
    });
    return map;
  }, [ytdExpenses]);

  const categoriesTracked = useMemo(() => Object.keys(ytdByCategory).length, [ytdByCategory]);

  // This month's total
  const thisMonthCents = useMemo(() => {
    const now = new Date();
    return expenses.filter(e => {
      const d = new Date(e.expense_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, e) => s + e.amount_cents, 0);
  }, [expenses]);

  // Draft mileage entries
  const draftMileageExpenses = useMemo(() =>
    expenses.filter(e => e.is_auto_mileage && e.mileage_status === 'draft'),
  [expenses]);

  const confirmMileage = useCallback(async (id: string) => {
    if (isDemo) {
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, mileage_status: 'confirmed' } : e));
      toast.success('Mileage confirmed');
      return;
    }
    const { error } = await db('expenses').update({ mileage_status: 'confirmed' } as any).eq('id', id);
    if (error) { toast.error('Failed to confirm'); return; }
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, mileage_status: 'confirmed' } : e));
    toast.success('Mileage confirmed');
  }, [isDemo]);

  const dismissMileage = useCallback(async (id: string) => {
    if (isDemo) {
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, mileage_status: 'dismissed' } : e));
      toast.success('Mileage dismissed');
      return;
    }
    const { error } = await db('expenses').update({ mileage_status: 'dismissed' } as any).eq('id', id);
    if (error) { toast.error('Failed to dismiss'); return; }
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, mileage_status: 'dismissed' } : e));
    toast.success('Mileage dismissed');
  }, [isDemo]);

  const confirmAllMileage = useCallback(async () => {
    const ids = draftMileageExpenses.map(e => e.id);
    if (ids.length === 0) return;
    if (isDemo) {
      setExpenses(prev => prev.map(e => ids.includes(e.id) ? { ...e, mileage_status: 'confirmed' } : e));
      toast.success(`${ids.length} mileage entries confirmed`);
      return;
    }
    const { error } = await db('expenses').update({ mileage_status: 'confirmed' } as any).in('id', ids);
    if (error) { toast.error('Failed to confirm all'); return; }
    setExpenses(prev => prev.map(e => ids.includes(e.id) ? { ...e, mileage_status: 'confirmed' } : e));
    toast.success(`${ids.length} mileage entries confirmed`);
  }, [isDemo, draftMileageExpenses]);

  return {
    expenses,
    loading,
    config: effectiveConfig,
    addExpense,
    editExpense,
    deleteExpense,
    uploadReceipt,
    reload: loadExpenses,
    ytdTotalCents,
    ytdDeductibleCents,
    ytdByCategory,
    categoriesTracked,
    ytdExpenses,
    thisMonthCents,
    draftMileageExpenses,
    confirmMileage,
    dismissMileage,
    confirmAllMileage,
  };
}
