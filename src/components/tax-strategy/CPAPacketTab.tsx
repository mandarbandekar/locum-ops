import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Download, FileText, Printer, Plus, Trash2 } from 'lucide-react';
import { ENTITY_LABELS, DOC_STATUS_OPTIONS, QUARTER_STATUS_OPTIONS } from '@/types/taxStrategy';
import type { TaxStrategyData } from '@/hooks/useTaxStrategy';

interface Props {
  data: TaxStrategyData;
}

export function CPAPacketTab({ data }: Props) {
  const {
    profile, ytdPaidIncome, reserveAmount, readinessScore, categories, checklist,
    questions, quarterStatuses, totalDeductions, currentYear,
    addQuestion, updateQuestion, deleteQuestion,
  } = data;
  const [newQ, setNewQ] = useState('');

  const hasData = profile || categories.length > 0 || checklist.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-16 space-y-3">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <h2 className="text-xl font-semibold text-foreground">No CPA packet yet.</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Complete your tax profile and tracking to generate a planning summary for your CPA.
        </p>
      </div>
    );
  }

  const completedChecklist = checklist.filter(i => i.completed).length;
  const cpaReadyCategories = categories.filter(c => c.documentation_status === 'cpa_ready').length;
  const openQuestions = questions.filter(q => !q.resolved);

  const generateCSV = () => {
    const lines: string[] = [];
    lines.push(`LocumOps CPA Planning Packet — ${currentYear}`);
    lines.push('DISCLAIMER: Not tax\\, legal\\, or financial advice. Review all details with your CPA.');
    lines.push('');
    lines.push('Profile');
    lines.push(`Entity Type,${ENTITY_LABELS[profile?.current_entity_type || 'sole_proprietor']}`);
    lines.push(`Projected Annual Profit,${profile?.projected_annual_profit || 'Not set'}`);
    lines.push(`YTD Paid Income,${ytdPaidIncome.toFixed(2)}`);
    lines.push(`Reserve %,${profile?.reserve_percent ?? 30}%`);
    lines.push(`Reserve Amount,${reserveAmount.toFixed(2)}`);
    lines.push('');

    lines.push('Quarterly Status');
    lines.push('Quarter,Due Date,Status');
    quarterStatuses.forEach(qs => {
      const statusLabel = QUARTER_STATUS_OPTIONS.find(o => o.value === qs.status)?.label || qs.status;
      lines.push(`Q${qs.quarter},${qs.due_date},${statusLabel}`);
    });
    lines.push('');

    lines.push('Deduction Categories');
    lines.push('Category,YTD Amount,Status,Receipts %,Missing Docs,Notes');
    categories.forEach(c => {
      lines.push(
        `"${c.name}",${c.ytd_amount.toFixed(2)},${c.documentation_status},${c.receipt_completeness_percent}%,${c.missing_docs_count},"${(c.notes || '').replace(/"/g, '""')}"`
      );
    });
    lines.push(`Total,${totalDeductions.toFixed(2)},,,,`);
    lines.push('');

    lines.push('Readiness Checklist');
    lines.push(`Completion,${completedChecklist}/${checklist.length} (${readinessScore}%)`);
    checklist.forEach(i => lines.push(`${i.completed ? '✓' : '○'},${i.label}`));
    lines.push('');

    lines.push('Questions for CPA');
    questions.forEach(q =>
      lines.push(`${q.resolved ? '[Resolved]' : '[Open]'},"${q.question.replace(/"/g, '""')}"`)
    );

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cpa-packet-${currentYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  const handleAddQuestion = () => {
    if (!newQ.trim()) return;
    addQuestion(newQ.trim());
    setNewQ('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">CPA Planning Packet</h2>
          <p className="text-sm text-muted-foreground">
            A summary to bring to your next CPA conversation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={generateCSV}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Entity Type</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{ENTITY_LABELS[profile?.current_entity_type || 'sole_proprietor']}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Projected Annual Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">
              {profile?.projected_annual_profit
                ? `$${profile.projected_annual_profit.toLocaleString()}`
                : 'Not set'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">YTD Paid Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">
              ${ytdPaidIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Reserve Preference</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">
              {profile?.reserve_percent ?? 30}% → $
              {reserveAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tax Readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">
              {readinessScore}% ({completedChecklist}/{checklist.length})
            </p>
            <Progress value={readinessScore} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{cpaReadyCategories}/{categories.length} categories CPA-ready</p>
          </CardContent>
        </Card>
      </div>

      {/* Deduction summary */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deduction Categories Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categories.map(c => (
                <div key={c.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <span className="text-foreground">{c.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      ${c.ytd_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <Badge
                      variant={
                        DOC_STATUS_OPTIONS.find(o => o.value === c.documentation_status)?.variant || 'secondary'
                      }
                      className="text-xs"
                    >
                      {DOC_STATUS_OPTIONS.find(o => o.value === c.documentation_status)?.label ||
                        c.documentation_status}
                    </Badge>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm font-bold pt-2">
                <span>Total</span>
                <span>${totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions for CPA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Questions for My CPA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions.map(q => (
            <div key={q.id} className="flex items-start gap-3 py-1">
              <Checkbox
                checked={q.resolved}
                onCheckedChange={() => updateQuestion(q.id!, { resolved: !q.resolved })}
                className="mt-0.5"
              />
              <span
                className={`text-sm flex-1 ${q.resolved ? 'line-through text-muted-foreground' : 'text-foreground'}`}
              >
                {q.question}
              </span>
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-destructive shrink-0"
                onClick={() => deleteQuestion(q.id!)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="Add a question for your CPA…"
              value={newQ}
              onChange={e => setNewQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddQuestion()}
            />
            <Button variant="outline" size="sm" onClick={handleAddQuestion}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {openQuestions.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {openQuestions.length} open question{openQuestions.length !== 1 ? 's' : ''}
            </p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        This is a planning summary, not a tax return or filing tool. Review all details with your CPA.
      </p>
    </div>
  );
}
