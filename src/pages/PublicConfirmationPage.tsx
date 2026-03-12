import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

const db = (table: string) => supabase.from(table as any);

interface ConfirmationData {
  facilityName: string;
  clinicianName: string;
  monthLabel: string;
  generatedAt: string;
  shifts: { start_datetime: string; end_datetime: string; notes: string }[];
}

export default function PublicConfirmationPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ConfirmationData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setError(true); setLoading(false); return; }
    loadConfirmation(token);
  }, [token]);

  async function loadConfirmation(token: string) {
    try {
      // Find confirmation record by share_token
      const { data: records, error: recError } = await db('confirmation_records')
        .select('*')
        .eq('share_token', token)
        .limit(1);

      if (recError || !records || records.length === 0) {
        setError(true);
        setLoading(false);
        return;
      }

      const record = records[0] as any;

      // Check if token is revoked
      if (record.share_token_revoked_at) {
        setError(true);
        setLoading(false);
        return;
      }

      // Get facility
      const { data: facilities } = await db('facilities').select('name').eq('id', record.facility_id).limit(1);
      const facilityName = (facilities && facilities[0]) ? (facilities[0] as any).name : 'Practice';

      // Get clinician name from user_profiles
      const { data: profiles } = await db('user_profiles').select('first_name,last_name').eq('user_id', record.user_id).limit(1);
      const profile = profiles && profiles[0] as any;
      const clinicianName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Relief Clinician';

      // Get linked shifts
      const { data: links } = await db('confirmation_shift_links').select('shift_id').eq('confirmation_record_id', record.id);
      const shiftIds = (links || []).map((l: any) => l.shift_id);

      let shifts: any[] = [];
      if (shiftIds.length > 0) {
        const { data: shiftData } = await db('shifts').select('start_datetime,end_datetime,notes').in('id', shiftIds).order('start_datetime');
        shifts = shiftData || [];
      }

      const [year, month] = record.month_key.split('-').map(Number);
      const monthLabel = format(new Date(year, month - 1), 'MMMM yyyy');

      setData({
        facilityName,
        clinicianName,
        monthLabel,
        generatedAt: record.sent_at || record.updated_at || record.created_at,
        shifts: shifts.map((s: any) => ({ start_datetime: s.start_datetime, end_datetime: s.end_datetime, notes: s.notes || '' })),
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">Loading confirmation…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <ShieldCheck className="h-10 w-10 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-semibold">This confirmation link is no longer available.</h2>
            <p className="text-sm text-muted-foreground">The link may have expired or been revoked.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 text-primary mb-2">
            <CalendarDays className="h-5 w-5" />
            <span className="font-semibold text-sm uppercase tracking-wider">Shift Confirmation</span>
          </div>
          <h1 className="text-2xl font-bold">{data.facilityName}</h1>
          <p className="text-muted-foreground">{data.monthLabel}</p>
          <p className="text-sm text-muted-foreground">Prepared by {data.clinicianName}</p>
        </div>

        {/* Shifts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {data.shifts.length} Booked Shift{data.shifts.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Day</TableHead>
                  <TableHead className="text-xs">Time</TableHead>
                  <TableHead className="text-xs">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.shifts.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm py-2.5">{format(new Date(s.start_datetime), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-sm py-2.5">{format(new Date(s.start_datetime), 'EEEE')}</TableCell>
                    <TableCell className="text-sm py-2.5">
                      {format(new Date(s.start_datetime), 'h:mm a')} – {format(new Date(s.end_datetime), 'h:mm a')}
                    </TableCell>
                    <TableCell className="text-sm py-2.5 text-muted-foreground">{s.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          Generated {format(new Date(data.generatedAt), 'MMM d, yyyy · h:mm a')} · Powered by LocumOps
        </p>
      </div>
    </div>
  );
}
