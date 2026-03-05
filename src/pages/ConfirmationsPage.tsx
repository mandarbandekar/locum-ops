import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { confirmationTemplate } from '@/data/templates';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { Send, CheckCircle } from 'lucide-react';

export default function ConfirmationsPage() {
  const { shifts, clinics, contacts, addEmailLog } = useData();
  const [selectedMonth, setSelectedMonth] = useState(format(addMonths(new Date(), 0), 'yyyy-MM'));
  const [sentClinics, setSentClinics] = useState<string[]>([]);

  const [year, month] = selectedMonth.split('-').map(Number);
  const mStart = startOfMonth(new Date(year, month - 1));
  const mEnd = endOfMonth(new Date(year, month - 1));
  const monthName = format(mStart, 'MMMM yyyy');

  const bookedShifts = shifts.filter(s => {
    const d = new Date(s.start_datetime);
    return d >= mStart && d <= mEnd && s.status === 'booked';
  });

  const clinicGroups = bookedShifts.reduce<Record<string, typeof bookedShifts>>((acc, s) => {
    if (!acc[s.clinic_id]) acc[s.clinic_id] = [];
    acc[s.clinic_id].push(s);
    return acc;
  }, {});

  const handleSend = (clinicId: string) => {
    const clinic = clinics.find(c => c.id === clinicId)!;
    const contact = contacts.find(c => c.clinic_id === clinicId && c.is_primary);
    const shiftList = clinicGroups[clinicId]
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
      .map(s => `  • ${format(new Date(s.start_datetime), 'EEE, MMM d')}: ${format(new Date(s.start_datetime), 'h:mm a')} - ${format(new Date(s.end_datetime), 'h:mm a')}`)
      .join('\n');

    const body = confirmationTemplate
      .replace(/{{contact_name}}/g, contact?.name || 'Team')
      .replace(/{{clinic_name}}/g, clinic.name)
      .replace(/{{month}}/g, format(mStart, 'MMMM'))
      .replace(/{{year}}/g, String(year))
      .replace(/{{shift_list}}/g, shiftList);

    addEmailLog({
      clinic_id: clinicId,
      type: 'monthly_confirm',
      subject: `Shift Confirmation - ${monthName}`,
      body,
      recipients: contact?.email || '',
      sent_at: new Date().toISOString(),
    });

    setSentClinics(prev => [...prev, clinicId]);
    toast.success(`Confirmation sent to ${clinic.name}`);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Monthly Confirmations</h1>
      </div>

      <div className="mb-4">
        <Label>Month</Label>
        <input
          type="month"
          value={selectedMonth}
          onChange={e => { setSelectedMonth(e.target.value); setSentClinics([]); }}
          className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {Object.keys(clinicGroups).length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No booked shifts for {monthName}</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(clinicGroups).map(([clinicId, cShifts]) => {
            const clinic = clinics.find(c => c.id === clinicId);
            const sent = sentClinics.includes(clinicId);
            return (
              <Card key={clinicId}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">{clinic?.name}</CardTitle>
                  {sent ? (
                    <span className="flex items-center gap-1 text-sm text-success"><CheckCircle className="h-4 w-4" /> Sent</span>
                  ) : (
                    <Button size="sm" onClick={() => handleSend(clinicId)}>
                      <Send className="mr-1 h-3 w-3" /> Send Confirmation
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {cShifts
                      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
                      .map(s => (
                        <div key={s.id} className="text-sm flex justify-between p-2 rounded bg-muted/50">
                          <span>{format(new Date(s.start_datetime), 'EEE, MMM d')}</span>
                          <span className="text-muted-foreground">{format(new Date(s.start_datetime), 'h:mm a')} - {format(new Date(s.end_datetime), 'h:mm a')}</span>
                          <span>${s.rate_applied}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
