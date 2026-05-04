import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ADMIN_EMAILS = ['mandar@locum-ops.com', 'mr.mandarbandekar@gmail.com'];

interface Feedback {
  id: string;
  created_at: string;
  user_email: string | null;
  type: string;
  description: string;
  screenshot_url: string | null;
  page_url: string | null;
  status: string;
  priority: string;
  internal_notes: string | null;
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'wont_do', label: "Won't Do" },
];

const STATUS_COLORS: Record<string, string> = {
  new: '#A07D3E',
  in_progress: '#C9941E',
  shipped: '#5EA87A',
  wont_do: '#9A968C',
};

const TYPE_COLORS: Record<string, string> = {
  bug: '#A07D3E',
  feature: '#5EA87A',
  confusion: '#C9941E',
  other: '#9A968C',
};

export default function AdminFeedbackPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Feedback[]>([]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [signedScreenshot, setSignedScreenshot] = useState<string | null>(null);

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin]);

  const load = async () => {
    const { data, error } = await supabase
      .from('feedback_submissions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((data || []) as Feedback[]);
  };

  useEffect(() => {
    if (!selected?.screenshot_url) {
      setSignedScreenshot(null);
      return;
    }
    supabase.storage
      .from('feedback-screenshots')
      .createSignedUrl(selected.screenshot_url, 3600)
      .then(({ data }) => setSignedScreenshot(data?.signedUrl ?? null));
  }, [selected]);

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.status === filter)),
    [items, filter]
  );

  const updateField = async (id: string, patch: Partial<Feedback>) => {
    const { error } = await supabase.from('feedback_submissions').update(patch).eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    if (selected?.id === id) setSelected({ ...selected, ...patch } as Feedback);
  };

  if (loading) return <div className="p-8">Loading…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F6F4EF', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Feedback</h1>
          <p className="text-sm text-muted-foreground">{items.length} submissions</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm border transition-colors',
                filter === f.value ? 'text-white border-transparent' : 'bg-white border-border'
              )}
              style={filter === f.value ? { backgroundColor: '#1A5C6B' } : undefined}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Page</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No feedback yet
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((f) => (
                <TableRow key={f.id} className="cursor-pointer" onClick={() => setSelected(f)}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(f.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs">{f.user_email || '—'}</TableCell>
                  <TableCell>
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
                      style={{ backgroundColor: TYPE_COLORS[f.type] || '#9A968C' }}
                    >
                      {f.type}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm">
                    {f.description.length > 80 ? f.description.slice(0, 80) + '…' : f.description}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                    {f.page_url}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select value={f.priority} onValueChange={(v) => updateField(f.id, { priority: v })}>
                      <SelectTrigger className="h-8 w-[100px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unset">Unset</SelectItem>
                        <SelectItem value="p0">P0</SelectItem>
                        <SelectItem value="p1">P1</SelectItem>
                        <SelectItem value="p2">P2</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select value={f.status} onValueChange={(v) => updateField(f.id, { status: v })}>
                      <SelectTrigger
                        className="h-8 w-[130px] text-xs text-white border-transparent"
                        style={{ backgroundColor: STATUS_COLORS[f.status] }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="wont_do">Won't Do</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Feedback details</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <div className="text-xs text-muted-foreground">From</div>
                  <div className="text-sm">{selected.user_email || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Submitted</div>
                  <div className="text-sm">{new Date(selected.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Page</div>
                  <div className="text-sm break-all">{selected.page_url}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Description</div>
                  <div className="text-sm whitespace-pre-wrap">{selected.description}</div>
                </div>
                {signedScreenshot && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Screenshot</div>
                    <a href={signedScreenshot} target="_blank" rel="noreferrer">
                      <img src={signedScreenshot} alt="screenshot" className="rounded-lg border border-border max-h-80" />
                    </a>
                  </div>
                )}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Internal notes</div>
                  <Textarea
                    defaultValue={selected.internal_notes || ''}
                    placeholder="Add notes…"
                    rows={5}
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val !== (selected.internal_notes || '')) {
                        updateField(selected.id, { internal_notes: val });
                      }
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
