import { useEffect, useMemo, useState, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { RefreshCw, ShieldAlert, ArrowLeft, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isFounderAdmin } from '@/lib/founderAccess';
import { toast } from 'sonner';

interface AuditRow {
  user_id: string;
  user_email: string | null;
  invoice_id: string;
  invoice_number: string;
  invoice_status: string;
  generation_type: string;
  line_id: string;
  line_kind: string;
  line_description: string;
  line_qty: number;
  line_unit_rate: number;
  line_total: number;
  expected_line_total: number;
  shift_id: string | null;
  shift_rate_kind: string | null;
  shift_rate_applied: number | null;
  shift_hourly_rate: number | null;
  mismatch_reasons: string[];
  user_edited_at: string | null;
}

const REASON_LABELS: Record<string, { label: string; tone: string }> = {
  flat_shift_billed_as_hourly: { label: 'Flat shift billed as hourly', tone: 'bg-amber-100 text-amber-800 border-amber-200' },
  hourly_shift_billed_as_flat: { label: 'Hourly shift billed as flat', tone: 'bg-amber-100 text-amber-800 border-amber-200' },
  flat_unit_rate_differs_from_shift: { label: 'Flat unit rate ≠ shift rate', tone: 'bg-orange-100 text-orange-800 border-orange-200' },
  line_total_math_mismatch: { label: 'qty × rate ≠ total', tone: 'bg-red-100 text-red-800 border-red-200' },
};

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  sent: 'bg-blue-100 text-blue-800 border-blue-200',
  partial: 'bg-amber-100 text-amber-800 border-amber-200',
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

function money(n: number | null | undefined) {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function FounderInvoiceAuditPage() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('audit_invoice_line_mismatches' as never);
    if (error) {
      toast.error(`Audit failed: ${error.message}`);
      setRows([]);
    } else {
      setRows((data as AuditRow[]) ?? []);
      setRefreshedAt(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && isFounderAdmin(user?.email)) void load();
  }, [authLoading, user?.email, load]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const q = filter.trim().toLowerCase();
    return rows.filter(r =>
      (r.user_email ?? '').toLowerCase().includes(q) ||
      r.invoice_number.toLowerCase().includes(q) ||
      r.mismatch_reasons.some(rs => rs.toLowerCase().includes(q)),
    );
  }, [rows, filter]);

  const summary = useMemo(() => {
    const byReason = new Map<string, number>();
    const affectedInvoices = new Set<string>();
    const affectedUsers = new Set<string>();
    for (const r of rows) {
      affectedInvoices.add(r.invoice_id);
      affectedUsers.add(r.user_id);
      for (const reason of r.mismatch_reasons) {
        byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
      }
    }
    return { byReason, affectedInvoices: affectedInvoices.size, affectedUsers: affectedUsers.size };
  }, [rows]);

  if (authLoading) return null;
  if (!isFounderAdmin(user?.email)) return <Navigate to="/dashboard" replace />;

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/founder" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Founder
            </Link>
          </div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
            Invoice line audit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lines where the invoice breakdown doesn't match the underlying shift's rate type, or where qty × unit rate doesn't match the line total.
          </p>
        </div>
        <Button onClick={() => void load()} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Re-scan
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Mismatched lines</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{rows.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Affected invoices</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{summary.affectedInvoices}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Affected users</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{summary.affectedUsers}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Last scan</CardTitle></CardHeader>
          <CardContent><div className="text-sm">{refreshedAt ? refreshedAt.toLocaleTimeString() : '—'}</div></CardContent>
        </Card>
      </div>

      {summary.byReason.size > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Breakdown by reason</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {[...summary.byReason.entries()].map(([reason, count]) => (
              <Badge key={reason} variant="outline" className={`text-xs ${REASON_LABELS[reason]?.tone ?? ''}`}>
                {REASON_LABELS[reason]?.label ?? reason} · {count}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">Findings</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by email, invoice #, reason…"
                className="pl-7 h-8 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {rows.length === 0 ? 'No mismatches found. All invoice lines align with their shifts.' : 'No rows match this filter.'}
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Invoice</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Line</th>
                    <th className="px-3 py-2 font-medium text-right">Qty × Rate = Total</th>
                    <th className="px-3 py-2 font-medium">Shift</th>
                    <th className="px-3 py-2 font-medium">Reasons</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.line_id} className="border-t border-border/60 align-top">
                      <td className="px-3 py-2">
                        <div className="font-medium text-foreground">{r.user_email ?? '—'}</div>
                        <div className="text-muted-foreground font-mono text-[10px]">{r.user_id.slice(0, 8)}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.invoice_number}</div>
                        <div className="text-muted-foreground">{r.generation_type}</div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[r.invoice_status] ?? ''}`}>
                          {r.invoice_status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 max-w-[220px]">
                        <div className="truncate" title={r.line_description}>{r.line_description}</div>
                        <div className="text-muted-foreground">kind: <span className="font-mono">{r.line_kind}</span></div>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <div>{r.line_qty} × {money(r.line_unit_rate)} = {money(r.line_total)}</div>
                        {Math.abs(r.line_total - r.expected_line_total) > 0.02 && (
                          <div className="text-red-600">expected {money(r.expected_line_total)}</div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {r.shift_id ? (
                          <>
                            <div>kind: <span className="font-mono">{r.shift_rate_kind}</span></div>
                            <div className="text-muted-foreground">
                              flat: {money(r.shift_rate_applied)} · hr: {money(r.shift_hourly_rate)}
                            </div>
                          </>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          {r.mismatch_reasons.map(reason => (
                            <Badge key={reason} variant="outline" className={`text-[10px] w-fit ${REASON_LABELS[reason]?.tone ?? ''}`}>
                              {REASON_LABELS[reason]?.label ?? reason}
                            </Badge>
                          ))}
                          {r.user_edited_at && (
                            <span className="text-[10px] text-muted-foreground italic">user-edited</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
