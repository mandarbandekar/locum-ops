import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Folder } from 'lucide-react';
import { toast } from 'sonner';

const db = (table: string) => supabase.from(table as any);

export const DEFAULT_DEDUCTION_CATEGORIES = [
  'CE / Licensing',
  'DEA / Certification Renewals',
  'Professional Insurance / Malpractice',
  'Mileage Between Clinics / Facilities',
  'Travel for Assignments',
  'Lodging for Away Assignments',
  'Meals While Traveling for Work',
  'Scrubs / Work Gear / Supplies',
  'Equipment / Supplies',
  'Software / Subscriptions',
  'Phone / Internet Business Portion',
  'Home Office / Business Admin Space',
  'Payroll / Contractor Help',
  'Retirement / Benefits Discussion',
  'Banking / Payment Processing Fees',
  'Legal / Accounting Fees',
];

interface DeductionCategory {
  id?: string;
  name: string;
  ytd_amount: number;
  documentation_status: string;
  receipt_completeness_percent: number;
  missing_docs_count: number;
  notes: string;
}

export default function DeductionsTab() {
  const { user, isDemo } = useAuth();
  const [categories, setCategories] = useState<DeductionCategory[]>([]);
  const [loading, setLoading] = useState(!isDemo);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (isDemo) {
      setCategories([]);
      setLoading(false);
      return;
    }
    if (!user) return;
    loadData();
  }, [user?.id, isDemo]);

  async function loadData() {
    setLoading(true);
    const { data } = await db('deduction_categories').select('*').order('created_at') as { data: any[] | null };
    if (data && data.length > 0) {
      setCategories(data.map((r: any) => ({
        id: r.id, name: r.name, ytd_amount: Number(r.ytd_amount), documentation_status: r.documentation_status,
        receipt_completeness_percent: r.receipt_completeness_percent, missing_docs_count: r.missing_docs_count, notes: r.notes,
      })));
    }
    setLoading(false);
  }

  async function seedDefaults() {
    const items = DEFAULT_DEDUCTION_CATEGORIES.map(name => ({
      name, ytd_amount: 0, documentation_status: 'needs_review', receipt_completeness_percent: 0, missing_docs_count: 0, notes: '',
    }));
    setCategories(items);
    if (!isDemo && user) {
      const toInsert = items.map(item => ({ user_id: user.id, ...item }));
      const { data } = await db('deduction_categories').insert(toInsert as any).select() as { data: any[] | null };
      if (data) {
        setCategories(data.map((r: any) => ({
          id: r.id, name: r.name, ytd_amount: Number(r.ytd_amount), documentation_status: r.documentation_status,
          receipt_completeness_percent: r.receipt_completeness_percent, missing_docs_count: r.missing_docs_count, notes: r.notes,
        })));
      }
    }
    toast.success('Default categories created');
  }

  async function saveCategory(idx: number) {
    const cat = categories[idx];
    if (!isDemo && user) {
      if (cat.id) {
        await db('deduction_categories').update({
          ytd_amount: cat.ytd_amount, documentation_status: cat.documentation_status,
          receipt_completeness_percent: cat.receipt_completeness_percent, missing_docs_count: cat.missing_docs_count, notes: cat.notes,
        }).eq('id', cat.id);
      }
    }
    setEditIndex(null);
    toast.success(`${cat.name} saved`);
  }

  async function addCategory() {
    if (!newName.trim()) return;
    const item: DeductionCategory = {
      name: newName.trim(), ytd_amount: 0, documentation_status: 'needs_review',
      receipt_completeness_percent: 0, missing_docs_count: 0, notes: '',
    };
    if (!isDemo && user) {
      const { data } = await db('deduction_categories').insert({ user_id: user.id, ...item } as any).select().single() as { data: any };
      if (data) item.id = data.id;
    }
    setCategories(prev => [...prev, item]);
    setNewName('');
    setShowAdd(false);
    toast.success('Category added');
  }

  const update = (idx: number, field: keyof DeductionCategory, value: any) => {
    setCategories(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const totalYTD = categories.reduce((s, c) => s + c.ytd_amount, 0);
  const avgCompleteness = categories.length > 0 ? Math.round(categories.reduce((s, c) => s + c.receipt_completeness_percent, 0) / categories.length) : 0;
  const needsReviewCount = categories.filter(c => c.documentation_status === 'needs_review').length;

  if (loading) return <p className="text-muted-foreground py-8 text-center">Loading…</p>;

  // Empty state
  if (categories.length === 0) {
    return (
      <div className="py-16 text-center space-y-4">
        <Folder className="h-12 w-12 text-muted-foreground mx-auto" />
        <h3 className="text-lg font-semibold">No tax categories tracked yet.</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Organize common relief and locum business expense categories so you can review them more efficiently with your CPA.
        </p>
        <Button onClick={seedDefaults}>Load Default Categories</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Track categories to review with your CPA. Organize common clinician business expenses.</p>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" /> Add Category</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground">Total YTD</p><p className="text-xl font-bold">${totalYTD.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground">Avg Documentation</p><p className="text-xl font-bold">{avgCompleteness}%</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground">Needs Review</p><p className="text-xl font-bold">{needsReviewCount}</p></CardContent></Card>
      </div>

      {/* Category cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {categories.map((cat, idx) => (
          <Card key={cat.id || cat.name} className="relative">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{cat.name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={cat.documentation_status === 'cpa_ready' ? 'default' : 'secondary'} className="text-xs">
                    {cat.documentation_status === 'cpa_ready' ? 'CPA-Ready' : 'Needs Review'}
                  </Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditIndex(idx)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">YTD: <span className="font-medium text-foreground">${cat.ytd_amount.toLocaleString()}</span></span>
                <span className="text-muted-foreground">Docs: {cat.receipt_completeness_percent}%</span>
              </div>
              <Progress value={cat.receipt_completeness_percent} className="h-1.5" />
              {cat.missing_docs_count > 0 && (
                <p className="text-xs text-destructive">{cat.missing_docs_count} missing doc{cat.missing_docs_count > 1 ? 's' : ''}</p>
              )}
              {cat.notes && <p className="text-xs text-muted-foreground italic">{cat.notes}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editIndex !== null} onOpenChange={() => setEditIndex(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? categories[editIndex]?.name : ''}</DialogTitle>
          </DialogHeader>
          {editIndex !== null && (
            <div className="space-y-4">
              <div><Label>YTD Amount ($)</Label><Input type="number" value={categories[editIndex].ytd_amount} onChange={e => update(editIndex, 'ytd_amount', Number(e.target.value))} /></div>
              <div>
                <Label>Documentation Status</Label>
                <Select value={categories[editIndex].documentation_status} onValueChange={v => update(editIndex, 'documentation_status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="needs_review">Needs Review</SelectItem>
                    <SelectItem value="cpa_ready">CPA-Ready</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Receipt Completeness (%)</Label><Input type="number" min={0} max={100} value={categories[editIndex].receipt_completeness_percent} onChange={e => update(editIndex, 'receipt_completeness_percent', Number(e.target.value))} /></div>
              <div><Label>Missing Documents Count</Label><Input type="number" min={0} value={categories[editIndex].missing_docs_count} onChange={e => update(editIndex, 'missing_docs_count', Number(e.target.value))} /></div>
              <div><Label>Notes for CPA</Label><Textarea value={categories[editIndex].notes} onChange={e => update(editIndex, 'notes', e.target.value)} placeholder="Flag questions about this category..." /></div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => editIndex !== null && saveCategory(editIndex)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <div><Label>Category Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Professional memberships" /></div>
          <DialogFooter><Button onClick={addCategory}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
