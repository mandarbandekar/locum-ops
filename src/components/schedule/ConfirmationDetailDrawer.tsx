import { useState, useEffect, useMemo } from 'react';
import { useConfirmations } from '@/hooks/useConfirmations';
import { useData } from '@/contexts/DataContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Send, CheckCircle, AlertTriangle, Clock, Copy, Download, Link2, LinkIcon,
  X, User, CalendarDays,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Props {
  facilityId: string;
  monthKey: string;
  open: boolean;
  onClose: () => void;
}

export function ConfirmationDetailDrawer({ facilityId, monthKey, open, onClose }: Props) {
  const { facilities, contacts } = useData();
  const { profile } = useUserProfile();
  const {
    records, getBookedShifts, getOrCreateRecord, markSent, markConfirmed,
    createShareToken, revokeShareToken, getActivities,
  } = useConfirmations();

  const facility = facilities.find(f => f.id === facilityId);
  const contact = contacts.find(c => c.facility_id === facilityId && c.is_primary);
  const bookedShifts = getBookedShifts(facilityId, monthKey);
  const record = records.find(r => r.facility_id === facilityId && r.month_key === monthKey);
  const activities = record ? getActivities(record.id) : [];

  const [year, month] = monthKey.split('-').map(Number);
  const monthLabel = format(new Date(year, month - 1), 'MMMM yyyy');

  // Generate default message body
  const clinicianName = profile ? `${profile.first_name} ${profile.last_name}` : 'Your Locum Clinician';
  const defaultBody = useMemo(() => {
    const shiftList = bookedShifts
      .map(s => `  - ${format(new Date(s.start_datetime), 'EEE, MMM d')} — ${format(new Date(s.start_datetime), 'h:mm a')} – ${format(new Date(s.end_datetime), 'h:mm a')}`)
      .join('\n');

    return `Hi ${contact?.name || 'Team'},

Confirming my currently booked relief coverage dates for ${facility?.name || 'your practice'} in ${format(new Date(year, month - 1), 'MMMM')}:

${shiftList}

Please review and let me know if anything looks incorrect.

Thank you,
${clinicianName}`;
  }, [bookedShifts, contact, facility, clinicianName, monthKey]);

  const [messageBody, setMessageBody] = useState(defaultBody);
  useEffect(() => { setMessageBody(defaultBody); }, [defaultBody]);

  const subject = `Confirmed Relief Dates for ${monthLabel}`;

  const handleMarkSent = async () => {
    let rec = record;
    if (!rec) {
      rec = await getOrCreateRecord(facilityId, monthKey);
    }
    await markSent(rec.id, messageBody);
  };

  const handleMarkConfirmed = async () => {
    if (!record) return;
    await markConfirmed(record.id);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${messageBody}`);
    toast.success('Copied to clipboard');
  };

  const handleCreateShareLink = async () => {
    let rec = record;
    if (!rec) {
      rec = await getOrCreateRecord(facilityId, monthKey);
    }
    const token = await createShareToken(rec.id);
    const url = `${window.location.origin}/confirmations/public/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Share link created and copied');
  };

  const handleRevokeShareLink = async () => {
    if (!record) return;
    await revokeShareToken(record.id);
  };

  const statusConfig: Record<string, { icon: typeof CheckCircle; label: string; className: string }> = {
    not_sent: { icon: Clock, label: 'Not sent', className: 'border-muted-foreground/30 text-muted-foreground bg-muted/50' },
    sent: { icon: Send, label: 'Sent', className: 'border-primary/30 text-primary bg-primary/10' },
    confirmed: { icon: CheckCircle, label: 'Confirmed', className: 'border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10' },
    needs_update: { icon: AlertTriangle, label: 'Needs update', className: 'border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10' },
  };

  const status = record?.status || 'not_sent';
  const badge = statusConfig[status] || statusConfig.not_sent;
  const BadgeIcon = badge.icon;

  const hasShareToken = record?.share_token && !record?.share_token_revoked_at;
  const shareUrl = hasShareToken ? `${window.location.origin}/confirmations/public/${record.share_token}` : null;

  // Shift summary
  const firstShift = bookedShifts[0];
  const lastShift = bookedShifts[bookedShifts.length - 1];

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
          </div>
        </SheetHeader>

        <div className="space-y-5 pb-6">
          {/* Contact info */}
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            {contact ? (
              <span>{contact.name} · {contact.email}</span>
            ) : (
              <span className="text-orange-600 dark:text-orange-400">⚠ Practice manager contact missing — add one before sending.</span>
            )}
          </div>

          {/* Needs update warning */}
          {status === 'needs_update' && (
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-sm text-orange-700 dark:text-orange-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Schedule changed after confirmation was sent. Review and resend.</span>
            </div>
          )}

          {/* Shift summary */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{bookedShifts.length} booked shift{bookedShifts.length !== 1 ? 's' : ''}</span>
            {firstShift && <span>First: {format(new Date(firstShift.start_datetime), 'MMM d')}</span>}
            {lastShift && <span>Last: {format(new Date(lastShift.start_datetime), 'MMM d')}</span>}
          </div>

          {/* Shifts table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Day</TableHead>
                  <TableHead className="text-xs">Shift Time</TableHead>
                  <TableHead className="text-xs">Notes</TableHead>
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
                    <TableCell className="text-sm py-2 text-muted-foreground">{s.notes || '—'}</TableCell>
                  </TableRow>
                ))}
                {bookedShifts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">No booked shifts</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Separator />

          {/* Message preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Confirmation Preview</h3>
              <p className="text-xs text-muted-foreground">Subject: {subject}</p>
            </div>
            <Textarea
              value={messageBody}
              onChange={e => setMessageBody(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Message
              </Button>
              <Button variant="outline" size="sm" onClick={handleCreateShareLink}>
                <Link2 className="h-3.5 w-3.5 mr-1.5" /> Create Share Link
              </Button>
            </div>

            {hasShareToken && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted text-xs">
                <LinkIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{shareUrl}</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => { navigator.clipboard.writeText(shareUrl!); toast.success('Copied'); }}>
                  Copy
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-destructive" onClick={handleRevokeShareLink}>
                  Revoke
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">Use a share link when emailing or texting managers.</p>

            <Separator />

            <div className="flex gap-2">
              {(status === 'not_sent' || status === 'needs_update') && (
                <Button className="flex-1" onClick={handleMarkSent}>
                  <Send className="h-4 w-4 mr-2" />
                  {status === 'needs_update' ? 'Resend Confirmation' : 'Mark as Sent'}
                </Button>
              )}
              {status === 'sent' && (
                <>
                  <Button variant="outline" className="flex-1" onClick={handleMarkSent}>
                    <Send className="h-4 w-4 mr-2" /> Resend Confirmation
                  </Button>
                  <Button className="flex-1" onClick={handleMarkConfirmed}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Mark as Confirmed
                  </Button>
                </>
              )}
              {status === 'confirmed' && (
                <Button variant="outline" className="flex-1" onClick={handleMarkSent}>
                  <Send className="h-4 w-4 mr-2" /> Resend Confirmation
                </Button>
              )}
            </div>
          </div>

          {/* Timeline */}
          {activities.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Timeline</h3>
                <div className="space-y-2">
                  {activities.map(a => (
                    <div key={a.id} className="flex items-start gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <span className="font-medium capitalize">{a.action.replace('_', ' ')}</span>
                        {a.description && <span className="text-muted-foreground"> — {a.description}</span>}
                        <p className="text-muted-foreground">{format(new Date(a.created_at), 'MMM d, yyyy · h:mm a')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
