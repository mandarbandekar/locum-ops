import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, X, CalendarOff, ChevronDown } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useShiftPaymentConfirmations } from '@/hooks/useShiftPaymentConfirmations';
import {
  isShiftAwaitingConfirmation,
  defaultExpectedAmount,
  type ShiftPaymentConfirmation,
} from '@/lib/paymentConfirmations';
import { getEffectiveEngagement } from '@/lib/engagementOptions';
import type { Shift } from '@/types';

interface PaymentConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AwaitingRow {
  shift: Shift;
  facilityName: string;
  sourceLabel: string;
  expected: number;
}

export function PaymentConfirmationDialog({ open, onOpenChange }: PaymentConfirmationDialogProps) {
  const { shifts, facilities } = useData();
  const { confirmations, markPaid, snooze, markWontPay } = useShiftPaymentConfirmations();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo<AwaitingRow[]>(() => {
    const facById = new Map(facilities.map((f) => [f.id, f]));
    const confById = new Map<string, ShiftPaymentConfirmation>(
      confirmations.map((c) => [c.shift_id, c]),
    );
    const now = new Date();
    return shifts
      .filter((s) => isShiftAwaitingConfirmation(s, facById.get(s.facility_id), confById.get(s.id), now))
      .map((s) => {
        const f = facById.get(s.facility_id);
        const eff = f
          ? getEffectiveEngagement(s, f)
          : { engagement_type: 'direct' as const, source_name: null };
        const sourceLabel =
          eff.engagement_type === 'direct'
            ? f?.name ?? 'Direct'
            : (eff.source_name?.trim() || 'Platform');
        return {
          shift: s,
          facilityName: f?.name ?? 'Unknown',
          sourceLabel,
          expected: defaultExpectedAmount(s),
        };
      })
      .sort((a, b) => a.shift.start_datetime.localeCompare(b.shift.start_datetime));
  }, [shifts, facilities, confirmations]);

  const total = rows.reduce((s, r) => s + r.expected, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Confirm payment</DialogTitle>
          <DialogDescription>
            These shifts ended more than two days ago at clinics or platforms that don't generate an invoice.
            Tell us whether the payment landed so we can track it as revenue.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Nothing to confirm right now.
            </p>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-3">
                {rows.length} shift{rows.length === 1 ? '' : 's'} · expected{' '}
                <span className="font-medium text-foreground">${total.toLocaleString()}</span>
              </div>
              <div className="space-y-2">
                {rows.map((row) => (
                  <RowItem
                    key={row.shift.id}
                    row={row}
                    expanded={expandedId === row.shift.id}
                    onExpand={() =>
                      setExpandedId((id) => (id === row.shift.id ? null : row.shift.id))
                    }
                    onSavePaid={async (amount, paid_on, note) => {
                      await markPaid(row.shift.id, amount, paid_on, note);
                      setExpandedId(null);
                    }}
                    onSnooze={() => snooze(row.shift.id, 7)}
                    onWontPay={() => markWontPay(row.shift.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RowItemProps {
  row: AwaitingRow;
  expanded: boolean;
  onExpand: () => void;
  onSavePaid: (amount: number, paid_on: string, note: string) => Promise<void>;
  onSnooze: () => void | Promise<void>;
  onWontPay: () => void | Promise<void>;
}

function RowItem({ row, expanded, onExpand, onSavePaid, onSnooze, onWontPay }: RowItemProps) {
  const [amount, setAmount] = useState<string>(String(row.expected || ''));
  const [paidOn, setPaidOn] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const shiftDate = parseISO(row.shift.start_datetime);
  const dateLabel = !Number.isNaN(shiftDate.getTime()) ? format(shiftDate, 'EEE, MMM d') : '';

  return (
    <div className="border border-border rounded-md">
      <div className="flex items-center gap-3 p-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{row.facilityName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {dateLabel} · {row.sourceLabel}
          </p>
        </div>
        <span className="text-sm font-semibold tabular-nums shrink-0">
          ${row.expected.toLocaleString()}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant={expanded ? 'default' : 'outline'}
            onClick={onExpand}
            className="h-8"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Got paid
            <ChevronDown
              className={`h-3 w-3 ml-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </Button>
          <Button size="sm" variant="ghost" onClick={onSnooze} className="h-8" title="Snooze 7 days">
            <X className="h-3.5 w-3.5 mr-1" />
            Not yet
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onWontPay}
            className="h-8 text-muted-foreground"
            title="Won't be paid"
          >
            <CalendarOff className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border bg-muted/30 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`amt-${row.shift.id}`} className="text-xs">
                Amount received
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  $
                </span>
                <Input
                  id={`amt-${row.shift.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-8 pl-5 text-sm"
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`date-${row.shift.id}`} className="text-xs">
                Paid on
              </Label>
              <Input
                id={`date-${row.shift.id}`}
                type="date"
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
                className="h-8 mt-1 text-sm"
              />
            </div>
          </div>
          <div>
            <Label htmlFor={`note-${row.shift.id}`} className="text-xs">
              Note (optional)
            </Label>
            <Input
              id={`note-${row.shift.id}`}
              placeholder="e.g. ACH from Roo"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-8 mt-1 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="ghost" onClick={onExpand} className="h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saving || !amount || !paidOn}
              onClick={async () => {
                setSaving(true);
                try {
                  await onSavePaid(Number(amount) || 0, paidOn, note);
                } finally {
                  setSaving(false);
                }
              }}
              className="h-8"
            >
              {saving ? 'Saving…' : 'Save payment'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
