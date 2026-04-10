import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

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
      const { data: result, error: fnError } = await supabase.functions.invoke('public-confirmation', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: undefined,
      });

      // supabase.functions.invoke doesn't support query params natively,
      // so we use a direct fetch instead
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${baseUrl}/functions/v1/public-confirmation?token=${encodeURIComponent(token)}`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        setError(true);
        setLoading(false);
        return;
      }

      const payload = await response.json();

      const [year, month] = payload.monthKey.split('-').map(Number);
      const monthLabel = format(new Date(year, month - 1), 'MMMM yyyy');

      setData({
        facilityName: payload.facilityName,
        clinicianName: payload.clinicianName,
        monthLabel,
        generatedAt: payload.generatedAt,
        shifts: payload.shifts,
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
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 text-primary mb-2">
            <CalendarDays className="h-5 w-5" />
            <span className="font-semibold text-sm uppercase tracking-wider">Shift Confirmation</span>
          </div>
          <h1 className="text-2xl font-bold">{data.facilityName}</h1>
          <p className="text-muted-foreground">{data.monthLabel}</p>
          <p className="text-sm text-muted-foreground">Prepared by {data.clinicianName}</p>
        </div>

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
