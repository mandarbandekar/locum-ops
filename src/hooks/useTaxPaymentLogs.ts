import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Payment type taxonomy.
 * - `federal_estimate` — IRS 1040-ES quarterly
 * - `federal_se` — Self-employment tax portion (paid via 1040-ES)
 * - `state_estimate` — Generic resident-state estimated payment (legacy / single-state users)
 * - `state_personal_{XX}` — Per-state personal income tax estimated payment, where {XX} is the
 *   2-letter state code (e.g. `state_personal_CA`, `state_personal_OR`). Used by the multi-state
 *   Tax Payment Hub to track payments to each state independently.
 * - `state_pte_{XX}` — Per-state pass-through entity election payment.
 */
export type TaxPaymentType =
  | 'federal_estimate'
  | 'federal_se'
  | 'state_estimate'
  | `state_personal_${string}`
  | `state_pte_${string}`
  | (string & {}); // allow extension while keeping autocomplete on known values

export interface TaxPaymentLog {
  id: string;
  user_id: string;
  tax_year: number;
  quarter: string;
  payment_type: TaxPaymentType;
  state_key: string | null;
  amount: number;
  date_paid: string;
  paid_from: string;
  confirmed_by_user: boolean;
  created_at: string;
}

/** Build a per-state payment_type code from a 2-letter state key. */
export function statePersonalPaymentType(stateKey: string): TaxPaymentType {
  return `state_personal_${stateKey.toUpperCase()}` as TaxPaymentType;
}

/** Build a per-state PTE payment_type code from a 2-letter state key. */
export function statePtePaymentType(stateKey: string): TaxPaymentType {
  return `state_pte_${stateKey.toUpperCase()}` as TaxPaymentType;
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
    payment_type: TaxPaymentType;
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
      const row = created as any;
      const mapped: TaxPaymentLog = {
        id: row.id, user_id: row.user_id, tax_year: row.tax_year,
        quarter: row.quarter, payment_type: row.payment_type,
        state_key: row.state_key, amount: Number(row.amount),
        date_paid: row.date_paid, paid_from: row.paid_from,
        confirmed_by_user: row.confirmed_by_user, created_at: row.created_at,
      };
      setPayments(prev => [mapped, ...prev]);
      return mapped;
    }
    return null;
  }, [user?.id, isDemo, taxYear]);

  const getQuarterPayments = useCallback((quarter: string) => {
    return payments.filter(p => p.quarter === quarter);
  }, [payments]);

  const getQuarterTotal = useCallback((quarter: string, paymentType?: TaxPaymentType) => {
    return payments
      .filter(p => p.quarter === quarter && (!paymentType || p.payment_type === paymentType))
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  return { payments, loading, logPayment, getQuarterPayments, getQuarterTotal, reload: load };
}
