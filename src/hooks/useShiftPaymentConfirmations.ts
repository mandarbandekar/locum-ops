import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { friendlyDbError } from '@/lib/errorUtils';
import type { ShiftPaymentConfirmation, PaymentConfirmationStatus } from '@/lib/paymentConfirmations';
import { addDays, format } from 'date-fns';

const db = (table: string) => supabase.from(table as any);

function strip(row: any): ShiftPaymentConfirmation {
  const { user_id: _u, ...rest } = row;
  return rest as ShiftPaymentConfirmation;
}

export interface UpsertPaymentConfirmationInput {
  shift_id: string;
  status: PaymentConfirmationStatus;
  amount_received?: number | null;
  paid_on?: string | null;
  note?: string | null;
  snoozed_until?: string | null;
}

export function useShiftPaymentConfirmations() {
  const { user, isDemo } = useAuth();
  const [confirmations, setConfirmations] = useState<ShiftPaymentConfirmation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (isDemo || !user) return;
    setLoading(true);
    const { data, error } = await db('shift_payment_confirmations').select('*');
    if (error) {
      console.error('[useShiftPaymentConfirmations] fetch failed:', error);
      setLoading(false);
      return;
    }
    setConfirmations((data || []).map(strip));
    setLoading(false);
  }, [isDemo, user]);

  useEffect(() => {
    fetchAll();
    if (isDemo || !user) return;
    const channel = supabase
      .channel('shift-payment-confirmations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shift_payment_confirmations' },
        () => fetchAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll, isDemo, user]);

  const upsert = useCallback(
    async (input: UpsertPaymentConfirmationInput) => {
      if (isDemo) {
        setConfirmations((prev) => {
          const existing = prev.find((c) => c.shift_id === input.shift_id);
          if (existing) {
            return prev.map((c) =>
              c.shift_id === input.shift_id
                ? {
                    ...c,
                    status: input.status,
                    amount_received: input.amount_received ?? c.amount_received,
                    paid_on: input.paid_on ?? c.paid_on,
                    note: input.note ?? c.note,
                    snoozed_until: input.snoozed_until ?? c.snoozed_until,
                  }
                : c,
            );
          }
          return [
            ...prev,
            {
              id: crypto.randomUUID(),
              shift_id: input.shift_id,
              status: input.status,
              amount_received: input.amount_received ?? null,
              paid_on: input.paid_on ?? null,
              note: input.note ?? null,
              snoozed_until: input.snoozed_until ?? null,
            },
          ];
        });
        return;
      }
      if (!user) return;
      const row = {
        user_id: user.id,
        shift_id: input.shift_id,
        status: input.status,
        amount_received: input.amount_received ?? null,
        paid_on: input.paid_on ?? null,
        note: input.note ?? null,
        snoozed_until: input.snoozed_until ?? null,
      };
      const { data, error } = await db('shift_payment_confirmations')
        .upsert(row, { onConflict: 'shift_id' })
        .select()
        .single();
      if (error) {
        console.error(error);
        toast.error(friendlyDbError(error));
        return;
      }
      const saved = strip(data);
      setConfirmations((prev) => {
        const without = prev.filter((c) => c.shift_id !== saved.shift_id);
        return [...without, saved];
      });
    },
    [isDemo, user],
  );

  const markPaid = useCallback(
    async (shift_id: string, amount: number, paid_on: string, note?: string) => {
      await upsert({
        shift_id,
        status: 'paid',
        amount_received: amount,
        paid_on,
        note: note ?? null,
        snoozed_until: null,
      });
    },
    [upsert],
  );

  const snooze = useCallback(
    async (shift_id: string, days = 7) => {
      const snoozed_until = format(addDays(new Date(), days), 'yyyy-MM-dd');
      await upsert({
        shift_id,
        status: 'pending',
        snoozed_until,
      });
    },
    [upsert],
  );

  const markWontPay = useCallback(
    async (shift_id: string) => {
      await upsert({
        shift_id,
        status: 'wont_pay',
        snoozed_until: null,
      });
    },
    [upsert],
  );

  return { confirmations, loading, markPaid, snooze, markWontPay, refetch: fetchAll };
}
