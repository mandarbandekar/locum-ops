import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { useConfirmations } from '@/hooks/useConfirmations';
import { format, differenceInDays, addMonths, startOfMonth } from 'date-fns';

const db = (table: string) => supabase.from(table as any);

export interface Reminder {
  id: string;
  module: string;
  reminder_type: string;
  channel: string;
  title: string;
  body: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  send_at: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  dismissed_at: string | null;
}

export function useReminders() {
  const { user, isDemo } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReminders = useCallback(async () => {
    if (isDemo || !user) {
      setReminders([]);
      setLoading(false);
      return;
    }
    const { data } = await db('reminders')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['scheduled', 'sent'])
      .order('send_at', { ascending: true });
    setReminders((data as any[]) || []);
    setLoading(false);
  }, [user?.id, isDemo]);

  useEffect(() => { loadReminders(); }, [loadReminders]);

  const dismissReminder = useCallback(async (id: string) => {
    if (isDemo) return;
    await db('reminders').update({ status: 'dismissed', dismissed_at: new Date().toISOString() } as any).eq('id', id);
    setReminders(prev => prev.filter(r => r.id !== id));
  }, [isDemo]);

  const activeInAppReminders = useMemo(() =>
    reminders.filter(r => r.channel === 'in_app' && r.status === 'scheduled' && new Date(r.send_at) <= new Date()),
    [reminders]
  );

  return { reminders, activeInAppReminders, loading, dismissReminder, reload: loadReminders };
}

/** Generate reminder items from current data state (for dashboard integration) */
export function useGeneratedReminders() {
  const { shifts, invoices, facilities } = useData();
  const { needingActionCount } = useConfirmations();
  const now = new Date();

  return useMemo(() => {
    const items: {
      module: string;
      reminder_type: string;
      title: string;
      body: string;
      link: string;
      urgency: number;
      related_entity_id?: string;
    }[] = [];

    const getFacilityName = (id: string) => facilities.find(f => f.id === id)?.name || 'Unknown';

    // 1) Invoice draft not sent
    const draftInvoices = invoices.filter(i => i.status === 'draft');
    if (draftInvoices.length > 0) {
      if (draftInvoices.length === 1) {
        const inv = draftInvoices[0];
        items.push({
          module: 'invoices',
          reminder_type: 'invoice_draft_unsent',
          title: `Send invoice draft ${inv.invoice_number}`,
          body: `$${inv.total_amount.toLocaleString()} ready to bill · ${getFacilityName(inv.facility_id)}`,
          link: `/invoices/${inv.id}`,
          urgency: 2,
          related_entity_id: inv.id,
        });
      } else {
        items.push({
          module: 'invoices',
          reminder_type: 'invoice_draft_unsent',
          title: `You have ${draftInvoices.length} invoice drafts ready to review and send`,
          body: `$${draftInvoices.reduce((s, i) => s + i.total_amount, 0).toLocaleString()} total`,
          link: '/invoices',
          urgency: 2,
        });
      }
    }

    // 2) Overdue invoices
    invoices.filter(i => computeInvoiceStatus(i) === 'overdue').forEach(inv => {
      items.push({
        module: 'invoices',
        reminder_type: 'invoice_overdue',
        title: `Invoice ${inv.invoice_number} is overdue`,
        body: `$${inv.balance_due.toLocaleString()} is still outstanding · ${getFacilityName(inv.facility_id)}`,
        link: `/invoices/${inv.id}`,
        urgency: 1,
        related_entity_id: inv.id,
      });
    });

    // 3) Confirmation not sent
    if (needingActionCount > 0) {
      items.push({
        module: 'confirmations',
        reminder_type: 'confirmation_not_sent',
        title: `${needingActionCount} confirmation${needingActionCount > 1 ? 's' : ''} need action`,
        body: 'Review and send monthly shift confirmations',
        link: '/schedule',
        urgency: 4,
      });
    }

    // 6) Outreach follow-up (from facilities with outreach_last_sent_at)
    facilities
      .filter(f => f.status === 'prospect' || f.status === 'outreach')
      .forEach(f => {
        if (f.outreach_last_sent_at) {
          const daysSince = differenceInDays(now, new Date(f.outreach_last_sent_at));
          if (daysSince >= 7) {
            items.push({
              module: 'outreach',
              reminder_type: 'outreach_followup',
              title: `Follow up with ${f.name}`,
              body: `Last outreach was ${daysSince} days ago`,
              link: `/facilities/${f.id}`,
              urgency: 7,
              related_entity_id: f.id,
            });
          }
        }
      });

    return items.sort((a, b) => a.urgency - b.urgency);
  }, [invoices, shifts, facilities, needingActionCount, now]);
}
