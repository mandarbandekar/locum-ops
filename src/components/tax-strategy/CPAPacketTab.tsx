import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Download, FileText, Plus, Trash2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { aggregateQuarterlyIncome, calculateSetAside, getDefaultDueDates } from '@/lib/taxCalculations';

const db = (table: string) => supabase.from(table as any);

const DEFAULT_CPA_QUESTIONS = [
  'My relief income increased this year. Should we revisit entity structure?',
  'At what income level should I revisit 1099 vs S-corp for my relief work?',
  'I work across multiple clinics. What should I be tracking more carefully?',
  'Should I review reasonable compensation for my S-corp?',
  'Should we discuss an accountable plan for mileage, CE, licensing, and other reimbursable business expenses?',
  'Which categories need better documentation before year-end?',
  'How should I think about payroll/admin complexity if my locum income keeps growing?',
  'What should I keep for travel between clinics or out-of-town assignments?',
  'Should we review retirement contribution options this year?',
  'Do my current records support the deductions I want to discuss?',
];

interface CPAQuestion {
  id?: string;
  question: string;
  source: string;
  resolved: boolean;
}

export default function CPAPacketTab() {
  const { invoices } = useData();
  const { user, isDemo } = useAuth();
  const currentYear = new Date().getFullYear();
  const [questions, setQuestions] = useState<CPAQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(!isDemo);

  // Load supporting data
  const [taxProfile, setTaxProfile] = useState<any>(null);
  const [deductions, setDeductions] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [quarterStatuses, setQuarterStatuses] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ set_aside_mode: 'percent', set_aside_percent: 30, set_aside_fixed_monthly: 0 });

  useEffect(() => {
    if (isDemo) {
      setQuestions(DEFAULT_CPA_QUESTIONS.slice(0, 5).map(q => ({ question: q, source: 'default', resolved: false })));
      setLoading(false);
      return;
    }
    if (!user) return;
    loadAll();
  }, [user?.id, isDemo]);

  async function loadAll() {
    setLoading(true);
    try {
      const [qRes, pRes, dRes, clRes, qsRes, sRes] = await Promise.all([
        db('cpa_questions').select('*').order('created_at'),
        db('tax_profiles').select('*').maybeSingle(),
        db('deduction_categories').select('*').order('created_at'),
        db('tax_checklist_items').select('*').order('created_at'),
        db('tax_quarter_statuses').select('*').eq('tax_year', currentYear).order('quarter'),
        db('tax_settings').select('*').eq('tax_year', currentYear).maybeSingle(),
      ]);
      if ((qRes.data as any)?.length > 0) {
        setQuestions((qRes.data as any[]).map((r: any) => ({ id: r.id, question: r.question, source: r.source, resolved: r.resolved })));
      }
      if (pRes.data) setTaxProfile(pRes.data);
      if (dRes.data) setDeductions(dRes.data as any[]);
      if (clRes.data) setChecklist(clRes.data as any[]);
      if (qsRes.data) setQuarterStatuses(qsRes.data as any[]);
      if (sRes.data) {
        const d = sRes.data as any;
        setSettings({ set_aside_mode: d.set_aside_mode, set_aside_percent: Number(d.set_aside_percent), set_aside_fixed_monthly: Number(d.set_aside_fixed_monthly) });
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function addQuestion() {
    if (!newQuestion.trim()) return;
    const q: CPAQuestion = { question: newQuestion.trim(), source: 'manual', resolved: false };
    if (!isDemo && user) {
      const { data } = await db('cpa_questions').insert({ user_id: user.id, ...q } as any).select().single() as { data: any };
      if (data) q.id = data.id;
    }
    setQuestions(prev => [...prev, q]);
    setNewQuestion('');
    toast.success('Question added');
  }

  async function seedDefaults() {
    const items = DEFAULT_CPA_QUESTIONS.map(q => ({ question: q, source: 'default', resolved: false }));
    if (!isDemo && user) {
      const toInsert = items.map(q => ({ user_id: user.id, ...q }));
      const { data } = await db('cpa_questions').insert(toInsert as any).select() as { data: any[] | null };
      if (data) {
        setQuestions(data.map((r: any) => ({ id: r.id, question: r.question, source: r.source, resolved: r.resolved })));
        toast.success('Default questions added');
        return;
      }
    }
    setQuestions(items);
    toast.success('Default questions added');
  }

  async function toggleResolved(idx: number) {
    const q = questions[idx];
    const updated = { ...q, resolved: !q.resolved };
    setQuestions(prev => prev.map((c, i) => i === idx ? updated : c));
    if (!isDemo && user && updated.id) {
      await db('cpa_questions').update({ resolved: updated.resolved }).eq('id', updated.id);
    }
  }

  async function removeQuestion(idx: number) {
    const q = questions[idx];
    setQuestions(prev => prev.filter((_, i) => i !== idx));
    if (!isDemo && user && q.id) {
      await db('cpa_questions').delete().eq('id', q.id);
    }
  }

  // Computed data
  const quarterlyIncome = useMemo(() => aggregateQuarterlyIncome(invoices, currentYear), [invoices, currentYear]);
  const setAsideData = useMemo(() => calculateSetAside(quarterlyIncome, settings.set_aside_mode, settings.set_aside_percent, settings.set_aside_fixed_monthly), [quarterlyIncome, settings]);
  const totalIncome = quarterlyIncome.reduce((s, q) => s + q.income, 0);
  const totalSetAside = setAsideData.reduce((s, q) => s + q.amount, 0);
  const totalDeductions = deductions.reduce((s: number, d: any) => s + Number(d.ytd_amount || 0), 0);
  const checklistCompleted = checklist.filter((c: any) => c.completed).length;
  const checklistTotal = checklist.length || 12;
  const readinessPercent = Math.round((checklistCompleted / checklistTotal) * 100);

  function exportCSV() {
    let csv = 'LocumOps CPA Planning Packet\n';
    csv += `Tax Year,${currentYear}\n`;
    csv += `Entity Type,${taxProfile?.current_entity_type || 'Not set'}\n`;
    csv += `Projected Profit,${taxProfile?.projected_annual_profit || 'Not set'}\n`;
    csv += `YTD Paid Income,$${totalIncome.toFixed(2)}\n`;
    csv += `Reserve Preference,${settings.set_aside_mode === 'percent' ? settings.set_aside_percent + '%' : '$' + settings.set_aside_fixed_monthly + '/mo'}\n`;
    csv += `Est Reserve,$${totalSetAside.toFixed(2)}\n`;
    csv += `Readiness Score,${readinessPercent}%\n\n`;

    csv += 'Deduction Categories\n';
    csv += 'Category,YTD Amount,Status,Completeness,Missing Docs,Notes\n';
    deductions.forEach((d: any) => {
      csv += `"${d.name}",$${Number(d.ytd_amount).toFixed(2)},${d.documentation_status},${d.receipt_completeness_percent}%,${d.missing_docs_count},"${d.notes || ''}"\n`;
    });
    csv += `\nTotal Deductions,$${totalDeductions.toFixed(2)}\n\n`;

    csv += 'Quarter Statuses\n';
    csv += 'Quarter,Due Date,Status\n';
    quarterStatuses.forEach((qs: any) => {
      csv += `Q${qs.quarter},${qs.due_date},${qs.status}\n`;
    });

    csv += '\nCPA Questions\n';
    questions.filter(q => !q.resolved).forEach(q => { csv += `"${q.question}"\n`; });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `LocumOps_CPA_Packet_${currentYear}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }

  if (loading) return <p className="text-muted-foreground py-8 text-center">Loading…</p>;

  const hasData = taxProfile || deductions.length > 0 || checklist.length > 0 || questions.length > 0;

  if (!hasData && !isDemo) {
    return (
      <div className="py-16 text-center space-y-4">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
        <h3 className="text-lg font-semibold">No CPA packet yet.</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Complete your tax profile and tracking to generate a planning summary for your CPA.
        </p>
        <Button variant="outline" onClick={seedDefaults}>Load Default CPA Questions</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Planning summary to take to your CPA. Not a tax return or filing tool.</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground">Entity</p><p className="text-lg font-bold">{taxProfile?.current_entity_type?.replace('_', ' ') || 'Not set'}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground">YTD Income</p><p className="text-lg font-bold">${totalIncome.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground">Total Deductions</p><p className="text-lg font-bold">${totalDeductions.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground">Readiness</p><p className="text-lg font-bold">{readinessPercent}%</p></CardContent></Card>
      </div>

      {/* Deductions Summary */}
      {deductions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Deduction Categories</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deductions.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <span>{d.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">${Number(d.ytd_amount).toLocaleString()}</span>
                    <Badge variant={d.documentation_status === 'cpa_ready' ? 'default' : 'secondary'} className="text-xs">
                      {d.documentation_status === 'cpa_ready' ? 'Ready' : 'Review'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quarter Statuses */}
      {quarterStatuses.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Estimated Tax Quarters</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {quarterStatuses.map((qs: any) => (
                <div key={qs.quarter} className="text-center p-2 rounded-md bg-muted">
                  <p className="text-sm font-medium">Q{qs.quarter}</p>
                  <p className="text-xs text-muted-foreground">{new Date(qs.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  <Badge variant={qs.status === 'paid' ? 'default' : 'secondary'} className="text-xs mt-1">{qs.status.replace('_', ' ')}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Readiness */}
      <Card>
        <CardHeader><CardTitle className="text-base">Checklist Readiness</CardTitle></CardHeader>
        <CardContent>
          <Progress value={readinessPercent} className="mb-2" />
          <p className="text-sm text-muted-foreground">{checklistCompleted} of {checklistTotal} items completed ({readinessPercent}%)</p>
        </CardContent>
      </Card>

      {/* CPA Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Questions for My CPA</CardTitle>
            {questions.length === 0 && <Button size="sm" variant="outline" onClick={seedDefaults}>Load Defaults</Button>}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="flex items-start gap-3 py-1">
              <Checkbox checked={q.resolved} onCheckedChange={() => toggleResolved(i)} className="mt-1" />
              <p className={`text-sm flex-1 ${q.resolved ? 'line-through text-muted-foreground' : ''}`}>{q.question}</p>
              <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => removeQuestion(i)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Textarea value={newQuestion} onChange={e => setNewQuestion(e.target.value)} placeholder="Add a question for your CPA..." className="min-h-[60px]" />
            <Button size="sm" className="shrink-0 self-end" onClick={addQuestion}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { DEFAULT_CPA_QUESTIONS };
