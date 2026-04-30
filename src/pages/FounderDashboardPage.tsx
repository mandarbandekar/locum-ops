import { useEffect, useMemo, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Crown, ArrowUpDown, BarChart3, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isFounderAdmin } from '@/lib/founderAccess';
import { toast } from 'sonner';

interface FounderRow {
  user_id: string;
  email: string;
  display_name: string | null;
  signed_up_at: string;
  last_sign_in_at: string | null;
  clinic_count: number;
  shift_count: number;
  invoice_count: number;
  downloaded_invoice_count: number;
  credential_count: number;
  expense_count: number;
  last_activity_at: string | null;
  activation_status: 'active' | 'dormant' | 'never';
}

type SortKey = keyof Pick<
  FounderRow,
  'email' | 'signed_up_at' | 'last_sign_in_at' | 'clinic_count' | 'shift_count' | 'invoice_count' | 'downloaded_invoice_count' | 'credential_count' | 'expense_count' | 'activation_status'
>;

function formatDate(d?: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime()) || date.getFullYear() < 2000) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(d?: string | null) {
  if (!d) return 'Never';
  const date = new Date(d);
  if (isNaN(date.getTime()) || date.getFullYear() < 2000) return 'Never';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function pct(n: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

function StatusPill({ status }: { status: FounderRow['activation_status'] }) {
  const map: Record<FounderRow['activation_status'], { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    dormant: { label: 'Dormant', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    never: { label: 'Never logged in', cls: 'bg-muted text-muted-foreground border-border' },
  };
  const m = map[status];
  return <Badge variant="outline" className={`text-xs font-medium ${m.cls}`}>{m.label}</Badge>;
}

export default function FounderDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<FounderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('last_sign_in_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const allowed = isFounderAdmin(user?.email);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_founder_overview');
    if (error) {
      toast.error(error.message || 'Failed to load founder overview');
      setRows([]);
    } else {
      setRows((data || []) as FounderRow[]);
      setRefreshedAt(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      const as = String(av);
      const bs = String(bv);
      // dates compare lexicographically OK for ISO strings
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const total = rows.length;
  const activeCount = rows.filter((r) => r.activation_status === 'active').length;
  const activatedCount = rows.filter((r) => r.shift_count >= 1).length;
  const invoicingCount = rows.filter((r) => r.invoice_count >= 1).length;

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('desc'); }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/settings/profile" replace />;
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <h1 className="text-2xl font-semibold tracking-tight">Founder Dashboard</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Beta tester activation — last refreshed{' '}
            {refreshedAt ? refreshedAt.toLocaleTimeString() : '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a
              href="https://lovable.dev/projects/2263427a-5054-4595-ad6b-d5ed09d0eb59/analytics"
              target="_blank"
              rel="noopener noreferrer"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Lovable Analytics
              <ExternalLink className="h-3 w-3 ml-1.5 opacity-60" />
            </a>
          </Button>
          <Button onClick={load} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Hero metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <MetricCard label="Total testers" value={total} sub={loading && !total ? 'Loading…' : `${total} total`} />
        <MetricCard label="Active (7d)" value={activeCount} sub={`${pct(activeCount, total)} of testers`} />
        <MetricCard label="Activated" value={activatedCount} sub={`${pct(activatedCount, total)} have a shift`} />
        <MetricCard label="Invoicing" value={invoicingCount} sub={`${pct(invoicingCount, total)} have an invoice`} />
      </div>

      {/* Per-user table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Beta testers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <Th onClick={() => toggleSort('email')}>Email</Th>
                  <Th onClick={() => toggleSort('signed_up_at')}>Signed up</Th>
                  <Th onClick={() => toggleSort('last_sign_in_at')}>Last login</Th>
                  <Th onClick={() => toggleSort('clinic_count')} align="right">Clinics</Th>
                  <Th onClick={() => toggleSort('shift_count')} align="right">Shifts</Th>
                  <Th onClick={() => toggleSort('invoice_count')} align="right">Invoices</Th>
                  <Th onClick={() => toggleSort('downloaded_invoice_count')} align="right">Downloads</Th>
                  <Th onClick={() => toggleSort('credential_count')} align="right">Credentials</Th>
                  <Th onClick={() => toggleSort('expense_count')} align="right">Expenses</Th>
                  <Th onClick={() => toggleSort('activation_status')}>Status</Th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t">
                      <td colSpan={10} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                    </tr>
                  ))
                ) : sorted.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">No users yet.</td></tr>
                ) : (
                  sorted.map((r) => (
                    <tr key={r.user_id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-foreground">{r.email}</div>
                        {r.display_name && r.display_name !== r.email && (
                          <div className="text-xs text-muted-foreground">{r.display_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{formatDate(r.signed_up_at)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{formatRelative(r.last_sign_in_at)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{r.clinic_count}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{r.shift_count}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{r.invoice_count}</td>
                      <td className="px-4 py-2.5"><StatusPill status={r.activation_status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-3xl font-semibold text-amber-500 tabular-nums mt-1">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Th({
  children,
  onClick,
  align = 'left',
}: { children: React.ReactNode; onClick?: () => void; align?: 'left' | 'right' }) {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-2.5 text-xs font-medium select-none cursor-pointer ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      </span>
    </th>
  );
}
