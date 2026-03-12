import { useState, useMemo } from 'react';
import { useConfirmations } from '@/hooks/useConfirmations';
import { useData } from '@/contexts/DataContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Send, Clock, Eye, User, CalendarDays } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ConfirmationDetailDrawer } from './ConfirmationDetailDrawer';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'not_sent', label: 'Not sent' },
  { value: 'sent', label: 'Sent' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'needs_update', label: 'Needs update' },
];

export function ConfirmationsTab() {
  // Default to next month
  const [currentMonth, setCurrentMonth] = useState(() => addMonths(new Date(), 1));
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);

  const monthKey = format(currentMonth, 'yyyy-MM');
  const { getMonthQueue, getStatusCounts, loading } = useConfirmations();
  const counts = getStatusCounts(monthKey);
  const queue = getMonthQueue(monthKey);
  const filteredQueue = statusFilter === 'all' ? queue : queue.filter(q => q.status === statusFilter);

  const statusBadgeConfig: Record<string, { icon: typeof CheckCircle; label: string; className: string }> = {
    not_sent: { icon: Clock, label: 'Not sent', className: 'border-muted-foreground/30 text-muted-foreground bg-muted/50' },
    sent: { icon: Send, label: 'Sent', className: 'border-primary/30 text-primary bg-primary/10' },
    confirmed: { icon: CheckCircle, label: 'Confirmed', className: 'border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10' },
    needs_update: { icon: AlertTriangle, label: 'Needs update', className: 'border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Confirmations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review and share your booked shifts by practice so managers can confirm dates and avoid scheduling conflicts.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
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

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Summary counts */}
        <div className="flex gap-2 flex-wrap ml-auto">
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
          {counts.needs_update > 0 && (
            <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-600 dark:text-orange-400 cursor-pointer" onClick={() => setStatusFilter('needs_update')}>
              {counts.needs_update} Needs update
            </Badge>
          )}
          {counts.confirmed > 0 && (
            <Badge variant="outline" className="text-xs border-green-500/30 text-green-600 dark:text-green-400 cursor-pointer" onClick={() => setStatusFilter('confirmed')}>
              {counts.confirmed} Confirmed
            </Badge>
          )}
        </div>
      </div>

      {/* Queue */}
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredQueue.map(item => {
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
                    {item.contact ? (
                      <span>{item.contact.name}</span>
                    ) : (
                      <span className="text-orange-600 dark:text-orange-400">⚠ No primary contact</span>
                    )}
                  </div>

                  {/* Shift count */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    <span>{item.shiftCount} booked shift{item.shiftCount !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Last sent info */}
                  {item.record?.sent_at && (
                    <p className="text-xs text-muted-foreground">
                      Last sent {format(new Date(item.record.sent_at), 'MMM d, h:mm a')}
                    </p>
                  )}

                  {/* Needs update warning */}
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
          })}
        </div>
      )}

      {/* Detail Drawer */}
      {selectedFacilityId && (
        <ConfirmationDetailDrawer
          facilityId={selectedFacilityId}
          monthKey={monthKey}
          open={!!selectedFacilityId}
          onClose={() => setSelectedFacilityId(null)}
        />
      )}
    </div>
  );
}
