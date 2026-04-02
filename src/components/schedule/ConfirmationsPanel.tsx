import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Send, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { getConfirmationTemplate } from '@/data/templates';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { toast } from 'sonner';

export function ConfirmationsPanel() {
  const { shifts, facilities, contacts, emailLogs, addEmailLog } = useData();
  const { profile } = useUserProfile();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [previewFacilityId, setPreviewFacilityId] = useState<string | null>(null);
  const [previewBody, setPreviewBody] = useState('');

  const mStart = startOfMonth(currentMonth);
  const mEnd = endOfMonth(currentMonth);
  const monthLabel = format(currentMonth, 'MMM yyyy');
  const monthKey = format(currentMonth, 'yyyy-MM');

  // Get booked shifts grouped by facility for this month
  const facilityGroups = useMemo(() => {
    const booked = shifts.filter(s => {
      const d = new Date(s.start_datetime);
      return d >= mStart && d <= mEnd;
    });

    return booked.reduce<Record<string, typeof booked>>((acc, s) => {
      if (!acc[s.facility_id]) acc[s.facility_id] = [];
      acc[s.facility_id].push(s);
      return acc;
    }, {});
  }, [shifts, mStart, mEnd]);

  // For each facility, find the last confirmation log for this month and check if shifts changed
  const getConfirmationStatus = (facilityId: string, facilityShifts: typeof shifts) => {
    const logs = emailLogs.filter(
      l => l.facility_id === facilityId && l.type === 'monthly_confirm' && l.subject.includes(format(mStart, 'MMMM yyyy'))
    );
    const lastLog = logs.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];
    if (!lastLog) return { status: 'not_sent' as const, lastLog: null };

    // Check if shifts have been updated since the last confirmation
    // We store meta_last_shift_updated_at in the body as a marker
    const metaMatch = lastLog.body.match(/\[meta_last_shift_updated_at:([^\]]+)\]/);
    if (metaMatch) {
      const snapshotTime = new Date(metaMatch[1]).getTime();
      const maxUpdated = Math.max(
        ...facilityShifts.map(s => {
          // Use start_datetime as a proxy for updated_at since we strip DB fields
          // In practice, any shift change triggers a re-render
          return new Date(s.start_datetime).getTime() + new Date(s.end_datetime).getTime() + s.rate_applied;
        })
      );
      // Simple hash comparison — if any shift data changed, the hash changes
      const currentHash = facilityShifts
        .map(s => `${s.start_datetime}|${s.end_datetime}|${s.rate_applied}`)
        .sort()
        .join(',');
      const metaHashMatch = lastLog.body.match(/\[meta_shift_hash:([^\]]+)\]/);
      if (metaHashMatch && metaHashMatch[1] !== currentHash) {
        return { status: 'needs_update' as const, lastLog };
      }
    }

    return { status: 'sent' as const, lastLog };
  };

  const generateBody = (facilityId: string) => {
    const facility = facilities.find(c => c.id === facilityId)!;
    const contact = contacts.find(c => c.facility_id === facilityId && c.is_primary);
    const fShifts = facilityGroups[facilityId] || [];
    const tone = (profile?.email_tone as any) || 'neutral';

    const shiftList = fShifts
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
      .map(s => `  • ${format(new Date(s.start_datetime), 'EEE, MMM d')}: ${format(new Date(s.start_datetime), 'h:mm a')} - ${format(new Date(s.end_datetime), 'h:mm a')}`)
      .join('\n');

    return getConfirmationTemplate(tone)
      .replace(/{{contact_name}}/g, contact?.name || 'Team')
      .replace(/{{facility_name}}/g, facility.name)
      .replace(/{{month}}/g, format(mStart, 'MMMM'))
      .replace(/{{year}}/g, format(mStart, 'yyyy'))
      .replace(/{{shift_list}}/g, shiftList);
  };

  const handlePreview = (facilityId: string) => {
    setPreviewBody(generateBody(facilityId));
    setPreviewFacilityId(facilityId);
  };

  const handleSend = (facilityId: string, body?: string) => {
    const facility = facilities.find(c => c.id === facilityId)!;
    const contact = contacts.find(c => c.facility_id === facilityId && c.is_primary);
    const fShifts = facilityGroups[facilityId] || [];
    const emailBody = body || generateBody(facilityId);

    // Create a hash of current shifts for change detection
    const shiftHash = fShifts
      .map(s => `${s.start_datetime}|${s.end_datetime}|${s.rate_applied}|${s.status}`)
      .sort()
      .join(',');

    const bodyWithMeta = `${emailBody}\n\n[meta_month:${monthKey}][meta_last_shift_updated_at:${new Date().toISOString()}][meta_shift_hash:${shiftHash}]`;

    addEmailLog({
      facility_id: facilityId,
      type: 'monthly_confirm',
      subject: `Shift Confirmation - ${format(mStart, 'MMMM yyyy')}`,
      body: bodyWithMeta,
      recipients: contact?.email || '',
      sent_at: new Date().toISOString(),
    });

    toast.success(`Confirmation sent to ${facility.name}`);
    setPreviewFacilityId(null);
  };

  const facilityEntries = Object.entries(facilityGroups);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Confirmations</h3>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {facilityEntries.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No booked shifts for {monthLabel}</p>
      ) : (
        <div className="space-y-2">
          {facilityEntries.map(([facilityId, fShifts]) => {
            const facility = facilities.find(c => c.id === facilityId);
            const { status } = getConfirmationStatus(facilityId, fShifts);
            const sortedShifts = [...fShifts].sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

            return (
              <Card key={facilityId} className="border">
                <CardHeader className="p-3 pb-1">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-medium truncate">{facility?.name}</CardTitle>
                    {status === 'sent' && (
                      <Badge variant="outline" className="text-xs shrink-0 border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10">
                        <CheckCircle className="h-3 w-3 mr-1" /> Sent
                      </Badge>
                    )}
                    {status === 'needs_update' && (
                      <Badge variant="outline" className="text-xs shrink-0 border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Update
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-1">
                  <div className="space-y-0.5 mb-2">
                    {sortedShifts.map(s => (
                      <div key={s.id} className="text-xs flex justify-between text-muted-foreground">
                        <span>{format(new Date(s.start_datetime), 'EEE, MMM d')}</span>
                        <span>{format(new Date(s.start_datetime), 'h:mma')}–{format(new Date(s.end_datetime), 'h:mma')}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => handlePreview(facilityId)}>
                      <Eye className="h-3 w-3 mr-1" /> Preview
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      variant={status === 'needs_update' ? 'default' : 'outline'}
                      onClick={() => handleSend(facilityId)}
                    >
                      <Send className="h-3 w-3 mr-1" /> {status === 'needs_update' ? 'Resend' : 'Send'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewFacilityId} onOpenChange={() => setPreviewFacilityId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview Confirmation Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <p className="text-sm">
                {previewFacilityId && contacts.find(c => c.facility_id === previewFacilityId && c.is_primary)?.email || 'No primary contact'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Subject</Label>
              <p className="text-sm">Shift Confirmation - {format(mStart, 'MMMM yyyy')}</p>
            </div>
            <Textarea
              value={previewBody}
              onChange={e => setPreviewBody(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPreviewFacilityId(null)}>Cancel</Button>
              <Button className="flex-1" onClick={() => previewFacilityId && handleSend(previewFacilityId, previewBody)}>
                <Send className="h-4 w-4 mr-2" /> Send Confirmation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
