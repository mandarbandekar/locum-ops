import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import {
  demoTaxProfile, demoDeductionCategories, demoChecklistItems,
  demoCPAQuestions, demoQuarterStatuses,
} from '@/data/taxStrategySeed';
import type {
  TaxProfile, DeductionCategory, TaxChecklistItem, CPAQuestion, TaxQuarterStatus,
} from '@/types/taxStrategy';
import { DEFAULT_CHECKLIST_ITEMS, DEFAULT_DEDUCTION_CATEGORIES } from '@/types/taxStrategy';

const db = (table: string) => supabase.from(table as any);

export function useTaxStrategy() {
  const { user, isDemo } = useAuth();
  const { invoices } = useData();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<TaxProfile | null>(null);
  const [categories, setCategories] = useState<DeductionCategory[]>([]);
  const [checklist, setChecklist] = useState<TaxChecklistItem[]>([]);
  const [questions, setQuestions] = useState<CPAQuestion[]>([]);
  const [quarterStatuses, setQuarterStatuses] = useState<TaxQuarterStatus[]>([]);

  const currentYear = new Date().getFullYear();

  const ytdPaidIncome = useMemo(() => {
    return invoices
      .filter(inv => inv.status === 'paid' && inv.paid_at && new Date(inv.paid_at).getFullYear() === currentYear)
      .reduce((sum, inv) => sum + inv.total_amount, 0);
  }, [invoices, currentYear]);

  const reserveAmount = useMemo(() => {
    const pct = profile?.reserve_percent ?? 30;
    return Math.round((pct / 100) * ytdPaidIncome * 100) / 100;
  }, [ytdPaidIncome, profile?.reserve_percent]);

  const readinessScore = useMemo(() => {
    if (checklist.length === 0) return 0;
    return Math.round((checklist.filter(i => i.completed).length / checklist.length) * 100);
  }, [checklist]);

  const nextQuarterDue = useMemo(() => {
    const now = new Date();
    const dueDates = [
      { q: 1, date: `${currentYear}-04-15` },
      { q: 2, date: `${currentYear}-06-15` },
      { q: 3, date: `${currentYear}-09-15` },
      { q: 4, date: `${currentYear + 1}-01-15` },
    ];
    return dueDates.find(d => new Date(d.date) >= now) || dueDates[3];
  }, [currentYear]);

  const totalDeductions = useMemo(() => {
    return categories.reduce((sum, c) => sum + c.ytd_amount, 0);
  }, [categories]);

  const loadData = useCallback(async () => {
    if (isDemo) {
      setProfile(demoTaxProfile);
      setCategories(demoDeductionCategories);
      setChecklist(demoChecklistItems);
      setQuestions(demoCPAQuestions);
      setQuarterStatuses(demoQuarterStatuses);
      setLoading(false);
      return;
    }
    if (!user) return;

    try {
      const [profileRes, catRes, checkRes, qRes, qsRes] = await Promise.all([
        db('tax_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        db('deduction_categories').select('*').eq('user_id', user.id).order('name'),
        db('tax_checklist_items').select('*').eq('user_id', user.id).order('item_key'),
        db('cpa_questions').select('*').eq('user_id', user.id).order('created_at'),
        db('tax_quarter_statuses').select('*').eq('user_id', user.id).eq('tax_year', currentYear).order('quarter'),
      ]);

      if (profileRes.data) setProfile(profileRes.data as any);
      setCategories((catRes.data || []) as any);
      setChecklist((checkRes.data || []) as any);
      setQuestions((qRes.data || []) as any);
      setQuarterStatuses((qsRes.data || []) as any);
    } finally {
      setLoading(false);
    }
  }, [user, isDemo, currentYear]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveProfile = async (data: Partial<TaxProfile>) => {
    if (isDemo) {
      setProfile(prev => prev ? { ...prev, ...data } : { ...demoTaxProfile, ...data });
      return;
    }
    if (!user) return;
    const payload = { ...data, user_id: user.id };
    if (profile?.id) {
      await db('tax_profiles').update(payload).eq('id', profile.id);
    } else {
      await db('tax_profiles').insert(payload);
    }
    await loadData();
  };

  const saveCategory = async (cat: DeductionCategory) => {
    if (isDemo) {
      setCategories(prev => {
        const idx = prev.findIndex(c => c.id === cat.id);
        if (idx >= 0) { const n = [...prev]; n[idx] = cat; return n; }
        return [...prev, { ...cat, id: crypto.randomUUID() }];
      });
      return;
    }
    if (!user) return;
    const { id, user_id, ...rest } = cat as any;
    if (cat.id) {
      await db('deduction_categories').update({ ...rest, user_id: user.id }).eq('id', cat.id);
    } else {
      await db('deduction_categories').insert({ ...rest, user_id: user.id });
    }
    await loadData();
  };

  const deleteCategory = async (id: string) => {
    if (isDemo) { setCategories(prev => prev.filter(c => c.id !== id)); return; }
    await db('deduction_categories').delete().eq('id', id);
    await loadData();
  };

  const toggleChecklistItem = async (item: TaxChecklistItem) => {
    const newCompleted = !item.completed;
    const completedAt = newCompleted ? new Date().toISOString() : null;
    if (isDemo) {
      setChecklist(prev => prev.map(c =>
        c.item_key === item.item_key ? { ...c, completed: newCompleted, completed_at: completedAt } : c
      ));
      return;
    }
    if (!user) return;
    if (item.id) {
      await db('tax_checklist_items').update({ completed: newCompleted, completed_at: completedAt }).eq('id', item.id);
    } else {
      await db('tax_checklist_items').insert({
        user_id: user.id, item_key: item.item_key, label: item.label,
        completed: newCompleted, completed_at: completedAt,
      });
    }
    await loadData();
  };

  const initializeChecklist = useCallback(async () => {
    if (isDemo || checklist.length > 0) return;
    if (!user) return;
    const items = DEFAULT_CHECKLIST_ITEMS.map(i => ({
      user_id: user.id, item_key: i.key, label: i.label, completed: false,
    }));
    await db('tax_checklist_items').insert(items);
    await loadData();
  }, [isDemo, checklist.length, user, loadData]);

  const initializeCategories = useCallback(async () => {
    if (isDemo || categories.length > 0) return;
    if (!user) return;
    const cats = DEFAULT_DEDUCTION_CATEGORIES.map(name => ({
      user_id: user.id, name, ytd_amount: 0, documentation_status: 'needs_review',
      receipt_completeness_percent: 0, missing_docs_count: 0, notes: '',
    }));
    await db('deduction_categories').insert(cats);
    await loadData();
  }, [isDemo, categories.length, user, loadData]);

  const addQuestion = async (question: string, source = 'manual') => {
    if (isDemo) {
      setQuestions(prev => [...prev, { id: crypto.randomUUID(), question, source, resolved: false }]);
      return;
    }
    if (!user) return;
    await db('cpa_questions').insert({ user_id: user.id, question, source });
    await loadData();
  };

  const updateQuestion = async (id: string, data: Partial<CPAQuestion>) => {
    if (isDemo) {
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...data } : q));
      return;
    }
    await db('cpa_questions').update(data).eq('id', id);
    await loadData();
  };

  const deleteQuestion = async (id: string) => {
    if (isDemo) { setQuestions(prev => prev.filter(q => q.id !== id)); return; }
    await db('cpa_questions').delete().eq('id', id);
    await loadData();
  };

  const saveQuarterStatus = async (qs: TaxQuarterStatus) => {
    if (isDemo) {
      setQuarterStatuses(prev => {
        const idx = prev.findIndex(q => q.quarter === qs.quarter);
        if (idx >= 0) { const n = [...prev]; n[idx] = qs; return n; }
        return [...prev, qs];
      });
      return;
    }
    if (!user) return;
    if (qs.id) {
      await db('tax_quarter_statuses').update({ ...qs, user_id: user.id }).eq('id', qs.id);
    } else {
      await db('tax_quarter_statuses').insert({ ...qs, user_id: user.id });
    }
    await loadData();
  };

  const initializeQuarterStatuses = useCallback(async () => {
    if (isDemo || quarterStatuses.length > 0) return;
    if (!user) return;
    const defaultDueDates: Record<number, string> = {
      1: `${currentYear}-04-15`,
      2: `${currentYear}-06-15`,
      3: `${currentYear}-09-15`,
      4: `${currentYear + 1}-01-15`,
    };
    const statuses = [1, 2, 3, 4].map(q => ({
      user_id: user.id, tax_year: currentYear, quarter: q,
      due_date: defaultDueDates[q], status: 'not_started', notes: '',
    }));
    await db('tax_quarter_statuses').insert(statuses);
    await loadData();
  }, [isDemo, quarterStatuses.length, user, currentYear, loadData]);

  return {
    loading, profile, categories, checklist, questions, quarterStatuses, invoices,
    ytdPaidIncome, reserveAmount, readinessScore, nextQuarterDue, totalDeductions, currentYear,
    saveProfile, saveCategory, deleteCategory, toggleChecklistItem,
    initializeChecklist, initializeCategories, initializeQuarterStatuses,
    addQuestion, updateQuestion, deleteQuestion, saveQuarterStatus, loadData,
  };
}

export type TaxStrategyData = ReturnType<typeof useTaxStrategy>;
