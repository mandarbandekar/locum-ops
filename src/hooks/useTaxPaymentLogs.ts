import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TaxPaymentLog {
  id: string;
  user_id: string;
  tax_year: number;
  quarter: string;
  payment_type: string;
  state_key: string | null;
  amount: number;
  date_paid: string;
  paid_from: string;
  confirmed_by_user: boolean;
  created_at: string;
}

const db = (table: string) => supabase.from(table as any);

const currentYear = new Date().getFullYear();

export function useTaxPaymentLogs(taxYear = currentYear) {
  const { user, isDemo } = useAuth();
  const [payments, setPayments] = useState<TaxPaymentLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (isDemo) {
      setPayments([]);
      setLoading(false);
      return;
    }
    if (!user) { setLoading(false); return; }
    try {
      const { data } = await db('tax_payment_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('tax_year', taxYear)
        .order('date_paid', { ascending: false });
      if (data) setPayments(data.map((d: any) => ({ ...d, amount: Number(d.amount) })));
    } catch (e) {
      console.error('Failed to load tax payment logs', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isDemo, taxYear]);

  useEffect(() => { load(); }, [load]);

  const logPayment = useCallback(async (data: {
    quarter: string;
    payment_type: string;
    amount: number;
    paid_from: string;
    state_key?: string;
  }) => {
    if (isDemo) {
      const newLog: TaxPaymentLog = {
        id: crypto.randomUUID(),
        user_id: 'demo',
        tax_year: taxYear,
        quarter: data.quarter,
        payment_type: data.payment_type,
        state_key: data.state_key || null,
        amount: data.amount,
        date_paid: new Date().toISOString().split('T')[0],
        paid_from: data.paid_from,
        confirmed_by_user: true,
        created_at: new Date().toISOString(),
      };
      setPayments(prev => [newLog, ...prev]);
      return newLog;
    }
    if (!user) return null;
    const { data: created, error } = await db('tax_payment_logs')
      .insert({
        user_id: user.id,
        tax_year: taxYear,
        ...data,
      } as any)
      .select()
      .single();
    if (error) { console.error('Failed to log payment', error); return null; }
    if (created) {
      const mapped = { ...created, amount: Number((created as any).amount) } as TaxPaymentLog;
      setPayments(prev => [mapped, ...prev]);
      return mapped;
    }
    return null;
  }, [user?.id, isDemo, taxYear]);

  const getQuarterPayments = useCallback((quarter: string) => {
    return payments.filter(p => p.quarter === quarter);
  }, [payments]);

  const getQuarterTotal = useCallback((quarter: string, paymentType?: string) => {
    return payments
      .filter(p => p.quarter === quarter && (!paymentType || p.payment_type === paymentType))
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  return { payments, loading, logPayment, getQuarterPayments, getQuarterTotal, reload: load };
}
