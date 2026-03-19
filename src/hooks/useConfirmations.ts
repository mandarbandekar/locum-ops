import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { ConfirmationRecord, ConfirmationActivity, ConfirmationShiftLink, computeShiftHash } from '@/types/confirmations';
import { generateSecureToken } from '@/lib/businessLogic';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { toast } from 'sonner';
import { friendlyDbError } from '@/lib/errorUtils';

const db = (table: string) => supabase.from(table as any);

function stripDbFields(row: any): any {
  if (!row) return row;
  const { user_id, created_at, updated_at, ...rest } = row;
  return rest;
}

export function useConfirmations() {
  const { user, isDemo } = useAuth();
  const { shifts, facilities, contacts } = useData();
  const [records, setRecords] = useState<ConfirmationRecord[]>([]);
  const [activities, setActivities] = useState<ConfirmationActivity[]>([]);
  const [shiftLinks, setShiftLinks] = useState<ConfirmationShiftLink[]>([]);
  const [loading, setLoading] = useState(!isDemo);

  // Fetch all confirmation records
  useEffect(() => {
    if (isDemo || !user) { setLoading(false); return; }
    fetchAll();
  }, [isDemo, user?.id]);

  async function fetchAll() {
    try {
      const [rRes, aRes, slRes] = await Promise.all([
        db('confirmation_records').select('*').order('created_at'),
        db('confirmation_activity').select('*').order('created_at'),
        db('confirmation_shift_links').select('*'),
      ]);
      setRecords((rRes.data || []).map(stripDbFields));
      setActivities((aRes.data || []).map((r: any) => ({ id: r.id, confirmation_record_id: r.confirmation_record_id, action: r.action, description: r.description, created_at: r.created_at })));
      setShiftLinks((slRes.data || []).map(stripDbFields));
    } catch (err) {
      console.error('Failed to load confirmations:', err);
    } finally {
      setLoading(false);
    }
  }

  // Get booked shifts for a facility in a month
  const getBookedShifts = useCallback((facilityId: string, monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    const mStart = startOfMonth(new Date(year, month - 1));
    const mEnd = endOfMonth(new Date(year, month - 1));
    return shifts.filter(s => {
      const d = new Date(s.start_datetime);
      return s.facility_id === facilityId && d >= mStart && d <= mEnd && s.status === 'booked';
    }).sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
  }, [shifts]);

  // Get or create a confirmation record for a facility/month
  const getOrCreateRecord = useCallback(async (facilityId: string, monthKey: string): Promise<ConfirmationRecord> => {
    const existing = records.find(r => r.facility_id === facilityId && r.month_key === monthKey);
    if (existing) return existing;

    if (isDemo) {
      const newRecord: ConfirmationRecord = {
        id: crypto.randomUUID(),
        facility_id: facilityId,
        month_key: monthKey,
        status: 'not_sent',
        sent_at: null,
        confirmed_at: null,
        share_token: null,
        share_token_created_at: null,
        share_token_revoked_at: null,
        shift_count_snapshot: null,
        shift_hash_snapshot: null,
        last_shift_snapshot_at: null,
        message_body: '',
        notes: '',
      };
      setRecords(prev => [...prev, newRecord]);
      return newRecord;
    }

    const { data, error } = await db('confirmation_records')
      .insert({ user_id: user!.id, facility_id: facilityId, month_key: monthKey })
      .select().single();
    if (error) { console.error(error); toast.error(friendlyDbError(error)); throw error; }
    const record = stripDbFields(data) as ConfirmationRecord;
    setRecords(prev => [...prev, record]);
    return record;
  }, [records, isDemo, user]);

  // Mark as sent
  const markSent = useCallback(async (recordId: string, messageBody: string) => {
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    const bookedShifts = getBookedShifts(record.facility_id, record.month_key);
    const hash = computeShiftHash(bookedShifts);
    const now = new Date().toISOString();

    const updates: Partial<ConfirmationRecord> = {
      status: 'sent',
      sent_at: now,
      message_body: messageBody,
      shift_count_snapshot: bookedShifts.length,
      shift_hash_snapshot: hash,
      last_shift_snapshot_at: now,
    };

    if (isDemo) {
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, ...updates } : r));
      addActivityLocal(recordId, 'sent', 'Confirmation sent');
    } else {
      const { error } = await db('confirmation_records').update({ ...updates, updated_at: now }).eq('id', recordId);
      if (error) { toast.error(error.message); return; }
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, ...updates } : r));

      // Save shift links
      const links = bookedShifts.map(s => ({ confirmation_record_id: recordId, shift_id: s.id }));
      // Clear old links first
      await db('confirmation_shift_links').delete().eq('confirmation_record_id', recordId);
      if (links.length > 0) {
        await db('confirmation_shift_links').insert(links);
      }

      // Add activity
      await db('confirmation_activity').insert({
        confirmation_record_id: recordId,
        action: 'sent',
        description: 'Confirmation sent',
      });
      await fetchAll();
    }
    toast.success('Confirmation marked as sent');
  }, [records, getBookedShifts, isDemo]);

  // Mark as confirmed
  const markConfirmed = useCallback(async (recordId: string) => {
    const now = new Date().toISOString();
    const updates: Partial<ConfirmationRecord> = {
      status: 'confirmed',
      confirmed_at: now,
    };

    if (isDemo) {
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, ...updates } : r));
      addActivityLocal(recordId, 'confirmed', 'Confirmation confirmed by practice');
    } else {
      const { error } = await db('confirmation_records').update({ ...updates, updated_at: now }).eq('id', recordId);
      if (error) { toast.error(error.message); return; }
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, ...updates } : r));
      await db('confirmation_activity').insert({
        confirmation_record_id: recordId,
        action: 'confirmed',
        description: 'Confirmation confirmed by practice',
      });
      await fetchAll();
    }
    toast.success('Confirmation marked as confirmed');
  }, [isDemo]);

  // Create/revoke share token
  const createShareToken = useCallback(async (recordId: string) => {
    const token = generateSecureToken();
    const now = new Date().toISOString();
    const updates = { share_token: token, share_token_created_at: now, share_token_revoked_at: null };

    if (isDemo) {
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, ...updates } : r));
    } else {
      await db('confirmation_records').update({ ...updates, updated_at: now }).eq('id', recordId);
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, ...updates } : r));
    }
    return token;
  }, [isDemo]);

  const revokeShareToken = useCallback(async (recordId: string) => {
    const now = new Date().toISOString();
    if (isDemo) {
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, share_token_revoked_at: now } : r));
    } else {
      await db('confirmation_records').update({ share_token_revoked_at: now, updated_at: now }).eq('id', recordId);
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, share_token_revoked_at: now } : r));
    }
    toast.success('Share link revoked');
  }, [isDemo]);

  // Demo activity helper
  function addActivityLocal(recordId: string, action: string, description: string) {
    setActivities(prev => [...prev, {
      id: crypto.randomUUID(),
      confirmation_record_id: recordId,
      action,
      description,
      created_at: new Date().toISOString(),
    }]);
  }

  // Check needs_update status for all records
  const recordsWithStatus = useMemo(() => {
    return records.map(record => {
      if (record.status === 'not_sent') return record;
      if (record.status === 'sent' || record.status === 'confirmed') {
        if (record.shift_hash_snapshot) {
          const currentShifts = getBookedShifts(record.facility_id, record.month_key);
          const currentHash = computeShiftHash(currentShifts);
          if (currentHash !== record.shift_hash_snapshot) {
            return { ...record, status: 'needs_update' as const };
          }
        }
      }
      return record;
    });
  }, [records, shifts, getBookedShifts]);

  // Build queue for a month
  const getMonthQueue = useCallback((monthKey: string) => {
    // Find all facilities with booked shifts in this month
    const [year, month] = monthKey.split('-').map(Number);
    const mStart = startOfMonth(new Date(year, month - 1));
    const mEnd = endOfMonth(new Date(year, month - 1));

    const facilityIds = new Set<string>();
    shifts.forEach(s => {
      const d = new Date(s.start_datetime);
      if (d >= mStart && d <= mEnd && s.status === 'booked') {
        facilityIds.add(s.facility_id);
      }
    });

    return Array.from(facilityIds).map(facilityId => {
      const facility = facilities.find(f => f.id === facilityId);
      const contact = contacts.find(c => c.facility_id === facilityId && c.is_primary);
      const bookedShifts = getBookedShifts(facilityId, monthKey);
      const record = recordsWithStatus.find(r => r.facility_id === facilityId && r.month_key === monthKey);

      return {
        facilityId,
        facilityName: facility?.name || 'Unknown',
        contact,
        shiftCount: bookedShifts.length,
        shifts: bookedShifts,
        record,
        status: record?.status || 'not_sent' as const,
      };
    }).sort((a, b) => {
      // Sort: needs_update first, then not_sent, then sent, then confirmed
      const order = { needs_update: 0, not_sent: 1, sent: 2, confirmed: 3 };
      return (order[a.status] ?? 4) - (order[b.status] ?? 4);
    });
  }, [shifts, facilities, contacts, recordsWithStatus, getBookedShifts]);

  // Status counts for a month
  const getStatusCounts = useCallback((monthKey: string) => {
    const queue = getMonthQueue(monthKey);
    return {
      not_sent: queue.filter(q => q.status === 'not_sent').length,
      sent: queue.filter(q => q.status === 'sent').length,
      confirmed: queue.filter(q => q.status === 'confirmed').length,
      needs_update: queue.filter(q => q.status === 'needs_update').length,
      total: queue.length,
    };
  }, [getMonthQueue]);

  // Get activities for a record
  const getActivities = useCallback((recordId: string) => {
    return activities
      .filter(a => a.confirmation_record_id === recordId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [activities]);

  // Count needing action (for dashboard)
  const needingActionCount = useMemo(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthKey = format(nextMonth, 'yyyy-MM');
    const counts = getStatusCounts(monthKey);
    return counts.not_sent + counts.needs_update;
  }, [getStatusCounts]);

  return {
    records: recordsWithStatus,
    loading,
    getMonthQueue,
    getStatusCounts,
    getBookedShifts,
    getOrCreateRecord,
    markSent,
    markConfirmed,
    createShareToken,
    revokeShareToken,
    getActivities,
    needingActionCount,
    refetch: fetchAll,
  };
}
