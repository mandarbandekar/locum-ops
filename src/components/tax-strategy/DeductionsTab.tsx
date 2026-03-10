import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Receipt, Trash2, Pencil } from 'lucide-react';
import { DOC_STATUS_OPTIONS } from '@/types/taxStrategy';
import type { DeductionCategory } from '@/types/taxStrategy';
import type { TaxStrategyData } from '@/hooks/useTaxStrategy';

interface Props {
  data: TaxStrategyData;
}

function CategoryForm({
  category,
  onSave,
  onCancel,
}: {
  category?: DeductionCategory;
  onSave: (c: DeductionCategory) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<DeductionCategory>(
    category || {
      name: '', ytd_amount: 0, documentation_status: 'needs_review',
      receipt_completeness_percent: 0, missing_docs_count: 0, notes: '',
    }
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Category name</Label>
        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>YTD amount ($)</Label>
          <Input
            type="number"
            value={form.ytd_amount}
            onChange={e => setForm(f => ({ ...f, ytd_amount: parseFloat(e.target.value) || 0 }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Documentation status</Label>
          <Select value={form.documentation_status} onValueChange={v => setForm(f => ({ ...f, documentation_status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOC_STATUS_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Receipt completeness %</Label>
          <Input
            type="number" min={0} max={100}
            value={form.receipt_completeness_percent}
            onChange={e => setForm(f => ({ ...f, receipt_completeness_percent: parseInt(e.target.value) || 0 }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Missing documents count</Label>
          <Input
            type="number" min={0}
            value={form.missing_docs_count}
            onChange={e => setForm(f => ({ ...f, missing_docs_count: parseInt(e.target.value) || 0 }))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes for CPA</Label>
        <Textarea
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Flag questions about this category…"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name.trim()}>Save</Button>
      </div>
    </div>
  );
}

export function DeductionsTab({ data }: Props) {
  const { categories, saveCategory, deleteCategory, initializeCategories, totalDeductions } = data;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    initializeCategories();
  }, [initializeCategories]);

  if (categories.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <h2 className="text-xl font-semibold text-foreground">No tax categories tracked yet.</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Organize common relief and locum business expense categories so you can review them more efficiently with your
          CPA.
        </p>
        <Button onClick={initializeCategories} className="mt-4">Add default categories</Button>
      </div>
    );
  }

  const cpaReadyCount = categories.filter(c => c.documentation_status === 'cpa_ready').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Common Locum Business Expense Categories</h2>
          <p className="text-sm text-muted-foreground">
            Track categories to review with your CPA. {cpaReadyCount}/{categories.length} CPA-ready.
          </p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
            <CategoryForm
              onSave={c => { saveCategory(c); setShowAdd(false); }}
              onCancel={() => setShowAdd(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Total YTD</p>
            <p className="text-lg font-bold">
              ${totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {categories.map(cat => (
          <Card key={cat.id}>
            {editingId === cat.id ? (
              <CardContent className="pt-4">
                <CategoryForm
                  category={cat}
                  onSave={c => { saveCategory({ ...c, id: cat.id }); setEditingId(null); }}
                  onCancel={() => setEditingId(null)}
                />
              </CardContent>
            ) : (
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">{cat.name}</p>
                      <Badge
                        variant={DOC_STATUS_OPTIONS.find(o => o.value === cat.documentation_status)?.variant || 'secondary'}
                      >
                        {DOC_STATUS_OPTIONS.find(o => o.value === cat.documentation_status)?.label || cat.documentation_status}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                      <span>${cat.ytd_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      <span>Receipts: {cat.receipt_completeness_percent}%</span>
                      {cat.missing_docs_count > 0 && (
                        <span className="text-amber-600">{cat.missing_docs_count} missing</span>
                      )}
                    </div>
                    {cat.receipt_completeness_percent > 0 && (
                      <Progress value={cat.receipt_completeness_percent} className="h-1.5 w-32" />
                    )}
                    {cat.notes && <p className="text-xs text-muted-foreground italic">{cat.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(cat.id!)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteCategory(cat.id!)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Keep CE, licensing, and insurance organized for year-end planning. Use notes to flag questions about travel or
        multi-site work.
      </p>
    </div>
  );
}
