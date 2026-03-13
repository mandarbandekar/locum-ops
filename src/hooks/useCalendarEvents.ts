import { useMemo } from 'react';
import { isSameDay } from 'date-fns';
import { useCredentials, Credential } from '@/hooks/useCredentials';
import { useSubscriptions, Subscription } from '@/hooks/useSubscriptions';

export type CalendarEventType = 'credential' | 'subscription';

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  date: Date;
  label: string;
  sublabel?: string;
  status: 'active' | 'due_soon' | 'expired';
}

function credentialStatus(cred: Credential): 'active' | 'due_soon' | 'expired' | null {
  if (cred.status === 'expired' || cred.status === 'revoked') return 'expired';
  if (!cred.expiration_date) return 'active';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(cred.expiration_date + 'T00:00:00');
  if (exp < now) return 'expired';
  const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 30) return 'due_soon';
  return 'active';
}

export function useCalendarEvents() {
  const { credentials } = useCredentials();
  const { activeSubscriptions } = useSubscriptions();

  const credentialEvents: CalendarEvent[] = useMemo(() => {
    return (credentials || [])
      .filter(c => c.expiration_date && c.status !== 'revoked')
      .map(c => {
        const status = credentialStatus(c);
        if (!status) return null;
        return {
          id: c.id,
          type: 'credential' as const,
          date: new Date(c.expiration_date + 'T00:00:00'),
          label: c.custom_title,
          sublabel: c.issuing_authority || c.jurisdiction || undefined,
          status,
        };
      })
      .filter(Boolean) as CalendarEvent[];
  }, [credentials]);

  const subscriptionEvents: CalendarEvent[] = useMemo(() => {
    return (activeSubscriptions || [])
      .filter(s => s.renewal_date && s.status !== 'canceled')
      .map(s => ({
        id: s.id,
        type: 'subscription' as const,
        date: new Date(s.renewal_date + 'T00:00:00'),
        label: s.name,
        sublabel: s.provider || s.category || undefined,
        status: (s.status === 'due_soon' ? 'due_soon' : s.status === 'expired' ? 'expired' : 'active') as CalendarEvent['status'],
      }));
  }, [activeSubscriptions]);

  const getEventsForDay = (day: Date, filters: { credentials: boolean; subscriptions: boolean }): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    if (filters.credentials) {
      events.push(...credentialEvents.filter(e => isSameDay(e.date, day)));
    }
    if (filters.subscriptions) {
      events.push(...subscriptionEvents.filter(e => isSameDay(e.date, day)));
    }
    return events;
  };

  return {
    credentialEvents,
    subscriptionEvents,
    getEventsForDay,
  };
}
