import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import {
  FacilityConfirmationSettings,
  ConfirmationEmail,
  ConfirmationEmailStatus,
} from '@/types/clinicConfirmations';
import { computeShiftHash } from '@/types/confirmations';
import { startOfMonth, endOfMonth, format, subDays, addMonths } from 'date-fns';
import { toast } from 'sonner';
import { friendlyDbError } from '@/lib/errorUtils';

const db = (table: string) => supabase.from(table as any);

function stripDbFields(row: any): any {
  if (!row) return row;
  const { user_id, created_at, updated_at, ...rest } = row;
  return rest;
}

// Seed data for demo mode
function getDemoSettings(): FacilityConfirmationSettings[] {
  return [
    { id: 'fcs1', facility_id: 'c1', primary_contact_name: 'Sarah Johnson', primary_contact_email: 'sarah@greenfield.com', secondary_contact_email: '', monthly_enabled: true, monthly_send_offset_days: 7, preshift_enabled: true, preshift_send_offset_days: 3, auto_send_enabled: true },
    { id: 'fcs2', facility_id: 'c2', primary_contact_name: 'Dr. Emily Park', primary_contact_email: 'emily@evergreen-hc.com', secondary_contact_email: '', monthly_enabled: true, monthly_send_offset_days: 5, preshift_enabled: false, preshift_send_offset_days: 3, auto_send_enabled: true },
    { id: 'fcs3', facility_id: 'c4', primary_contact_name: 'Rachel Kim', primary_contact_email: 'rachel@mtviewpractice.com', secondary_contact_email: '', monthly_enabled: false, monthly_send_offset_days: 7, preshift_enabled: true, preshift_send_offset_days: 1, auto_send_enabled: true },
  ];
}

function getDemoEmails(): ConfirmationEmail[] {
  const now = new Date();
  const nextMonth = addMonths(now, 1);
  const monthKey = format(nextMonth, 'yyyy-MM');
  return [
    {
      id: 'ce1', facility_id: 'c1', shift_id: null, month_key: monthKey, type: 'monthly',
      recipient_email: 'sarah@greenfield.com', subject: `Confirmed Relief Dates for ${format(nextMonth, 'MMMM yyyy')}`,
      body: 'Hi Sarah, confirming my booked shifts...', status: 'sent',
      scheduled_for: subDays(startOfMonth(nextMonth), 7).toISOString(),
      sent_at: subDays(startOfMonth(nextMonth), 7).toISOString(),
      confirmed_at: null, shift_hash_snapshot: 'old-hash',
      created_at: subDays(now, 10).toISOString(),
    },
    {
      id: 'ce2', facility_id: 'c2', shift_id: null, month_key: monthKey, type: 'monthly',
      recipient_email: 'emily@evergreen-hc.com', subject: `Confirmed Relief Dates for ${format(nextMonth, 'MMMM yyyy')}`,
      body: 'Hi Dr. Park, confirming my booked shifts...', status: 'confirmed',
      scheduled_for: subDays(startOfMonth(nextMonth), 5).toISOString(),
      sent_at: subDays(startOfMonth(nextMonth), 5).toISOString(),
      confirmed_at: subDays(now, 2).toISOString(), shift_hash_snapshot: null,
      created_at: subDays(now, 8).toISOString(),
    },
  ];
}

export function useClinicConfirmations() {
  const { user, isDemo } = useAuth();
  const { shifts, facilities, contacts } = useData();
  const { profile } = useUserProfile();
  const [settings, setSettings] = useState<FacilityConfirmationSettings[]>(isDemo ? getDemoSettings() : []);
  const [emails, setEmails] = useState<ConfirmationEmail[]>(isDemo ? getDemoEmails() : []);
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo || !user) { setLoading(false); return; }
    fetchAll();
  }, [isDemo, user?.id]);

  async function fetchAll() {
    try {
      const [sRes, eRes] = await Promise.all([
        db('facility_confirmation_settings').select('*'),
        db('confirmation_emails').select('*').order('created_at', { ascending: false }),
      ]);
      setSettings((sRes.data || []).map(stripDbFields));
      setEmails((eRes.data || []).map(stripDbFields));
    } catch (err) {
      console.error('Failed to load clinic confirmations:', err);
    } finally {
      setLoading(false);
    }
  }

  // Get settings for a facility
  const getSettings = useCallback((facilityId: string) => {
    return settings.find(s => s.facility_id === facilityId) || null;
  }, [settings]);

  // Save settings
  const saveSettings = useCallback(async (s: FacilityConfirmationSettings) => {
    if (isDemo) {
      setSettings(prev => {
        const exists = prev.find(x => x.facility_id === s.facility_id);
        if (exists) return prev.map(x => x.facility_id === s.facility_id ? s : x);
        return [...prev, { ...s, id: crypto.randomUUID() }];
      });
      toast.success('Confirmation settings saved');
      return;
    }

    const existing = settings.find(x => x.facility_id === s.facility_id);
    if (existing) {
      const { id, ...rest } = s;
      const { error } = await db('facility_confirmation_settings').update(rest).eq('id', existing.id);
      if (error) { toast.error(friendlyDbError(error)); return; }
      setSettings(prev => prev.map(x => x.id === existing.id ? { ...s, id: existing.id } : x));
    } else {
      const { data, error } = await db('facility_confirmation_settings')
        .insert({ user_id: user!.id, ...s })
        .select().single();
      if (error) { toast.error(friendlyDbError(error)); return; }
      setSettings(prev => [...prev, stripDbFields(data)]);
    }
    toast.success('Confirmation settings saved');
  }, [isDemo, settings, user]);

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

  // Get booked shifts for a facility in the future
  const getUpcomingBookedShifts = useCallback((facilityId: string) => {
    const now = new Date();
    return shifts.filter(s =>
      s.facility_id === facilityId && new Date(s.start_datetime) >= now && s.status === 'booked'
    ).sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
  }, [shifts]);

  // Detect needs_update on sent emails
  const emailsWithStatus = useMemo(() => {
    return emails.map(email => {
      if (email.type === 'monthly' && (email.status === 'sent' || email.status === 'confirmed') && email.shift_hash_snapshot && email.month_key) {
        const currentShifts = getBookedShifts(email.facility_id, email.month_key);
        const currentHash = computeShiftHash(currentShifts);
        if (currentHash !== email.shift_hash_snapshot) {
          return { ...email, status: 'needs_update' as ConfirmationEmailStatus };
        }
      }
      return email;
    });
  }, [emails, shifts, getBookedShifts]);

  // Generate email body
  const generateMonthlyBody = useCallback((facilityId: string, monthKey: string): { subject: string; body: string } => {
    const facility = facilities.find(f => f.id === facilityId);
    const facilitySettings = settings.find(s => s.facility_id === facilityId);
    const bookedShifts = getBookedShifts(facilityId, monthKey);
    const [year, month] = monthKey.split('-').map(Number);
    const monthLabel = format(new Date(year, month - 1), 'MMMM yyyy');
    const monthName = format(new Date(year, month - 1), 'MMMM');
    const contactName = facilitySettings?.primary_contact_name || 'Team';
    const clinicianName = profile ? `${profile.first_name} ${profile.last_name}` : 'Your Locum Clinician';

    const shiftList = bookedShifts
      .map(s => `  - ${format(new Date(s.start_datetime), 'EEE, MMM d')} — ${format(new Date(s.start_datetime), 'h:mm a')} – ${format(new Date(s.end_datetime), 'h:mm a')}`)
      .join('\n');

    return {
      subject: `Confirmed Relief Dates for ${monthLabel}`,
      body: `Hi ${contactName},\n\nConfirming my currently booked relief coverage dates for ${facility?.name || 'your practice'} in ${monthName}:\n\n${shiftList}\n\nPlease review and let me know if anything looks incorrect.\n\nThank you,\n${clinicianName}`,
    };
  }, [facilities, settings, getBookedShifts, profile]);

  const generatePreshiftBody = useCallback((facilityId: string, shiftId: string): { subject: string; body: string } => {
    const facility = facilities.find(f => f.id === facilityId);
    const facilitySettings = settings.find(s => s.facility_id === facilityId);
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return { subject: '', body: '' };

    const contactName = facilitySettings?.primary_contact_name || 'Team';
    const clinicianName = profile ? `${profile.first_name} ${profile.last_name}` : 'Your Locum Clinician';
    const dateLabel = format(new Date(shift.start_datetime), 'EEEE, MMMM d, yyyy');
    const timeLabel = `${format(new Date(shift.start_datetime), 'h:mm a')} – ${format(new Date(shift.end_datetime), 'h:mm a')}`;

    return {
      subject: `Upcoming Relief Shift Reminder — ${format(new Date(shift.start_datetime), 'MMM d')}`,
      body: `Hi ${contactName},\n\nJust confirming my upcoming relief shift at ${facility?.name || 'your practice'}:\n\n  - ${dateLabel}\n  - ${timeLabel}\n\nPlease let me know if anything has changed.\n\nThank you,\n${clinicianName}`,
    };
  }, [facilities, settings, shifts, profile]);

  // Create / send a confirmation email
  const sendConfirmationEmail = useCallback(async (
    facilityId: string,
    type: 'monthly' | 'preshift',
    monthKey: string | null,
    shiftId: string | null,
    bodyOverride?: string,
    subjectOverride?: string,
  ) => {
    const facilitySettings = settings.find(s => s.facility_id === facilityId);
    const recipientEmail = facilitySettings?.primary_contact_email || '';
    if (!recipientEmail) {
      toast.error('No contact email configured for this facility');
      return;
    }

    let subject = subjectOverride || '';
    let body = bodyOverride || '';
    let hashSnapshot: string | null = null;

    if (type === 'monthly' && monthKey) {
      const gen = generateMonthlyBody(facilityId, monthKey);
      if (!subject) subject = gen.subject;
      if (!body) body = gen.body;
      const bookedShifts = getBookedShifts(facilityId, monthKey);
      hashSnapshot = computeShiftHash(bookedShifts);
    } else if (type === 'preshift' && shiftId) {
      const gen = generatePreshiftBody(facilityId, shiftId);
      if (!subject) subject = gen.subject;
      if (!body) body = gen.body;
    }

    const now = new Date().toISOString();
    const emailRecord: any = {
      facility_id: facilityId,
      shift_id: shiftId,
      month_key: monthKey,
      type,
      recipient_email: recipientEmail,
      subject,
      body,
      status: 'sent',
      sent_at: now,
      shift_hash_snapshot: hashSnapshot,
    };

    if (isDemo) {
      const newEmail: ConfirmationEmail = { ...emailRecord, id: crypto.randomUUID(), created_at: now };
      setEmails(prev => [newEmail, ...prev]);
      toast.success('Confirmation sent');
      return newEmail;
    }

    const { data, error } = await db('confirmation_emails')
      .insert({ user_id: user!.id, ...emailRecord })
      .select().single();
    if (error) { toast.error(friendlyDbError(error)); return null; }
    const saved = stripDbFields(data) as ConfirmationEmail;
    setEmails(prev => [saved, ...prev]);

    // Save snapshot
    if (type === 'monthly' && monthKey) {
      const bookedShifts = getBookedShifts(facilityId, monthKey);
      await db('confirmation_snapshots').insert({
        confirmation_email_id: saved.id,
        shift_count_snapshot: bookedShifts.length,
        shift_data_snapshot: bookedShifts.map(s => ({
          id: s.id,
          start: s.start_datetime,
          end: s.end_datetime,
          rate: s.rate_applied,
        })),
      });
    }

    toast.success('Confirmation sent');
    return saved;
  }, [isDemo, user, settings, getBookedShifts, generateMonthlyBody, generatePreshiftBody]);

  // Mark as confirmed
  const markConfirmed = useCallback(async (emailId: string) => {
    const now = new Date().toISOString();
    if (isDemo) {
      setEmails(prev => prev.map(e => e.id === emailId ? { ...e, status: 'confirmed', confirmed_at: now } : e));
      toast.success('Marked as confirmed');
      return;
    }
    const { error } = await db('confirmation_emails').update({ status: 'confirmed', confirmed_at: now }).eq('id', emailId);
    if (error) { toast.error(friendlyDbError(error)); return; }
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, status: 'confirmed' as const, confirmed_at: now } : e));
    toast.success('Marked as confirmed');
  }, [isDemo]);

  // Build queue for the Clinic Confirmations screen
  const getMonthQueue = useCallback((monthKey: string) => {
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
      const facilitySettings = settings.find(s => s.facility_id === facilityId);
      const contact = contacts.find(c => c.facility_id === facilityId && c.is_primary);
      const bookedShifts = getBookedShifts(facilityId, monthKey);

      // Find the latest monthly email for this facility/month
      const monthlyEmails = emailsWithStatus.filter(e =>
        e.facility_id === facilityId && e.month_key === monthKey && e.type === 'monthly'
      );
      const latestEmail = monthlyEmails[0] || null;

      // Find pre-shift emails for this month
      const preshiftEmails = emailsWithStatus.filter(e =>
        e.facility_id === facilityId && e.type === 'preshift' &&
        bookedShifts.some(s => s.id === e.shift_id)
      );

      const status = latestEmail?.status || 'not_sent';

      return {
        facilityId,
        facilityName: facility?.name || 'Unknown',
        facilitySettings,
        contact,
        contactEmail: facilitySettings?.primary_contact_email || contact?.email || '',
        shiftCount: bookedShifts.length,
        shifts: bookedShifts,
        latestEmail,
        preshiftEmails,
        status: status as ConfirmationEmailStatus | 'not_sent',
        monthlyEnabled: facilitySettings?.monthly_enabled ?? false,
        preshiftEnabled: facilitySettings?.preshift_enabled ?? false,
        autoSendEnabled: facilitySettings?.auto_send_enabled ?? false,
      };
    }).sort((a, b) => {
      const order: Record<string, number> = { needs_update: 0, scheduled: 1, not_sent: 2, sent: 3, confirmed: 4, failed: 5 };
      return (order[a.status] ?? 6) - (order[b.status] ?? 6);
    });
  }, [shifts, facilities, contacts, settings, emailsWithStatus, getBookedShifts]);

  const getStatusCounts = useCallback((monthKey: string) => {
    const queue = getMonthQueue(monthKey);
    return {
      not_sent: queue.filter(q => q.status === 'not_sent').length,
      scheduled: queue.filter(q => q.status === 'scheduled').length,
      sent: queue.filter(q => q.status === 'sent').length,
      confirmed: queue.filter(q => q.status === 'confirmed').length,
      needs_update: queue.filter(q => q.status === 'needs_update').length,
      failed: queue.filter(q => q.status === 'failed').length,
      total: queue.length,
    };
  }, [getMonthQueue]);

  // History for a facility
  const getHistory = useCallback((facilityId: string) => {
    return emailsWithStatus
      .filter(e => e.facility_id === facilityId)
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  }, [emailsWithStatus]);

  // Dashboard: count of confirmations needing action next month
  const needingActionCount = useMemo(() => {
    const nextMonth = addMonths(new Date(), 1);
    const monthKey = format(nextMonth, 'yyyy-MM');
    const counts = getStatusCounts(monthKey);
    return counts.not_sent + counts.needs_update;
  }, [getStatusCounts]);

  return {
    settings,
    emails: emailsWithStatus,
    loading,
    getSettings,
    saveSettings,
    getBookedShifts,
    getUpcomingBookedShifts,
    getMonthQueue,
    getStatusCounts,
    generateMonthlyBody,
    generatePreshiftBody,
    sendConfirmationEmail,
    markConfirmed,
    getHistory,
    needingActionCount,
    refetch: fetchAll,
  };
}
