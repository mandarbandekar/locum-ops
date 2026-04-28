import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { friendlyDbError } from '@/lib/errorUtils';
import type { Facility, Shift } from '@/types';

const db = (table: string) => supabase.from(table as any);

function stripDbFields(row: any): any {
  if (!row) return row;
  const { user_id, created_at, updated_at, ...rest } = row;
  return rest;
}

export interface ManualFacilityInput {
  name: string;
  contact_name?: string;
  billing_name_to?: string;
  billing_email?: string;
  billing_name_cc?: string;
  billing_email_cc?: string;
  billing_name_bcc?: string;
  billing_email_bcc?: string;
  address?: string;
  weekday_rate?: number;
  weekday_rate_kind?: 'flat' | 'hourly';
  weekend_rate?: number;
  partial_day_rate?: number;
  holiday_rate?: number;
  telemedicine_rate?: number;
  custom_rates?: Array<{ label: string; amount: number; kind?: 'flat' | 'hourly' }>;
  notes?: string;
  billing_cadence?: string;
  billing_week_end_day?: string;
  billing_anchor_date?: string;
  auto_generate_invoices?: boolean;
  engagement_type?: 'direct' | 'third_party';
  source_name?: string | null;
  tax_form_type?: '1099' | 'w2' | null;
}

export interface ManualShiftInput {
  facility_id: string;
  date: string;
  start_time: string;
  end_time: string;
  rate?: number;
  notes?: string;
}

export function useManualSetup() {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [saving, setSaving] = useState(false);

  const addFacility = useCallback(async (input: ManualFacilityInput): Promise<Facility | null> => {
    if (!user) return null;
    setSaving(true);
    try {
      const prefix = (input.name || 'FAC').substring(0, 3).toUpperCase();
      const engagementType = input.engagement_type ?? 'direct';
      const isDirect = engagementType === 'direct';
      const { data, error } = await db('facilities').insert({
        user_id: user.id,
        name: input.name,
        status: 'active',
        address: input.address || '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notes: input.notes || '',
        outreach_last_sent_at: null,
        tech_computer_info: '',
        tech_wifi_info: '',
        tech_pims_info: '',
        clinic_access_info: '',
        invoice_prefix: prefix,
        invoice_due_days: 30,
        invoice_name_to: input.billing_name_to || '',
        invoice_email_to: input.billing_email || '',
        invoice_name_cc: input.billing_name_cc || '',
        invoice_email_cc: input.billing_email_cc || '',
        invoice_name_bcc: input.billing_name_bcc || '',
        invoice_email_bcc: input.billing_email_bcc || '',
        billing_cadence: input.billing_cadence || 'monthly',
        billing_cycle_anchor_date: input.billing_anchor_date || null,
        billing_week_end_day: input.billing_week_end_day || 'saturday',
        auto_generate_invoices: isDirect ? (input.auto_generate_invoices ?? true) : false,
        engagement_type: engagementType,
        source_name: input.source_name ?? null,
        tax_form_type: input.tax_form_type ?? null,
      }).select().single();

      if (error) { console.error(error); toast.error(friendlyDbError(error)); return null; }
      const facility = stripDbFields(data) as Facility;
      setFacilities(prev => [...prev, facility]);

      // Create contact if provided
      if (input.contact_name) {
        await db('facility_contacts').insert({
          user_id: user.id,
          facility_id: facility.id,
          name: input.contact_name,
          role: 'Practice Manager',
          email: input.billing_email || '',
          phone: '',
          is_primary: true,
        });
      }

      // Create terms if any rate provided
      const hasRates = input.weekday_rate || input.weekend_rate || input.partial_day_rate || input.holiday_rate || input.telemedicine_rate || (input.custom_rates && input.custom_rates.length > 0);
      if (hasRates) {
        const rateKinds: Record<string, 'flat' | 'hourly'> = {};
        if (input.weekday_rate_kind && input.weekday_rate_kind !== 'flat') {
          rateKinds.weekday = input.weekday_rate_kind;
        }
        await db('terms_snapshots').insert({
          user_id: user.id,
          facility_id: facility.id,
          weekday_rate: input.weekday_rate || 0,
          weekend_rate: input.weekend_rate || 0,
          partial_day_rate: input.partial_day_rate || 0,
          holiday_rate: input.holiday_rate || 0,
          telemedicine_rate: input.telemedicine_rate || 0,
          cancellation_policy_text: '',
          overtime_policy_text: '',
          late_payment_policy_text: '',
          special_notes: '',
          custom_rates: input.custom_rates || [],
          rate_kinds: rateKinds,
        } as any);
      }

      return facility;
    } catch (err: any) {
      toast.error(friendlyDbError(err));
      return null;
    } finally {
      setSaving(false);
    }
  }, [user]);

  const addShift = useCallback(async (input: ManualShiftInput): Promise<Shift | null> => {
    if (!user) return null;
    setSaving(true);
    try {
      const startDt = new Date(`${input.date}T${input.start_time}:00`);
      let endDt = new Date(`${input.date}T${input.end_time}:00`);
      if (endDt.getTime() <= startDt.getTime()) {
        // Overnight shift — roll end into next day.
        endDt = new Date(endDt.getTime() + 24 * 60 * 60 * 1000);
      }
      const startIso = startDt.toISOString();
      const endIso = endDt.toISOString();

      const { data, error } = await db('shifts').insert({
        user_id: user.id,
        facility_id: input.facility_id,
        start_datetime: startIso,
        end_datetime: endIso,
        status: 'booked',
        rate_applied: input.rate || 0,
        notes: input.notes || '',
        color: 'blue',
      }).select().single();

      if (error) { console.error(error); toast.error(friendlyDbError(error)); return null; }
      const shift = stripDbFields(data) as Shift;
      setShifts(prev => [...prev, shift]);
      return shift;
    } catch (err: any) {
      toast.error(friendlyDbError(err));
      return null;
    } finally {
      setSaving(false);
    }
  }, [user]);

  const canComplete = facilities.length >= 1 && shifts.length >= 1;

  return {
    facilities,
    shifts,
    saving,
    addFacility,
    addShift,
    canComplete,
  };
}
