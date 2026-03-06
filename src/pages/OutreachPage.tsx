import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { outreachTemplate } from '@/data/templates';
import { format, addMonths } from 'date-fns';
import { toast } from 'sonner';
import { Send } from 'lucide-react';

export default function OutreachPage() {
  const { facilities, contacts, addEmailLog, updateFacility } = useData();
  const [selectedMonth, setSelectedMonth] = useState(format(addMonths(new Date(), 1), 'yyyy-MM'));
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [emailBody, setEmailBody] = useState(outreachTemplate);

  const activeFacilities = facilities.filter(c => c.status !== 'paused');

  const toggleFacility = (id: string) => {
    setSelectedFacilities(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSend = () => {
    if (selectedFacilities.length === 0) { toast.error('Select at least one facility'); return; }

    const [year, month] = selectedMonth.split('-');
    const monthName = format(new Date(Number(year), Number(month) - 1), 'MMMM');

    selectedFacilities.forEach(facilityId => {
      const facility = facilities.find(c => c.id === facilityId)!;
      const contact = contacts.find(c => c.facility_id === facilityId && c.is_primary);
      const body = emailBody
        .replace(/{{contact_name}}/g, contact?.name || 'Team')
        .replace(/{{facility_name}}/g, facility.name)
        .replace(/{{month}}/g, monthName)
        .replace(/{{year}}/g, year);

      addEmailLog({
        facility_id: facilityId,
        type: 'outreach_open',
        subject: `Locum Availability - ${monthName} ${year}`,
        body,
        recipients: contact?.email || '',
        sent_at: new Date().toISOString(),
      });

      updateFacility({ ...facility, outreach_last_sent_at: new Date().toISOString() });
    });

    toast.success(`Outreach sent to ${selectedFacilities.length} facility(s)`);
    setSelectedFacilities([]);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Monthly Outreach</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Select Month & Facilities</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Month</Label>
                <Input type="month" value={selectedMonth} onChange={(e: any) => setSelectedMonth(e.target.value)} />
              </div>
              <div>
                <Label className="mb-2 block">Facilities</Label>
                <div className="space-y-2 max-h-60 overflow-auto">
                  {activeFacilities.map(c => (
                    <label key={c.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                      <Checkbox checked={selectedFacilities.includes(c.id)} onCheckedChange={() => toggleFacility(c.id)} />
                      <span className="text-sm">{c.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {c.outreach_last_sent_at ? `Last: ${format(new Date(c.outreach_last_sent_at), 'MMM d')}` : 'Never'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Email Template</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={14} className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground mt-2">
                Variables: {'{{contact_name}}'}, {'{{facility_name}}'}, {'{{month}}'}, {'{{year}}'}
              </p>
            </CardContent>
          </Card>
          <Button onClick={handleSend} className="w-full" disabled={selectedFacilities.length === 0}>
            <Send className="mr-2 h-4 w-4" /> Send to {selectedFacilities.length} Facility(s)
          </Button>
        </div>
      </div>
    </div>
  );
}

function Input({ type, value, onChange, ...props }: any) {
  return <input type={type} value={value} onChange={onChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...props} />;
}
