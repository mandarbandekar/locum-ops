import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';

export interface BackfillShift {
  id: string;
  facility_name: string;
  shift_date: string;
  estimated_miles: number;
  estimated_deduction_cents: number;
}

export function useBackfillMileage(onComplete?: () => void) {
  const { user, isDemo } = useAuth();
  const { shifts, facilities } = useData();
  const [scanning, setScanning] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [eligible, setEligible] = useState<BackfillShift[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setError(null);
    setScanning(true);

    if (isDemo) {
      // Generate mock preview from local data
      const facilityMap: Record<string, string> = {};
      facilities.forEach(f => { facilityMap[f.id] = f.name; });
      const pastShifts = shifts.filter(s =>
        new Date(s.end_datetime) < new Date()
      );
      const mock: BackfillShift[] = pastShifts.slice(0, 10).map(s => ({
        id: s.id,
        facility_name: facilityMap[s.facility_id] || 'Unknown Clinic',
        shift_date: s.start_datetime.split('T')[0],
        estimated_miles: Math.round((15 + Math.random() * 40) * 10) / 10 * 2,
        estimated_deduction_cents: Math.round((15 + Math.random() * 40) * 2 * 70),
      }));
      setEligible(mock);
      setScanning(false);
      return;
    }

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('backfill-mileage', {
        body: { action: 'preview' },
      });
      if (fnErr) throw fnErr;
      if (data?.error) {
        setError(data.error);
        toast.error(data.error);
      } else {
        setEligible(data?.shifts || []);
        if ((data?.shifts || []).length === 0) {
          toast.info('No eligible shifts found for mileage backfill');
        }
      }
    } catch (e: any) {
      console.error('Backfill scan error:', e);
      setError('Failed to scan shifts');
      toast.error('Failed to scan shifts');
    } finally {
      setScanning(false);
    }
  }, [isDemo, shifts, facilities]);

  const confirm = useCallback(async (shiftIds: string[]) => {
    if (shiftIds.length === 0) return;
    setConfirming(true);

    if (isDemo) {
      toast.success(`${shiftIds.length} mileage entries created as drafts`);
      setEligible(null);
      setConfirming(false);
      onComplete?.();
      return;
    }

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('backfill-mileage', {
        body: { action: 'confirm', shiftIds },
      });
      if (fnErr) throw fnErr;
      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`${data?.inserted || 0} mileage entries created as drafts for review`);
        setEligible(null);
        onComplete?.();
      }
    } catch (e: any) {
      console.error('Backfill confirm error:', e);
      toast.error('Failed to create mileage entries');
    } finally {
      setConfirming(false);
    }
  }, [isDemo, onComplete]);

  const reset = useCallback(() => {
    setEligible(null);
    setError(null);
  }, []);

  return { scan, confirm, reset, scanning, confirming, eligible, error };
}
