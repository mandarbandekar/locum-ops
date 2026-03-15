import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
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
  billing_email?: string;
  billing_email_cc?: string;
  billing_email_bcc?: string;
  address?: string;
  weekday_rate?: number;
  weekend_rate?: number;
  partial_day_rate?: number;
  holiday_rate?: number;
  telemedicine_rate?: number;
  custom_rates?: Array<{ label: string; amount: number }>;
  notes?: string;
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
        invoice_email_to: input.billing_email || '',
        invoice_email_cc: input.billing_email_cc || '',
        invoice_email_bcc: input.billing_email_bcc || '',
      }).select().single();

      if (error) { toast.error(error.message); return null; }
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
        } as any);
      }

      return facility;
    } catch (err: any) {
      toast.error(err.message || 'Failed to add facility');
      return null;
    } finally {
      setSaving(false);
    }
  }, [user]);

  const addShift = useCallback(async (input: ManualShiftInput): Promise<Shift | null> => {
    if (!user) return null;
    setSaving(true);
    try {
      const startDt = `${input.date}T${input.start_time}:00`;
      const endDt = `${input.date}T${input.end_time}:00`;

      const { data, error } = await db('shifts').insert({
        user_id: user.id,
        facility_id: input.facility_id,
        start_datetime: startDt,
        end_datetime: endDt,
        status: 'booked',
        rate_applied: input.rate || 0,
        notes: input.notes || '',
        color: 'blue',
      }).select().single();

      if (error) { toast.error(error.message); return null; }
      const shift = stripDbFields(data) as Shift;
      setShifts(prev => [...prev, shift]);
      return shift;
    } catch (err: any) {
      toast.error(err.message || 'Failed to add shift');
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
