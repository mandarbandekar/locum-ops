import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Types
export interface TaxAdvisorProfile {
  id: string;
  user_id: string;
  entity_type: string;
  travels_for_ce: boolean | null;
  uses_personal_vehicle: boolean | null;
  multi_state_work: boolean | null;
  pays_own_subscriptions: boolean | null;
  retirement_planning_interest: boolean | null;
  combines_business_personal_travel: boolean | null;
  buys_supplies_equipment: boolean | null;
  notes: string | null;
  scorp_assessment_result: any | null;
}

export interface TaxAdvisorSession {
  id: string;
  title: string;
  prompt: string;
  response: string;
  created_at: string;
}

export interface SavedTaxQuestion {
  id: string;
  question_text: string;
  topic: string;
  saved_from_session_id: string | null;
  include_in_summary: boolean;
  created_at: string;
}

export type ReviewStatus = 'not_started' | 'reviewing' | 'saved_for_cpa' | 'done_for_now';

export interface TaxOpportunityReviewItem {
  id: string;
  category: string;
  status: ReviewStatus;
  notes: string | null;
  last_reviewed_at: string | null;
}

export const OPPORTUNITY_CATEGORIES = [
  { key: 'ce_travel', label: 'CE & Travel', description: 'Continuing education costs and related travel may be worth reviewing with your CPA.' },
  { key: 'vehicle_mileage', label: 'Vehicle & Mileage', description: 'If you use a personal vehicle for locum work, documentation of mileage is commonly reviewed.' },
  { key: 'credentials_memberships', label: 'Credentials / Memberships / Subscriptions', description: 'Professional licenses, memberships, and subscriptions are areas often discussed with tax professionals.' },
  { key: 'equipment_supplies', label: 'Equipment & Supplies', description: 'Work-related equipment and supplies purchases may be worth documenting and discussing.' },
  { key: 'retirement_planning', label: 'Retirement Planning', description: 'Retirement contributions and planning strategies are commonly reviewed for independent contractors.' },
  { key: 'multi_state_work', label: 'Multi-State Work', description: 'Working across state lines creates documentation and compliance topics worth discussing.' },
  { key: 'entity_structure', label: 'Entity Structure Topics', description: 'Business entity choices (1099, S-Corp, LLC) have planning implications worth reviewing.' },
  { key: 'home_office', label: 'Home Office / Phone / Internet', description: 'If you use part of your home or personal devices for work, this area is commonly reviewed.' },
] as const;

export function useTaxAdvisor() {
  const { user, isDemo } = useAuth();
  const [profile, setProfile] = useState<TaxAdvisorProfile | null>(null);
  const [sessions, setSessions] = useState<TaxAdvisorSession[]>([]);
  const [questions, setQuestions] = useState<SavedTaxQuestion[]>([]);
  const [reviewItems, setReviewItems] = useState<TaxOpportunityReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user || isDemo) { setLoading(false); return; }
    try {
      const [profRes, sessRes, qRes, revRes] = await Promise.all([
        supabase.from('tax_advisor_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('tax_advisor_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('saved_tax_questions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('tax_opportunity_review_items').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      ]);
      if (profRes.data) setProfile(profRes.data as any);
      if (sessRes.data) setSessions(sessRes.data as any);
      if (qRes.data) setQuestions(qRes.data as any);
      if (revRes.data) setReviewItems(revRes.data as any);
    } catch (e) {
      console.error('useTaxAdvisor fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [user, isDemo]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveProfile = async (data: Partial<TaxAdvisorProfile>) => {
    if (!user) return;
    const payload = { ...data, user_id: user.id };
    const { data: result, error } = profile
      ? await supabase.from('tax_advisor_profiles').update(payload).eq('id', profile.id).select().single()
      : await supabase.from('tax_advisor_profiles').insert(payload).select().single();
    if (error) { toast({ title: 'Error saving profile', description: error.message, variant: 'destructive' }); return; }
    setProfile(result as any);
    toast({ title: 'Profile saved' });
  };

  const saveSession = async (prompt: string, response: string, title?: string) => {
    if (!user) return null;
    const { data, error } = await supabase.from('tax_advisor_sessions').insert({
      user_id: user.id, prompt, response, title: title || prompt.slice(0, 80),
    }).select().single();
    if (error) { console.error(error); return null; }
    setSessions(prev => [data as any, ...prev]);
    return data as TaxAdvisorSession;
  };

  const saveQuestion = async (questionText: string, topic: string, sessionId?: string) => {
    if (!user) return;
    const { data, error } = await supabase.from('saved_tax_questions').insert({
      user_id: user.id, question_text: questionText, topic, saved_from_session_id: sessionId || null,
    }).select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setQuestions(prev => [data as any, ...prev]);
    toast({ title: 'Question saved for CPA' });
  };

  const updateQuestion = async (id: string, updates: Partial<SavedTaxQuestion>) => {
    const { error } = await supabase.from('saved_tax_questions').update(updates).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const deleteQuestion = async (id: string) => {
    const { error } = await supabase.from('saved_tax_questions').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setQuestions(prev => prev.filter(q => q.id !== id));
    toast({ title: 'Question removed' });
  };

  const updateReviewItem = async (category: string, status: ReviewStatus, notes?: string) => {
    if (!user) return;
    const existing = reviewItems.find(r => r.category === category);
    const payload: any = { user_id: user.id, category, status, last_reviewed_at: new Date().toISOString() };
    if (notes !== undefined) payload.notes = notes;

    if (existing) {
      const { error } = await supabase.from('tax_opportunity_review_items').update(payload).eq('id', existing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      setReviewItems(prev => prev.map(r => r.id === existing.id ? { ...r, ...payload } : r));
    } else {
      const { data, error } = await supabase.from('tax_opportunity_review_items').insert(payload).select().single();
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      setReviewItems(prev => [...prev, data as any]);
    }
  };

  return {
    profile, sessions, questions, reviewItems, loading,
    saveProfile, saveSession, saveQuestion, updateQuestion, deleteQuestion, updateReviewItem,
    refetch: fetchAll,
  };
}
