import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';
import { friendlyDbError } from '@/lib/errorUtils';
import { generateIcsCalendar, downloadIcsFile } from '@/lib/icsGenerator';
import { addDays, startOfDay, endOfMonth, startOfMonth, addMonths } from 'date-fns';

const db = (table: string) => supabase.from(table as any);

export interface CalendarConnection {
  id: string;
  provider: 'google' | 'ical';
  status: string;
  external_calendar_id: string | null;
  google_email: string | null;
  created_at: string;
}

export interface CalendarFeedToken {
  id: string;
  token: string;
  revoked_at: string | null;
  created_at: string;
}

export interface CalendarSyncPreferences {
  sync_booked_only: boolean;
  sync_future_only: boolean;
  include_facility_address: boolean;
  include_notes: boolean;
}

const DEFAULT_PREFS: CalendarSyncPreferences = {
  sync_booked_only: true,
  sync_future_only: true,
  include_facility_address: true,
  include_notes: false,
};

export type ExportRange = 'next_30' | 'this_month' | 'next_month' | 'custom';

export function useCalendarSync() {
  const { user, isDemo } = useAuth();
  const { shifts, facilities } = useData();
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [feedToken, setFeedToken] = useState<CalendarFeedToken | null>(null);
  const [preferences, setPreferences] = useState<CalendarSyncPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user || isDemo) { setLoading(false); return; }
    try {
      const [connRes, tokenRes, prefRes] = await Promise.all([
        db('calendar_connections').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db('calendar_feed_tokens').select('*').eq('user_id', user.id).is('revoked_at', null).order('created_at', { ascending: false }).limit(1),
        db('calendar_sync_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      if (connRes.data) setConnections(connRes.data as any);
      if (tokenRes.data && (tokenRes.data as any[]).length > 0) setFeedToken((tokenRes.data as any[])[0]);
      if (prefRes.data) {
        const d = prefRes.data as any;
        setPreferences({
          sync_booked_only: d.sync_booked_only ?? true,
          sync_future_only: d.sync_future_only ?? true,
          include_facility_address: d.include_facility_address ?? true,
          include_notes: d.include_notes ?? false,
        });
      }
    } catch (err) {
      console.error('Failed to load calendar sync data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isDemo]);

  useEffect(() => { loadData(); }, [loadData]);

  const googleConnection = connections.find(c => c.provider === 'google' && c.status === 'active');

  const generateFeedToken = useCallback(async (): Promise<CalendarFeedToken | null> => {
    if (!user) return null;
    try {
      const { data, error } = await db('calendar_feed_tokens')
        .insert({ user_id: user.id })
        .select()
        .single();
      if (error) { toast.error(friendlyDbError(error)); return null; }
      const token = data as any as CalendarFeedToken;
      setFeedToken(token);
      toast.success('Calendar subscription link generated');
      return token;
    } catch (err) {
      toast.error(friendlyDbError(err));
      return null;
    }
  }, [user]);

  const revokeFeedToken = useCallback(async () => {
    if (!feedToken) return;
    try {
      const { error } = await db('calendar_feed_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', feedToken.id);
      if (error) { toast.error(friendlyDbError(error)); return; }
      setFeedToken(null);
      toast.success('Subscription link revoked');
    } catch (err) {
      toast.error(friendlyDbError(err));
    }
  }, [feedToken]);

  const regenerateFeedToken = useCallback(async () => {
    if (feedToken) {
      await db('calendar_feed_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', feedToken.id);
    }
    return generateFeedToken();
  }, [feedToken, generateFeedToken]);

  const updatePreferences = useCallback(async (updates: Partial<CalendarSyncPreferences>) => {
    if (!user) return;
    const newPrefs = { ...preferences, ...updates };
    setPreferences(newPrefs);
    try {
      const { error } = await db('calendar_sync_preferences')
        .upsert({ user_id: user.id, ...newPrefs } as any, { onConflict: 'user_id' });
      if (error) console.error('Failed to save preferences:', error);
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
  }, [user, preferences]);

  const getFilteredShifts = useCallback((range: ExportRange, customStart?: Date, customEnd?: Date) => {
    const now = startOfDay(new Date());
    let start: Date;
    let end: Date;

    switch (range) {
      case 'next_30':
        start = now;
        end = addDays(now, 30);
        break;
      case 'this_month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'next_month':
        start = startOfMonth(addMonths(now, 1));
        end = endOfMonth(addMonths(now, 1));
        break;
      case 'custom':
        start = customStart || now;
        end = customEnd || addDays(now, 30);
        break;
      default:
        start = now;
        end = addDays(now, 30);
    }

    return shifts.filter(s => {
      if (preferences.sync_booked_only && s.status !== 'booked') return false;
      const shiftDate = new Date(s.start_datetime);
      return shiftDate >= start && shiftDate <= end;
    });
  }, [shifts, preferences]);

  const exportIcs = useCallback((range: ExportRange, customStart?: Date, customEnd?: Date) => {
    const filtered = getFilteredShifts(range, customStart, customEnd);
    if (filtered.length === 0) {
      toast.error('No shifts to export for the selected range');
      return;
    }
    const ics = generateIcsCalendar(filtered, facilities, {
      includeAddress: preferences.include_facility_address,
      includeNotes: preferences.include_notes,
    });
    downloadIcsFile(ics, `locumops-shifts-${range}.ics`);
    toast.success(`Exported ${filtered.length} shift${filtered.length !== 1 ? 's' : ''}`);
  }, [getFilteredShifts, facilities, preferences]);

  const getFeedUrl = useCallback(() => {
    if (!feedToken) return null;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    return `https://${projectId}.supabase.co/functions/v1/calendar-ics-feed?token=${feedToken.token}`;
  }, [feedToken]);

  const disconnectGoogle = useCallback(async () => {
    if (!googleConnection) return;
    try {
      const { error } = await db('calendar_connections')
        .update({ status: 'disconnected' })
        .eq('id', googleConnection.id);
      if (error) { toast.error(friendlyDbError(error)); return; }
      setConnections(prev => prev.map(c => c.id === googleConnection.id ? { ...c, status: 'disconnected' } : c));
      toast.success('Google Calendar disconnected');
    } catch (err) {
      toast.error(friendlyDbError(err));
    }
  }, [googleConnection]);

  return {
    connections,
    googleConnection,
    feedToken,
    preferences,
    loading,
    generateFeedToken,
    revokeFeedToken,
    regenerateFeedToken,
    updatePreferences,
    exportIcs,
    getFeedUrl,
    disconnectGoogle,
  };
}
