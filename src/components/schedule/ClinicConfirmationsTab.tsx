import { useState, useMemo, useCallback, useRef } from 'react';
import { useClinicConfirmations } from '@/hooks/useClinicConfirmations';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Send, Clock,
  CalendarDays, Copy, User, UserPlus, History, Building,
} from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { FacilityConfirmationSettingsCard } from './FacilityConfirmationSettingsCard';
import { toast } from 'sonner';

const statusConfig: Record<string, { dot: string; label: string; className: string }> = {
  confirmed: { dot: 'bg-green-500', label: 'Confirmed', className: 'border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10' },
  sent: { dot: 'bg-primary', label: 'Sent', className: 'border-primary/30 text-primary bg-primary/10' },
  needs_update: { dot: 'bg-orange-500', label: 'Needs Update', className: 'border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10' },
  not_sent: { dot: 'bg-muted-foreground', label: 'Not Sent', className: 'border-muted-foreground/30 text-muted-foreground bg-muted/50' },
  scheduled: { dot: 'bg-blue-500', label: 'Scheduled', className: 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10' },
  failed: { dot: 'bg-destructive', label: 'Failed', className: 'border-destructive/30 text-destructive bg-destructive/10' },
};

export function ClinicConfirmationsTab() {
  const [currentMonth, setCurrentMonth] = useState(() => addMonths(new Date(), 1));
  const [settingsDialogFacilityId, setSettingsDialogFacilityId] = useState<string | null>(null);
  const [editingMessages, setEditingMessages] = useState<Record<string, { subject: string; body: string }>>({});
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});
  const [sendingAll, setSendingAll] = useState(false);
  const settingsSaveRef = useRef<(() => void) | null>(null);

  const monthKey = format(currentMonth, 'yyyy-MM');
  const { getMonthQueue, getStatusCounts, loading, saveSettings, getSettings, sendConfirmationEmail, markConfirmed, generateMonthlyBody, getHistory } = useClinicConfirmations();
  const { facilities } = useData();
  const counts = getStatusCounts(monthKey);
  const queue = getMonthQueue(monthKey);

  // Get or initialize editable message for a facility
  const getEditableMessage = useCallback((facilityId: string) => {
    if (editingMessages[facilityId]) return editingMessages[facilityId];
    const gen = generateMonthlyBody(facilityId, monthKey);
    return gen;
  }, [editingMessages, generateMonthlyBody, monthKey]);

  const updateMessage = (facilityId: string, field: 'subject' | 'body', value: string) => {
    setEditingMessages(prev => {
      const current = prev[facilityId] || generateMonthlyBody(facilityId, monthKey);
      return { ...prev, [facilityId]: { ...current, [field]: value } };
    });
  };

  const handleSend = async (facilityId: string) => {
    const msg = getEditableMessage(facilityId);
    await sendConfirmationEmail(facilityId, 'monthly', monthKey, null, msg.body, msg.subject);
  };

  const handleSendAll = async () => {
    const unsent = queue.filter(q => q.status === 'not_sent' && q.contactEmail);
    if (unsent.length === 0) return;
    setSendingAll(true);
    for (const item of unsent) {
      const msg = getEditableMessage(item.facilityId);
      await sendConfirmationEmail(item.facilityId, 'monthly', monthKey, null, msg.body, msg.subject);
    }
    setSendingAll(false);
    toast.success(`Sent ${unsent.length} confirmation${unsent.length > 1 ? 's' : ''}`);
  };

  const handleCopy = (facilityId: string) => {
    const msg = getEditableMessage(facilityId);
    navigator.clipboard.writeText(`Subject: ${msg.subject}\n\n${msg.body}`);
    toast.success('Copied to clipboard');
  };

  const unsentWithContact = queue.filter(q => q.status === 'not_sent' && q.contactEmail);
  const summaryParts: string[] = [];
  if (counts.total > 0) summaryParts.push(`${counts.total} clinic${counts.total !== 1 ? 's' : ''}`);
  if (unsentWithContact.length > 0) summaryParts.push(`${unsentWithContact.length} ready to send`);
  if (counts.confirmed > 0) summaryParts.push(`${counts.confirmed} confirmed`);
  if (counts.needs_update > 0) summaryParts.push(`${counts.needs_update} need${counts.needs_update !== 1 ? '' : 's'} update`);

  const getActionButton = (item: typeof queue[0]) => {
    if (!item.contactEmail) {
      return (
        <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={(e) => { e.stopPropagation(); setSettingsDialogFacilityId(item.facilityId); }}>
          <UserPlus className="h-3 w-3 mr-1" /> Add Contact
        </Button>
      );
    }
    if (item.status === 'not_sent' || item.status === 'needs_update') {
      return (
        <Button size="sm" className="h-8 text-xs shrink-0" onClick={(e) => { e.stopPropagation(); handleSend(item.facilityId); }}>
          <Send className="h-3 w-3 mr-1" /> {item.status === 'needs_update' ? 'Resend' : 'Send'}
        </Button>
      );
    }
    if (item.status === 'sent') {
      return (
        <Button size="sm" variant="outline" className="h-8 text-xs shrink-0 border-green-500/30 text-green-600 hover:bg-green-500/10" onClick={(e) => { e.stopPropagation(); item.latestEmail && markConfirmed(item.latestEmail.id); }}>
          <CheckCircle className="h-3 w-3 mr-1" /> Mark Confirmed
        </Button>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Clinic Confirmations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Confirm your upcoming schedule with each clinic before the month starts.
        </p>
      </div>

      {/* Month nav + summary + bulk send */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[120px] text-center">{format(currentMonth, 'MMMM yyyy')}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {summaryParts.length > 0 && (
          <p className="text-sm text-muted-foreground">{summaryParts.join(' · ')}</p>
        )}

        {unsentWithContact.length > 0 && (
          <Button size="sm" className="ml-auto h-8 text-xs" onClick={handleSendAll} disabled={sendingAll}>
            <Send className="h-3 w-3 mr-1" /> Send All Unsent ({unsentWithContact.length})
          </Button>
        )}
      </div>

      {/* Main checklist */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
      ) : queue.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-center py-12 space-y-2">
            <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <h3 className="font-semibold text-foreground">No booked shifts to confirm</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Once you book shifts for a practice in {format(currentMonth, 'MMMM yyyy')}, they'll appear here for confirmation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {queue.map((item) => {
            const sc = statusConfig[item.status] || statusConfig.not_sent;
            const msg = getEditableMessage(item.facilityId);
            const history = getHistory(item.facilityId);
            const isHistoryOpen = showHistory[item.facilityId] || false;

            return (
              <AccordionItem key={item.facilityId} value={item.facilityId} className="border rounded-xl px-4 bg-card">
                <AccordionTrigger className="py-3 hover:no-underline gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${sc.dot}`} />
                    <span className="font-semibold text-sm truncate">{item.facilityName}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{item.shiftCount} shift{item.shiftCount !== 1 ? 's' : ''}</span>
                    {item.contactEmail ? (
                      <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                        <User className="h-3 w-3 inline mr-0.5" />
                        {item.facilitySettings?.primary_contact_name || item.contactEmail}
                      </span>
                    ) : (
                      <span className="text-xs text-orange-500 hidden sm:inline">No contact</span>
                    )}
                    <Badge variant="outline" className={`text-[10px] h-5 px-1.5 shrink-0 ml-auto mr-2 ${sc.className}`}>
                      {sc.label}
                    </Badge>
                  </div>
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    {getActionButton(item)}
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pb-4 space-y-4">
                  {/* Compact shift table */}
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Date</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.shifts.map(s => (
                          <tr key={s.id} className="border-t">
                            <td className="px-3 py-2 text-sm">{format(new Date(s.start_datetime), 'EEE, MMM d')}</td>
                            <td className="px-3 py-2 text-sm text-muted-foreground">
                              {format(new Date(s.start_datetime), 'h:mm a')} – {format(new Date(s.end_datetime), 'h:mm a')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {item.status === 'needs_update' && (
                    <div className="flex items-start gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-500/10 rounded-lg p-3">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>Schedule changed after your last confirmation was sent. Review and resend.</span>
                    </div>
                  )}

                  {/* Editable message */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Subject</label>
                    <Input
                      value={msg.subject}
                      onChange={(e) => updateMessage(item.facilityId, 'subject', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Message</label>
                    <Textarea
                      value={msg.body}
                      onChange={(e) => updateMessage(item.facilityId, 'body', e.target.value)}
                      rows={6}
                      className="text-sm"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleCopy(item.facilityId)}>
                      <Copy className="h-3 w-3 mr-1" /> Copy to Clipboard
                    </Button>
                    {item.contactEmail && (item.status === 'not_sent' || item.status === 'needs_update') && (
                      <Button size="sm" className="h-8 text-xs" onClick={() => handleSend(item.facilityId)}>
                        <Send className="h-3 w-3 mr-1" /> Send Confirmation
                      </Button>
                    )}
                    {item.contactEmail && item.status === 'sent' && item.latestEmail && (
                      <Button size="sm" variant="outline" className="h-8 text-xs border-green-500/30 text-green-600 hover:bg-green-500/10" onClick={() => markConfirmed(item.latestEmail!.id)}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Mark Confirmed
                      </Button>
                    )}
                    {!item.contactEmail && (
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setSettingsDialogFacilityId(item.facilityId)}>
                        <UserPlus className="h-3 w-3 mr-1" /> Add Contact
                      </Button>
                    )}
                  </div>

                  {/* Last sent + History toggle */}
                  {item.latestEmail?.sent_at && (
                    <p className="text-xs text-muted-foreground">
                      Last sent {format(new Date(item.latestEmail.sent_at), 'MMM d, yyyy · h:mm a')}
                    </p>
                  )}

                  {history.length > 0 && (
                    <div>
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                        onClick={() => setShowHistory(prev => ({ ...prev, [item.facilityId]: !prev[item.facilityId] }))}
                      >
                        <History className="h-3 w-3" /> {isHistoryOpen ? 'Hide history' : `View history (${history.length})`}
                      </button>
                      {isHistoryOpen && (
                        <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-muted">
                          {history.slice(0, 10).map(h => {
                            const hsc = statusConfig[h.status] || statusConfig.sent;
                            return (
                              <div key={h.id} className="flex items-center gap-2 text-xs">
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${hsc.dot}`} />
                                <span className="text-muted-foreground">{h.sent_at ? format(new Date(h.sent_at), 'MMM d, h:mm a') : 'Not sent'}</span>
                                <Badge variant="outline" className={`text-[9px] h-4 px-1 ${hsc.className}`}>{hsc.label}</Badge>
                                <span className="text-muted-foreground truncate">{h.type}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Settings Dialog — reused for adding contacts */}
      <Dialog key={settingsDialogFacilityId || 'none'} open={!!settingsDialogFacilityId} onOpenChange={(open) => { if (!open) setSettingsDialogFacilityId(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Scheduling Contact</DialogTitle>
            <DialogDescription>
              Add a contact for {facilities.find(f => f.id === settingsDialogFacilityId)?.name || 'this facility'} so confirmations can be sent.
            </DialogDescription>
          </DialogHeader>
          {settingsDialogFacilityId && (
            <FacilityConfirmationSettingsCard
              facilityId={settingsDialogFacilityId}
              settings={getSettings(settingsDialogFacilityId)}
              initialEditing
              embedded
              onSaveRef={settingsSaveRef}
              onSave={(s) => {
                saveSettings(s);
                setSettingsDialogFacilityId(null);
              }}
            />
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSettingsDialogFacilityId(null)}>Cancel</Button>
            <Button onClick={() => settingsSaveRef.current?.()}>Save Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
