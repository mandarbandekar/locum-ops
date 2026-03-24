import { useState, useMemo, useCallback, useRef } from 'react';
import { useClinicConfirmations } from '@/hooks/useClinicConfirmations';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Send, Clock,
  Eye, User, CalendarDays, Mail, History, Timer, XCircle, Building, UserPlus,
} from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ClinicConfirmationDrawer } from './ClinicConfirmationDrawer';
import { FacilityConfirmationSettingsCard } from './FacilityConfirmationSettingsCard';
import { FacilityConfirmationSettings } from '@/types/clinicConfirmations';
const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'not_sent', label: 'Not sent' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'sent', label: 'Sent' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'needs_update', label: 'Needs update' },
  { value: 'failed', label: 'Failed' },
];

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'preshift', label: 'Pre-shift' },
];

export function ClinicConfirmationsTab() {
  const [currentMonth, setCurrentMonth] = useState(() => addMonths(new Date(), 1));
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [facilityFilter, setFacilityFilter] = useState('all');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [settingsDialogFacilityId, setSettingsDialogFacilityId] = useState<string | null>(null);
  const settingsSaveRef = useRef<(() => void) | null>(null);

  const monthKey = format(currentMonth, 'yyyy-MM');
  const { getMonthQueue, getStatusCounts, emails, loading, saveSettings, getSettings } = useClinicConfirmations();
  const { facilities } = useData();
  const counts = getStatusCounts(monthKey);
  const queue = getMonthQueue(monthKey);

  const filteredQueue = useMemo(() => {
    let q = queue;
    if (statusFilter !== 'all') q = q.filter(item => item.status === statusFilter);
    if (facilityFilter !== 'all') q = q.filter(item => item.facilityId === facilityFilter);
    return q;
  }, [queue, statusFilter, facilityFilter]);

  // Categorize into sections
  const sections = useMemo(() => {
    const autoScheduled = filteredQueue.filter(q => (q.autoSendMonthly || q.autoSendPreshift) && (q.status === 'not_sent' || q.status === 'scheduled'));
    const needsUpdate = filteredQueue.filter(q => q.status === 'needs_update');
    const recentlySent = filteredQueue.filter(q => q.status === 'sent' || q.status === 'confirmed');
    const manualReview = filteredQueue.filter(q => !(q.autoSendMonthly || q.autoSendPreshift) && (q.status === 'not_sent' || q.status === 'scheduled'));
    return { autoScheduled, needsUpdate, recentlySent, manualReview };
  }, [filteredQueue]);

  // History: all emails for the current month
  const monthEmails = useMemo(() => {
    return emails.filter(e => e.month_key === monthKey || (e.type === 'preshift'));
  }, [emails, monthKey]);

  const statusBadgeConfig: Record<string, { icon: typeof CheckCircle; label: string; className: string }> = {
    not_sent: { icon: Clock, label: 'Not sent', className: 'border-muted-foreground/30 text-muted-foreground bg-muted/50' },
    scheduled: { icon: Timer, label: 'Scheduled', className: 'border-info/30 text-info bg-info/10' },
    sent: { icon: Send, label: 'Sent', className: 'border-primary/30 text-primary bg-primary/10' },
    confirmed: { icon: CheckCircle, label: 'Confirmed', className: 'border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10' },
    needs_update: { icon: AlertTriangle, label: 'Needs update', className: 'border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10' },
    failed: { icon: XCircle, label: 'Failed', className: 'border-destructive/30 text-destructive bg-destructive/10' },
  };

  const renderQueueCard = (item: typeof queue[0]) => {
    const badge = statusBadgeConfig[item.status] || statusBadgeConfig.not_sent;
    const BadgeIcon = badge.icon;
    return (
      <Card
        key={item.facilityId}
        className="hover:bg-muted/30 transition-colors cursor-pointer group"
        onClick={() => setSelectedFacilityId(item.facilityId)}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-semibold truncate">{item.facilityName}</CardTitle>
            <Badge variant="outline" className={`text-xs shrink-0 ${badge.className}`}>
              <BadgeIcon className="h-3 w-3 mr-1" /> {badge.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          {/* Contact */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {item.contactEmail ? (
              <span>{item.facilitySettings?.primary_contact_name || item.contact?.name || item.contactEmail}</span>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSettingsDialogFacilityId(item.facilityId); }}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
              >
                <UserPlus className="h-3 w-3" /> Add Scheduling Contact
              </button>
            )}
          </div>

          {/* Shift count */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            <span>{item.shiftCount} booked shift{item.shiftCount !== 1 ? 's' : ''}</span>
          </div>

          {/* Mode badges */}
          <div className="flex gap-1 flex-wrap">
            {item.monthlyEnabled && <Badge variant="outline" className="text-[10px] h-5 px-1.5">Monthly</Badge>}
            {item.preshiftEnabled && <Badge variant="outline" className="text-[10px] h-5 px-1.5">Pre-shift</Badge>}
            {item.autoSendMonthly && <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-green-500/30 text-green-600 bg-green-500/10">Auto monthly</Badge>}
            {item.autoSendPreshift && <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-green-500/30 text-green-600 bg-green-500/10">Auto pre-shift</Badge>}
            {!item.autoSendMonthly && !item.autoSendPreshift && item.monthlyEnabled && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-muted-foreground/30 text-muted-foreground">Manual review</Badge>
            )}
          </div>

          {/* Last sent */}
          {item.latestEmail?.sent_at && (
            <p className="text-xs text-muted-foreground">
              Last sent {format(new Date(item.latestEmail.sent_at), 'MMM d, h:mm a')}
            </p>
          )}

          {item.status === 'needs_update' && (
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
              Schedule changed after confirmation was sent.
            </p>
          )}

          <Button size="sm" variant="outline" className="w-full h-8 text-xs mt-1">
            <Eye className="h-3 w-3 mr-1" /> Review confirmation
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderSection = (title: string, icon: typeof Send, items: typeof queue, emptyText: string) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {(() => { const Icon = icon; return <Icon className="h-4 w-4 text-muted-foreground" />; })()}
          <h3 className="text-sm font-semibold">{title}</h3>
          <Badge variant="outline" className="text-xs">{items.length}</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(renderQueueCard)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Clinic Confirmations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review, send, and automate shift confirmations so clinic contacts stay aware of your upcoming coverage.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        {/* Month selector */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[100px] text-center">{format(currentMonth, 'MMMM yyyy')}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={facilityFilter} onValueChange={setFacilityFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All facilities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All facilities</SelectItem>
            {facilities.filter(f => f.status === 'active').map(f => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Summary counts */}
        <div className="flex gap-2 flex-wrap ml-auto">
          {counts.needs_update > 0 && (
            <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-600 dark:text-orange-400 cursor-pointer" onClick={() => setStatusFilter('needs_update')}>
              {counts.needs_update} Needs update
            </Badge>
          )}
          {counts.not_sent > 0 && (
            <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground cursor-pointer" onClick={() => setStatusFilter('not_sent')}>
              {counts.not_sent} Not sent
            </Badge>
          )}
          {counts.sent > 0 && (
            <Badge variant="outline" className="text-xs border-primary/30 text-primary cursor-pointer" onClick={() => setStatusFilter('sent')}>
              {counts.sent} Sent
            </Badge>
          )}
          {counts.confirmed > 0 && (
            <Badge variant="outline" className="text-xs border-green-500/30 text-green-600 dark:text-green-400 cursor-pointer" onClick={() => setStatusFilter('confirmed')}>
              {counts.confirmed} Confirmed
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview"><Building className="h-3.5 w-3.5 mr-1.5" /> Overview</TabsTrigger>
          <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1.5" /> History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
          ) : filteredQueue.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <h3 className="font-semibold text-foreground">
                {counts.total === 0 ? 'No booked shifts to confirm.' : 'All confirmations are up to date.'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {counts.total === 0
                  ? "Once you book shifts for a practice, they'll appear here for confirmation."
                  : 'No practices need confirmation right now.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {renderSection('Needs Update', AlertTriangle, sections.needsUpdate, '')}
              {renderSection('Scheduled for Auto-send', Timer, sections.autoScheduled, '')}
              {renderSection('Queued for Manual Review', Mail, sections.manualReview, '')}
              {renderSection('Recently Sent', Send, sections.recentlySent, '')}

              {/* If sections are all empty but filteredQueue has items, show generic */}
              {sections.needsUpdate.length === 0 && sections.autoScheduled.length === 0 &&
               sections.manualReview.length === 0 && sections.recentlySent.length === 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredQueue.map(renderQueueCard)}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {monthEmails.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <History className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <h3 className="font-semibold text-foreground">No confirmation history yet.</h3>
              <p className="text-sm text-muted-foreground">Sent confirmations will appear here.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Facility</TableHead>
                    <TableHead className="text-xs">Recipient</TableHead>
                    <TableHead className="text-xs">Subject</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthEmails.slice(0, 50).map(e => {
                    const facility = facilities.find(f => f.id === e.facility_id);
                    const badge = statusBadgeConfig[e.status] || statusBadgeConfig.sent;
                    const BadgeIcon = badge.icon;
                    return (
                      <TableRow key={e.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedFacilityId(e.facility_id)}>
                        <TableCell className="text-sm py-2">
                          <Badge variant="outline" className="text-[10px] h-5">{e.type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm py-2 font-medium">{facility?.name || 'Unknown'}</TableCell>
                        <TableCell className="text-sm py-2 text-muted-foreground">{e.recipient_email}</TableCell>
                        <TableCell className="text-sm py-2 truncate max-w-[200px]">{e.subject}</TableCell>
                        <TableCell className="text-sm py-2">
                          <Badge variant="outline" className={`text-xs ${badge.className}`}>
                            <BadgeIcon className="h-3 w-3 mr-1" /> {badge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm py-2 text-muted-foreground">
                          {e.sent_at ? format(new Date(e.sent_at), 'MMM d, h:mm a') : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      <Dialog key={settingsDialogFacilityId || 'none'} open={!!settingsDialogFacilityId} onOpenChange={(open) => { if (!open) setSettingsDialogFacilityId(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Scheduling / Confirmation Settings</DialogTitle>
            <DialogDescription>
              Configure scheduling contact and confirmation preferences for {facilities.find(f => f.id === settingsDialogFacilityId)?.name || 'this facility'}.
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
            <Button onClick={() => settingsSaveRef.current?.()}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Drawer */}
      {selectedFacilityId && (
        <ClinicConfirmationDrawer
          facilityId={selectedFacilityId}
          monthKey={monthKey}
          open={!!selectedFacilityId}
          onClose={() => setSelectedFacilityId(null)}
        />
      )}
    </div>
  );
}
