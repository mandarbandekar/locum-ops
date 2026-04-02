import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  aggregateQuarterlyIncome,
  calculateSetAside,
  getDefaultDueDates,
  estimateTotalTax,
  estimateQuarterlyInstallments,
  type FilingStatus,
} from '@/lib/taxCalculations';
import type { TaxAdvisorProfile, TaxAdvisorSession, SavedTaxQuestion, TaxOpportunityReviewItem, ReviewStatus } from '@/hooks/useTaxAdvisor';

const db = (table: string) => supabase.from(table as any);

// --- Shared types ---

export interface TaxSettings {
  id?: string;
  set_aside_mode: 'percent' | 'fixed';
  set_aside_percent: number;
  set_aside_fixed_monthly: number;
  filing_status: FilingStatus;
  estimated_deductions: number;
}

export interface QuarterStatus {
  id?: string;
  quarter: number;
  tax_year: number;
  due_date: string;
  status: string;
  notes: string;
}

export interface ChecklistItem {
  id?: string;
  item_key: string;
  label: string;
  completed: boolean;
  completed_at: string | null;
  ignored?: boolean;
}

export interface DeductionCategory {
  id?: string;
  name: string;
  ytd_amount: number;
  documentation_status: string;
  receipt_completeness_percent: number;
  missing_docs_count: number;
  notes: string;
}

export interface CPAQuestion {
  id?: string;
  question: string;
  source: string;
  resolved: boolean;
}

export const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not started' },
  { value: 'discussed', label: 'Reviewed with CPA' },
  { value: 'scheduled', label: 'Payment scheduled' },
  { value: 'paid', label: 'Paid' },
];

export const DEFAULT_CHECKLIST_ITEMS: { key: string; label: string; instruction: string }[] = [
  { key: 'entity_setup', label: 'Entity setup reviewed', instruction: 'Confirm your business entity type (sole prop, LLC, S-corp) is still the best fit. Discuss with your CPA if your relief income has changed significantly.' },
  { key: 'estimated_taxes', label: 'Estimated taxes reviewed this quarter', instruction: 'Review your YTD income and reserve amount. Confirm quarterly payment amounts with your CPA before each due date.' },
  { key: 'cpa_consulted', label: 'CPA consulted this year', instruction: 'Schedule at least one annual check-in with your CPA to review entity structure, deductions, and quarterly estimates.' },
  { key: 'payroll_reviewed', label: 'Payroll reviewed (if S-corp)', instruction: 'If you operate as an S-corp, ensure payroll is set up and reasonable compensation is being paid. Confirm amounts with your CPA.' },
  { key: 'reasonable_comp', label: 'Reasonable compensation discussed (if S-corp)', instruction: 'S-corp owners must pay themselves a reasonable salary through payroll before taking distributions.' },
  { key: 'accountable_plan', label: 'Accountable plan discussed (if S-corp)', instruction: 'An accountable plan lets your S-corp reimburse you for business expenses like mileage, CE, and licensing.' },
  { key: 'deductions_reviewed', label: 'Deduction categories reviewed', instruction: 'Ensure all your business expense categories have accurate YTD totals and documentation status.' },
  { key: 'receipts_organized', label: 'Receipts / docs organized', instruction: 'Gather and organize receipts for all business expenses. Digital copies are fine.' },
  { key: 'mileage_tracking', label: 'Multi-clinic mileage tracking reviewed', instruction: 'Keep a mileage log with dates, destinations, and business purpose for each trip between clinics.' },
  { key: 'ce_licensing', label: 'CE / licensing costs organized', instruction: 'Compile all continuing education fees, license renewals, DEA registrations, and professional certification costs.' },
  { key: 'travel_docs', label: 'Travel / lodging documentation reviewed', instruction: 'For out-of-town assignments, keep records of lodging, travel expenses, and per diem meals.' },
  { key: 'cpa_packet', label: 'Year-end CPA packet ready', instruction: 'Generate a summary of your income, deductions, and questions to share with your CPA.' },
];

export const DEFAULT_DEDUCTION_CATEGORIES = [
  'CE / Licensing',
  'DEA / Certification Renewals',
  'Professional Insurance / Malpractice',
  'Mileage Between Clinics / Facilities',
  'Travel for Assignments',
  'Lodging for Away Assignments',
  'Meals While Traveling for Work',
  'Scrubs / Work Gear / Supplies',
  'Equipment / Supplies',
  'Software / Subscriptions',
  'Phone / Internet Business Portion',
  'Home Office / Business Admin Space',
  'Payroll / Contractor Help',
  'Retirement / Benefits Discussion',
  'Banking / Payment Processing Fees',
  'Legal / Accounting Fees',
];

export const DEFAULT_CPA_QUESTIONS = [
  'My relief income increased this year. Should we revisit entity structure?',
  'At what income level should I revisit 1099 vs S-corp for my relief work?',
  'I work across multiple clinics. What should I be tracking more carefully?',
  'Should I review reasonable compensation for my S-corp?',
  'Should we discuss an accountable plan for mileage, CE, licensing, and other reimbursable business expenses?',
  'Which categories need better documentation before year-end?',
  'How should I think about payroll/admin complexity if my locum income keeps growing?',
  'What should I keep for travel between clinics or out-of-town assignments?',
  'Should we review retirement contribution options this year?',
  'Do my current records support the deductions I want to discuss?',
];

export function useTaxCopilot() {
  const { user, isDemo } = useAuth();
  const { invoices } = useData();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);

  const [loading, setLoading] = useState(!isDemo);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Tracker state
  const [settings, setSettings] = useState<TaxSettings>({
    set_aside_mode: 'percent', set_aside_percent: 30, set_aside_fixed_monthly: 0,
    filing_status: 'single', estimated_deductions: 0,
  });
  const [settingsId, setSettingsId] = useState<string>();
  const [quarterStatuses, setQuarterStatuses] = useState<QuarterStatus[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  // Deductions state
  const [deductions, setDeductions] = useState<DeductionCategory[]>([]);

  // CPA questions
  const [cpaQuestions, setCpaQuestions] = useState<CPAQuestion[]>([]);

  // Tax advisor state
  const [advisorProfile, setAdvisorProfile] = useState<TaxAdvisorProfile | null>(null);
  const [advisorSessions, setAdvisorSessions] = useState<TaxAdvisorSession[]>([]);

  // Tax profile (guidance)
  const [taxProfile, setTaxProfile] = useState<any>(null);

  const loadAll = useCallback(async () => {
    if (!user || isDemo) {
      // Set demo defaults
      const defaults = getDefaultDueDates(selectedYear);
      setQuarterStatuses([1, 2, 3, 4].map(q => ({
        quarter: q, tax_year: selectedYear, due_date: defaults[q], status: 'not_started', notes: '',
      })));
      setChecklist(DEFAULT_CHECKLIST_ITEMS.map(item => ({
        item_key: item.key, label: item.label, completed: false, completed_at: null, ignored: false,
      })));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [settingsRes, qsRes, clRes, dedRes, cpaRes, profRes, sessRes, taxProfRes] = await Promise.all([
        db('tax_settings').select('*').eq('tax_year', selectedYear).maybeSingle(),
        db('tax_quarter_statuses').select('*').eq('tax_year', selectedYear).order('quarter'),
        db('tax_checklist_items').select('*').order('created_at'),
        db('deduction_categories').select('*').order('created_at'),
        db('cpa_questions').select('*').order('created_at'),
        db('tax_advisor_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        db('tax_advisor_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db('tax_profiles').select('*').maybeSingle(),
      ]);

      // Settings
      if (settingsRes.data) {
        const d = settingsRes.data as any;
        setSettingsId(d.id);
        setSettings({
          set_aside_mode: d.set_aside_mode, set_aside_percent: Number(d.set_aside_percent),
          set_aside_fixed_monthly: Number(d.set_aside_fixed_monthly),
          filing_status: d.filing_status || 'single', estimated_deductions: Number(d.estimated_deductions) || 0,
        });
      }

      // Quarter statuses
      if ((qsRes.data as any)?.length > 0) {
        setQuarterStatuses((qsRes.data as any[]).map((r: any) => ({
          id: r.id, quarter: r.quarter, tax_year: r.tax_year, due_date: r.due_date, status: r.status, notes: r.notes,
        })));
      } else {
        const defaults = getDefaultDueDates(selectedYear);
        setQuarterStatuses([1, 2, 3, 4].map(q => ({
          quarter: q, tax_year: selectedYear, due_date: defaults[q], status: 'not_started', notes: '',
        })));
      }

      // Checklist
      if ((clRes.data as any)?.length > 0) {
        setChecklist((clRes.data as any[]).map((r: any) => ({
          id: r.id, item_key: r.item_key, label: r.label, completed: r.completed, completed_at: r.completed_at, ignored: false,
        })));
      } else {
        setChecklist(DEFAULT_CHECKLIST_ITEMS.map(item => ({
          item_key: item.key, label: item.label, completed: false, completed_at: null, ignored: false,
        })));
      }

      // Deductions
      if (dedRes.data) {
        setDeductions((dedRes.data as any[]).map((r: any) => ({
          id: r.id, name: r.name, ytd_amount: Number(r.ytd_amount), documentation_status: r.documentation_status,
          receipt_completeness_percent: r.receipt_completeness_percent, missing_docs_count: r.missing_docs_count, notes: r.notes,
        })));
      }

      // CPA Questions
      if ((cpaRes.data as any)?.length > 0) {
        setCpaQuestions((cpaRes.data as any[]).map((r: any) => ({ id: r.id, question: r.question, source: r.source, resolved: r.resolved })));
      }

      // Advisor
      if (profRes.data) setAdvisorProfile(profRes.data as any);
      if (sessRes.data) setAdvisorSessions(sessRes.data as any);
      if (taxProfRes.data) setTaxProfile(taxProfRes.data as any);
    } catch (err) {
      console.error('useTaxCopilot load error', err);
    } finally {
      setLoading(false);
    }
  }, [user, isDemo, selectedYear]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // --- Computed values ---
  const quarterlyIncome = useMemo(() => aggregateQuarterlyIncome(invoices, selectedYear), [invoices, selectedYear]);
  const setAsideData = useMemo(() => calculateSetAside(quarterlyIncome, settings.set_aside_mode, settings.set_aside_percent, settings.set_aside_fixed_monthly), [quarterlyIncome, settings]);
  const totalIncome = quarterlyIncome.reduce((s, q) => s + q.income, 0);
  const totalSetAside = setAsideData.reduce((s, q) => s + q.amount, 0);

  const taxEstimate = useMemo(
    () => estimateTotalTax(totalIncome, settings.filing_status, settings.estimated_deductions),
    [totalIncome, settings.filing_status, settings.estimated_deductions]
  );

  const estimatedQuarterly = useMemo(
    () => estimateQuarterlyInstallments(quarterlyIncome, settings.filing_status, settings.estimated_deductions),
    [quarterlyIncome, settings.filing_status, settings.estimated_deductions]
  );

  const nextDue = useMemo(() => {
    const now = new Date();
    const upcoming = quarterStatuses
      .filter(q => new Date(q.due_date) >= now && q.status !== 'paid')
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    return upcoming[0] || null;
  }, [quarterStatuses]);

  const activeChecklist = checklist.filter(c => !c.ignored);
  const completedCount = activeChecklist.filter(c => c.completed).length;
  const readinessPercent = activeChecklist.length > 0 ? Math.round((completedCount / activeChecklist.length) * 100) : 0;

  // Status banner logic
  const statusLevel = useMemo(() => {
    const pastDue = quarterStatuses.find(q => new Date(q.due_date) < new Date() && q.status !== 'paid');
    if (pastDue) return 'action' as const;
    if (totalSetAside > 0 && totalSetAside < taxEstimate.totalEstimatedTax) return 'review' as const;
    return 'on_track' as const;
  }, [quarterStatuses, totalSetAside, taxEstimate.totalEstimatedTax]);

  const reserveGap = taxEstimate.totalEstimatedTax - totalSetAside;

  // --- Actions ---

  async function saveSettings() {
    if (isDemo) { toast.success('Settings saved (demo)'); return; }
    if (!user) return;
    const payload = {
      set_aside_mode: settings.set_aside_mode, set_aside_percent: settings.set_aside_percent,
      set_aside_fixed_monthly: settings.set_aside_fixed_monthly,
      filing_status: settings.filing_status, estimated_deductions: settings.estimated_deductions,
    };
    if (settingsId) {
      await db('tax_settings').update(payload).eq('id', settingsId);
    } else {
      const { data } = await db('tax_settings').insert({ user_id: user.id, tax_year: selectedYear, ...payload } as any).select().single() as { data: any };
      if (data) setSettingsId(data.id);
    }
    toast.success('Settings saved');
  }

  async function saveQuarterStatus(qs: QuarterStatus) {
    if (isDemo) { toast.success(`Q${qs.quarter} saved (demo)`); return; }
    if (!user) return;
    if (qs.id) {
      await db('tax_quarter_statuses').update({ due_date: qs.due_date, status: qs.status, notes: qs.notes }).eq('id', qs.id);
    } else {
      const { data } = await db('tax_quarter_statuses').insert({ user_id: user.id, tax_year: selectedYear, quarter: qs.quarter, due_date: qs.due_date, status: qs.status, notes: qs.notes } as any).select().single() as { data: any };
      if (data) setQuarterStatuses(prev => prev.map(q => q.quarter === qs.quarter ? { ...q, id: data.id } : q));
    }
    toast.success(`Q${qs.quarter} saved`);
  }

  async function toggleChecklist(idx: number) {
    const item = checklist[idx];
    const nowStr = new Date().toISOString();
    const updated = { ...item, completed: !item.completed, completed_at: !item.completed ? nowStr : null, ignored: false };
    setChecklist(prev => prev.map((c, i) => i === idx ? updated : c));
    if (isDemo || !user) return;
    if (updated.id) {
      await db('tax_checklist_items').update({ completed: updated.completed, completed_at: updated.completed_at }).eq('id', updated.id);
    } else {
      const { data } = await db('tax_checklist_items').insert({ user_id: user.id, item_key: updated.item_key, label: updated.label, completed: updated.completed, completed_at: updated.completed_at } as any).select().single() as { data: any };
      if (data) setChecklist(prev => prev.map((c, i) => i === idx ? { ...c, id: data.id } : c));
    }
  }

  function toggleIgnore(idx: number) {
    setChecklist(prev => prev.map((c, i) => i === idx ? { ...c, ignored: !c.ignored } : c));
  }

  // Deduction actions
  async function seedDeductions() {
    const items = DEFAULT_DEDUCTION_CATEGORIES.map(name => ({
      name, ytd_amount: 0, documentation_status: 'needs_review', receipt_completeness_percent: 0, missing_docs_count: 0, notes: '',
    }));
    setDeductions(items);
    if (!isDemo && user) {
      const toInsert = items.map(item => ({ user_id: user.id, ...item }));
      const { data } = await db('deduction_categories').insert(toInsert as any).select() as { data: any[] | null };
      if (data) {
        setDeductions(data.map((r: any) => ({
          id: r.id, name: r.name, ytd_amount: Number(r.ytd_amount), documentation_status: r.documentation_status,
          receipt_completeness_percent: r.receipt_completeness_percent, missing_docs_count: r.missing_docs_count, notes: r.notes,
        })));
      }
    }
    toast.success('Default categories created');
  }

  async function saveDeduction(idx: number) {
    const cat = deductions[idx];
    if (!isDemo && user && cat.id) {
      await db('deduction_categories').update({
        ytd_amount: cat.ytd_amount, documentation_status: cat.documentation_status,
        receipt_completeness_percent: cat.receipt_completeness_percent, missing_docs_count: cat.missing_docs_count, notes: cat.notes,
      }).eq('id', cat.id);
    }
    toast.success(`${cat.name} saved`);
  }

  async function addDeduction(name: string) {
    const item: DeductionCategory = {
      name, ytd_amount: 0, documentation_status: 'needs_review',
      receipt_completeness_percent: 0, missing_docs_count: 0, notes: '',
    };
    if (!isDemo && user) {
      const { data } = await db('deduction_categories').insert({ user_id: user.id, ...item } as any).select().single() as { data: any };
      if (data) item.id = data.id;
    }
    setDeductions(prev => [...prev, item]);
    toast.success('Category added');
  }

  function updateDeduction(idx: number, field: keyof DeductionCategory, value: any) {
    setDeductions(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  }

  // CPA question actions
  async function addCpaQuestion(questionText: string) {
    const q: CPAQuestion = { question: questionText, source: 'manual', resolved: false };
    if (!isDemo && user) {
      const { data } = await db('cpa_questions').insert({ user_id: user.id, ...q } as any).select().single() as { data: any };
      if (data) q.id = data.id;
    }
    setCpaQuestions(prev => [...prev, q]);
    toast.success('Question added');
  }

  async function toggleCpaQuestion(idx: number) {
    const q = cpaQuestions[idx];
    const updated = { ...q, resolved: !q.resolved };
    setCpaQuestions(prev => prev.map((c, i) => i === idx ? updated : c));
    if (!isDemo && user && updated.id) {
      await db('cpa_questions').update({ resolved: updated.resolved }).eq('id', updated.id);
    }
  }

  async function removeCpaQuestion(idx: number) {
    const q = cpaQuestions[idx];
    setCpaQuestions(prev => prev.filter((_, i) => i !== idx));
    if (!isDemo && user && q.id) {
      await db('cpa_questions').delete().eq('id', q.id);
    }
  }

  async function seedCpaQuestions() {
    const items = DEFAULT_CPA_QUESTIONS.map(q => ({ question: q, source: 'default', resolved: false }));
    if (!isDemo && user) {
      const toInsert = items.map(q => ({ user_id: user.id, ...q }));
      const { data } = await db('cpa_questions').insert(toInsert as any).select() as { data: any[] | null };
      if (data) {
        setCpaQuestions(data.map((r: any) => ({ id: r.id, question: r.question, source: r.source, resolved: r.resolved })));
        toast.success('Default questions added');
        return;
      }
    }
    setCpaQuestions(items);
    toast.success('Default questions added');
  }

  // Advisor session save
  async function saveAdvisorSession(prompt: string, response: string, title?: string) {
    if (!user) return null;
    const { data, error } = await supabase.from('tax_advisor_sessions').insert({
      user_id: user.id, prompt, response, title: title || prompt.slice(0, 80),
    }).select().single();
    if (error) { console.error(error); return null; }
    setAdvisorSessions(prev => [data as any, ...prev]);
    return data as TaxAdvisorSession;
  }

  async function saveAdvisorQuestion(questionText: string, topic: string, sessionId?: string) {
    // Save as CPA question
    await addCpaQuestion(questionText);
  }

  return {
    loading, selectedYear, setSelectedYear, currentYear, currentQuarter,
    // Settings
    settings, setSettings, saveSettings,
    // Quarter statuses
    quarterStatuses, setQuarterStatuses, saveQuarterStatus,
    // Checklist
    checklist, toggleChecklist, toggleIgnore, activeChecklist, completedCount, readinessPercent,
    // Computed
    quarterlyIncome, setAsideData, totalIncome, totalSetAside, taxEstimate, estimatedQuarterly, nextDue,
    statusLevel, reserveGap,
    // Deductions
    deductions, seedDeductions, saveDeduction, addDeduction, updateDeduction,
    // CPA Questions
    cpaQuestions, addCpaQuestion, toggleCpaQuestion, removeCpaQuestion, seedCpaQuestions,
    // Advisor
    advisorProfile, advisorSessions, saveAdvisorSession, saveAdvisorQuestion,
    // Tax profile (guidance)
    taxProfile,
    // Refetch
    refetch: loadAll,
  };
}
