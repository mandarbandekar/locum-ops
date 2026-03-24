import { useState, useEffect, useMemo } from 'react';
import { useClinicConfirmations } from '@/hooks/useClinicConfirmations';
import { useData } from '@/contexts/DataContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Send, CheckCircle, AlertTriangle, Clock, Copy, User, CalendarDays, History, Timer,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Props {
  facilityId: string;
  monthKey: string;
  open: boolean;
  onClose: () => void;
}

export function ClinicConfirmationDrawer({ facilityId, monthKey, open, onClose }: Props) {
  const { facilities } = useData();
  const {
    getBookedShifts, getUpcomingBookedShifts, generateMonthlyBody, generatePreshiftBody,
    sendConfirmationEmail, markConfirmed, getHistory, getSettings, getMonthQueue,
  } = useClinicConfirmations();

  const facility = facilities.find(f => f.id === facilityId);
  const facilitySettings = getSettings(facilityId);
  const bookedShifts = getBookedShifts(facilityId, monthKey);
  const history = getHistory(facilityId);
  const queue = getMonthQueue(monthKey);
  const queueItem = queue.find(q => q.facilityId === facilityId);

  const [year, month] = monthKey.split('-').map(Number);
  const monthLabel = format(new Date(year, month - 1), 'MMMM yyyy');

  const { subject: defaultSubject, body: defaultBody } = useMemo(
    () => generateMonthlyBody(facilityId, monthKey),
    [facilityId, monthKey, generateMonthlyBody]
  );

  const [messageBody, setMessageBody] = useState(defaultBody);
  const [messageSubject, setMessageSubject] = useState(defaultSubject);
  useEffect(() => { setMessageBody(defaultBody); setMessageSubject(defaultSubject); }, [defaultBody, defaultSubject]);

  const status = queueItem?.status || 'not_sent';

  const handleSendMonthly = async () => {
    await sendConfirmationEmail(facilityId, 'monthly', monthKey, null, messageBody, messageSubject);
  };

  const handleMarkConfirmed = async () => {
    if (queueItem?.latestEmail) {
      await markConfirmed(queueItem.latestEmail.id);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${messageSubject}\n\n${messageBody}`);
    toast.success('Copied to clipboard');
  };

  // Pre-shift emails for upcoming shifts
  const upcomingShifts = getUpcomingBookedShifts(facilityId).filter(s => {
    const d = new Date(s.start_datetime);
    const [y, m] = monthKey.split('-').map(Number);
    return d.getMonth() + 1 === m && d.getFullYear() === y;
  });

  const handleSendPreshift = async (shiftId: string) => {
    const { subject, body } = generatePreshiftBody(facilityId, shiftId);
    await sendConfirmationEmail(facilityId, 'preshift', monthKey, shiftId, body, subject);
  };

  const statusBadgeConfig: Record<string, { icon: typeof CheckCircle; label: string; className: string }> = {
    not_sent: { icon: Clock, label: 'Not sent', className: 'border-muted-foreground/30 text-muted-foreground bg-muted/50' },
    scheduled: { icon: Timer, label: 'Scheduled', className: 'border-info/30 text-info bg-info/10' },
    sent: { icon: Send, label: 'Sent', className: 'border-primary/30 text-primary bg-primary/10' },
    confirmed: { icon: CheckCircle, label: 'Confirmed', className: 'border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10' },
    needs_update: { icon: AlertTriangle, label: 'Needs update', className: 'border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10' },
  };

  const badge = statusBadgeConfig[status] || statusBadgeConfig.not_sent;
  const BadgeIcon = badge.icon;

  return (
    <Sheet open={open} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg">{facility?.name || 'Practice'}</SheetTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-xs ${badge.className}`}>
              <BadgeIcon className="h-3 w-3 mr-1" /> {badge.label}
            </Badge>
            <span className="text-sm text-muted-foreground">{monthLabel}</span>
            {queueItem?.autoSendEnabled && <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-600 bg-green-500/10">Auto-send</Badge>}
          </div>
        </SheetHeader>

        <Tabs defaultValue="monthly" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="monthly" className="flex-1">Monthly</TabsTrigger>
            <TabsTrigger value="preshift" className="flex-1">Pre-shift</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
          </TabsList>

          {/* Monthly Tab */}
          <TabsContent value="monthly" className="space-y-4 mt-4">
            {/* Contact */}
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              {facilitySettings?.primary_contact_email ? (
                <span>{facilitySettings.primary_contact_name} · {facilitySettings.primary_contact_email}</span>
              ) : queueItem?.contact ? (
                <span>{queueItem.contact.name} · {queueItem.contact.email}</span>
              ) : (
                <span className="text-orange-600 dark:text-orange-400">⚠ No scheduling contact — add one in facility settings.</span>
              )}
            </div>

            {status === 'needs_update' && (
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-sm text-orange-700 dark:text-orange-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Schedule changed after confirmation was sent. Review and resend.</span>
              </div>
            )}

            {/* Shift summary */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{bookedShifts.length} booked shift{bookedShifts.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Shifts table */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Day</TableHead>
                    <TableHead className="text-xs">Shift Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookedShifts.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm py-2">{format(new Date(s.start_datetime), 'MMM d')}</TableCell>
                      <TableCell className="text-sm py-2">{format(new Date(s.start_datetime), 'EEE')}</TableCell>
                      <TableCell className="text-sm py-2">
                        {format(new Date(s.start_datetime), 'h:mm a')} – {format(new Date(s.end_datetime), 'h:mm a')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {bookedShifts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-4">No booked shifts</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <Separator />

            {/* Message preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Monthly Confirmation Preview</h3>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCopy}>
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Subject: {messageSubject}</p>
              <Textarea
                value={messageBody}
                onChange={e => setMessageBody(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {(status === 'not_sent' || status === 'needs_update') && (
                <Button className="flex-1" onClick={handleSendMonthly}>
                  <Send className="h-4 w-4 mr-2" />
                  {status === 'needs_update' ? 'Resend Confirmation' : 'Send Confirmation'}
                </Button>
              )}
              {status === 'sent' && (
                <>
                  <Button variant="outline" className="flex-1" onClick={handleSendMonthly}>
                    <Send className="h-4 w-4 mr-2" /> Resend
                  </Button>
                  <Button className="flex-1" onClick={handleMarkConfirmed}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Mark Confirmed
                  </Button>
                </>
              )}
              {status === 'confirmed' && (
                <Button variant="outline" className="flex-1" onClick={handleSendMonthly}>
                  <Send className="h-4 w-4 mr-2" /> Resend
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Pre-shift Tab */}
          <TabsContent value="preshift" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Send individual shift reminders to the clinic contact.</p>
            {upcomingShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No upcoming shifts this month.</p>
            ) : (
              <div className="space-y-2">
                {upcomingShifts.map(s => {
                  const alreadySent = history.some(h => h.type === 'preshift' && h.shift_id === s.id && h.status === 'sent');
                  return (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div>
                        <p className="text-sm font-medium">{format(new Date(s.start_datetime), 'EEE, MMM d')}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(s.start_datetime), 'h:mm a')} – {format(new Date(s.end_datetime), 'h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {alreadySent && <Badge variant="outline" className="text-xs border-green-500/30 text-green-600 bg-green-500/10">Sent</Badge>}
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleSendPreshift(s.id)}>
                          <Send className="h-3 w-3 mr-1" /> {alreadySent ? 'Resend' : 'Send Reminder'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 mt-4">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No confirmation history.</p>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 20).map(e => {
                  const sb = statusBadgeConfig[e.status] || statusBadgeConfig.sent;
                  const SbIcon = sb.icon;
                  return (
                    <div key={e.id} className="p-3 rounded-lg border bg-card space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] h-5">{e.type}</Badge>
                          <Badge variant="outline" className={`text-xs ${sb.className}`}>
                            <SbIcon className="h-3 w-3 mr-1" /> {sb.label}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {e.sent_at ? format(new Date(e.sent_at), 'MMM d, h:mm a') : e.created_at ? format(new Date(e.created_at), 'MMM d') : '—'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">To: {e.recipient_email}</p>
                      <p className="text-xs truncate">{e.subject}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
