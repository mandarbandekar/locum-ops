import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DollarSign, CalendarDays, CheckCircle2, AlertCircle, EyeOff, ChevronDown,
  Folder, Plus, Pencil, MessageSquare, FileText, Download, Printer,
  Trash2, BookOpen, Lightbulb,
} from 'lucide-react';
import { TaxDisclaimerBanner } from '@/components/tax-strategy/TaxDisclaimer';
import TaxStatusBanner from '@/components/tax-copilot/TaxStatusBanner';
import TaxEstimatorCard from '@/components/tax-strategy/TaxEstimatorCard';
import AskAdvisorTab from '@/components/tax-advisor/AskAdvisorTab';
import GuidanceTab from '@/components/tax-strategy/GuidanceTab';
import { useTaxCopilot, STATUS_OPTIONS, DEFAULT_CHECKLIST_ITEMS } from '@/hooks/useTaxCopilot';
import { useData } from '@/contexts/DataContext';
import { aggregateQuarterlyIncome, calculateSetAside } from '@/lib/taxCalculations';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TaxCopilotPage() {
  const copilot = useTaxCopilot();
  const {
    loading, selectedYear, setSelectedYear, currentYear, currentQuarter,
    settings, setSettings, saveSettings,
    quarterStatuses, setQuarterStatuses, saveQuarterStatus,
    checklist, toggleChecklist, toggleIgnore, activeChecklist, completedCount, readinessPercent,
    quarterlyIncome, setAsideData, totalIncome, totalSetAside, taxEstimate, estimatedQuarterly, nextDue,
    statusLevel, reserveGap,
    deductions, seedDeductions, saveDeduction, addDeduction, updateDeduction,
    cpaQuestions, addCpaQuestion, toggleCpaQuestion, removeCpaQuestion, seedCpaQuestions,
    advisorProfile, advisorSessions, saveAdvisorSession, saveAdvisorQuestion,
  } = copilot;

  // Local UI state
  const [deductionEditIndex, setDeductionEditIndex] = useState<number | null>(null);
  const [showAddDeduction, setShowAddDeduction] = useState(false);
  const [newDeductionName, setNewDeductionName] = useState('');
  const [newCpaQuestion, setNewCpaQuestion] = useState('');
  const [deductionsOpen, setDeductionsOpen] = useState(true);
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const [readinessOpen, setReadinessOpen] = useState(false);
  const [cpaOpen, setCpaOpen] = useState(false);
  const [advisorOpen, setAdvisorOpen] = useState(false);

  const pastDueQuarter = useMemo(() => {
    const pd = quarterStatuses.find(q => new Date(q.due_date) < new Date() && q.status !== 'paid');
    return pd?.quarter ?? null;
  }, [quarterStatuses]);

  function getInstruction(itemKey: string): string {
    return DEFAULT_CHECKLIST_ITEMS.find(d => d.key === itemKey)?.instruction || '';
  }

  // CPA export
  const { invoices } = useData();
  const totalDeductions = deductions.reduce((s, d) => s + d.ytd_amount, 0);

  function exportCSV() {
    let csv = 'LocumOps CPA Planning Packet\n';
    csv += `Tax Year,${currentYear}\n`;
    csv += `YTD Paid Income,$${totalIncome.toFixed(2)}\n`;
    csv += `Est Reserve,$${totalSetAside.toFixed(2)}\n`;
    csv += `Readiness Score,${readinessPercent}%\n\n`;
    csv += 'Deduction Categories\n';
    csv += 'Category,YTD Amount,Status,Completeness,Missing Docs,Notes\n';
    deductions.forEach(d => {
      csv += `"${d.name}",$${d.ytd_amount.toFixed(2)},${d.documentation_status},${d.receipt_completeness_percent}%,${d.missing_docs_count},"${d.notes || ''}"\n`;
    });
    csv += `\nTotal Deductions,$${totalDeductions.toFixed(2)}\n\n`;
    csv += 'Quarter Statuses\n';
    csv += 'Quarter,Due Date,Status\n';
    quarterStatuses.forEach(qs => { csv += `Q${qs.quarter},${qs.due_date},${qs.status}\n`; });
    csv += '\nCPA Questions\n';
    cpaQuestions.filter(q => !q.resolved).forEach(q => { csv += `"${q.question}"\n`; });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `LocumOps_CPA_Packet_${currentYear}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="text-muted-foreground py-8 text-center">Loading…</p>;

  return (
    <div className="space-y-6">
      <TaxDisclaimerBanner />

      {/* Section A: Status Banner */}
      <TaxStatusBanner statusLevel={statusLevel} reserveGap={reserveGap} pastDueQuarter={pastDueQuarter} />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Paid Income YTD</p>
            <p className="text-xl font-bold">${fmt(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Est. Tax Liability</p>
            <p className="text-xl font-bold">${fmt(taxEstimate.totalEstimatedTax)}</p>
            <p className="text-xs text-muted-foreground">{taxEstimate.effectiveRate}% effective</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Your Reserve</p>
            <p className="text-xl font-bold">${fmt(totalSetAside)}</p>
            {totalSetAside > 0 && (
              <p className={`text-xs font-medium ${totalSetAside >= taxEstimate.totalEstimatedTax ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {totalSetAside >= taxEstimate.totalEstimatedTax ? '✓ Covers estimate' : '⚠ Under estimate'}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Next Due</p>
            <p className="text-xl font-bold">{nextDue ? `Q${nextDue.quarter}` : '—'}</p>
            {nextDue && <p className="text-xs text-muted-foreground">{new Date(nextDue.due_date).toLocaleDateString()}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Section B: Tax Estimator */}
      <TaxEstimatorCard
        grossIncome={totalIncome}
        filingStatus={settings.filing_status}
        estimatedDeductions={settings.estimated_deductions}
        onFilingStatusChange={v => setSettings(s => ({ ...s, filing_status: v }))}
        onDeductionsChange={v => setSettings(s => ({ ...s, estimated_deductions: v }))}
        totalReserve={totalSetAside}
        quarterlyIncome={quarterlyIncome}
      />

      {/* Section C: Quarterly Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Quarterly Timeline</CardTitle>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>{[currentYear - 1, currentYear, currentYear + 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {quarterStatuses.map(qs => {
            const qi = quarterlyIncome.find(q => q.quarter === qs.quarter);
            const eqp = estimatedQuarterly.find(q => q.quarter === qs.quarter);
            const isPast = new Date(qs.due_date) < new Date();
            const isCurrentQ = selectedYear === currentYear && qs.quarter === currentQuarter;

            return (
              <div key={qs.quarter} className={`rounded-lg border p-4 space-y-3 ${isCurrentQ ? 'border-primary/30 bg-primary/5' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCurrentQ && <Badge variant="default" className="text-[10px] px-1.5 py-0">Current</Badge>}
                    <p className="font-medium">Q{qs.quarter} — Due {new Date(qs.due_date).toLocaleDateString()}</p>
                    {isPast && qs.status !== 'paid' && (
                      <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Past due</span>
                    )}
                  </div>
                  <Badge variant={qs.status === 'paid' ? 'default' : 'secondary'}>
                    {STATUS_OPTIONS.find(o => o.value === qs.status)?.label || qs.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <p className="text-muted-foreground">Income: <span className="font-medium text-foreground">${(qi?.income || 0).toLocaleString()}</span></p>
                  <p className="text-muted-foreground">Est. Payment: <span className="font-medium text-foreground">${(eqp?.installmentPayment || 0).toLocaleString()}</span></p>
                  <div className="flex gap-2 items-center justify-end">
                    <Select value={qs.status} onValueChange={v => setQuarterStatuses(prev => prev.map(q => q.quarter === qs.quarter ? { ...q, status: v } : q))}>
                      <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => saveQuarterStatus(qs)}>Save</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Section D: Reserve Preference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Reserve Preference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={settings.set_aside_mode} onValueChange={v => setSettings(s => ({ ...s, set_aside_mode: v as any }))} className="flex gap-4">
            <div className="flex items-center gap-1.5"><RadioGroupItem value="percent" id="tc-pct" /><Label htmlFor="tc-pct" className="text-sm">% of paid income</Label></div>
            <div className="flex items-center gap-1.5"><RadioGroupItem value="fixed" id="tc-fix" /><Label htmlFor="tc-fix" className="text-sm">Fixed $/month</Label></div>
          </RadioGroup>
          <div className="flex gap-4">
            {settings.set_aside_mode === 'percent' ? (
              <div className="w-40"><Label>Percent (%)</Label><Input type="number" min={0} max={100} value={settings.set_aside_percent} onChange={e => setSettings(s => ({ ...s, set_aside_percent: Number(e.target.value) }))} /></div>
            ) : (
              <div className="w-40"><Label>Monthly ($)</Label><Input type="number" min={0} value={settings.set_aside_fixed_monthly} onChange={e => setSettings(s => ({ ...s, set_aside_fixed_monthly: Number(e.target.value) }))} /></div>
            )}
          </div>
          <Button size="sm" onClick={saveSettings}>Save</Button>
        </CardContent>
      </Card>

      {/* Section E: Deductions & Write-Offs */}
      <Collapsible open={deductionsOpen} onOpenChange={setDeductionsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Folder className="h-4 w-4" /> Deductions & Write-Offs</CardTitle>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${deductionsOpen ? '' : '-rotate-90'}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {deductions.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">No categories tracked yet. Load relief-specific defaults to get started.</p>
                  <Button onClick={seedDeductions}>Load Default Categories</Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {deductions.length} categories · ${totalDeductions.toLocaleString()} YTD
                    </p>
                    <Button size="sm" variant="outline" onClick={() => setShowAddDeduction(true)}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {deductions.map((cat, idx) => (
                      <div key={cat.id || cat.name} className="rounded-lg border p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{cat.name}</p>
                          <div className="flex items-center gap-1">
                            <Badge variant={cat.documentation_status === 'cpa_ready' ? 'default' : 'secondary'} className="text-xs">
                              {cat.documentation_status === 'cpa_ready' ? 'Ready' : 'Review'}
                            </Badge>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeductionEditIndex(idx)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">${cat.ytd_amount.toLocaleString()}</span>
                          <span className="text-muted-foreground text-xs">{cat.receipt_completeness_percent}% docs</span>
                        </div>
                        <Progress value={cat.receipt_completeness_percent} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Section F: Tax Readiness Checklist */}
      <Collapsible open={readinessOpen} onOpenChange={setReadinessOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Tax Readiness Checklist</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{completedCount} of {activeChecklist.length} complete</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">{readinessPercent}%</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${readinessOpen ? '' : '-rotate-90'}`} />
                </div>
              </div>
              <Progress value={readinessPercent} className="mt-2" />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-1">
              {checklist.map((item, i) => {
                if (item.ignored) {
                  return (
                    <div key={item.item_key} className="flex items-center gap-2 py-1 opacity-50">
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground line-through flex-1">{item.label}</span>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => toggleIgnore(i)}>Restore</Button>
                    </div>
                  );
                }
                const instruction = getInstruction(item.item_key);
                return (
                  <div key={item.item_key} className="rounded-md border px-3 py-2">
                    <div className="flex items-start gap-3">
                      <Checkbox checked={item.completed} onCheckedChange={() => toggleChecklist(i)} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <Label className={`text-sm cursor-pointer font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {item.label}
                        </Label>
                        {!item.completed && instruction && (
                          <p className="text-xs text-muted-foreground mt-1">{instruction}</p>
                        )}
                      </div>
                      {!item.completed && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs shrink-0" onClick={() => toggleIgnore(i)}>
                          <EyeOff className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Section F2: Entity Guidance */}
      <Collapsible open={guidanceOpen} onOpenChange={setGuidanceOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Entity Guidance & Key Concepts</CardTitle>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${guidanceOpen ? '' : '-rotate-90'}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {totalIncome > 80000 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 mb-4 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    Your YTD income is over $80K. S-Corp structure may be worth discussing with your CPA.
                  </p>
                </div>
              )}
              <GuidanceTab />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Section F3: CPA Prep */}
      <Collapsible open={cpaOpen} onOpenChange={setCpaOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> CPA Prep & Questions</CardTitle>
                <div className="flex items-center gap-2">
                  {cpaQuestions.filter(q => !q.resolved).length > 0 && (
                    <Badge variant="secondary" className="text-xs">{cpaQuestions.filter(q => !q.resolved).length} open</Badge>
                  )}
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${cpaOpen ? '' : '-rotate-90'}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-muted-foreground">Questions and summaries to take to your CPA.</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
                  <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
                </div>
              </div>

              {/* Summary strip */}
              <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="pt-3 pb-2 px-3"><p className="text-xs text-muted-foreground">YTD Income</p><p className="text-lg font-bold">${totalIncome.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="pt-3 pb-2 px-3"><p className="text-xs text-muted-foreground">Total Deductions</p><p className="text-lg font-bold">${totalDeductions.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="pt-3 pb-2 px-3"><p className="text-xs text-muted-foreground">Readiness</p><p className="text-lg font-bold">{readinessPercent}%</p></CardContent></Card>
              </div>

              {/* Questions list */}
              {cpaQuestions.length === 0 ? (
                <div className="text-center py-4">
                  <Button variant="outline" onClick={seedCpaQuestions}>Load Default CPA Questions</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {cpaQuestions.map((q, i) => (
                    <div key={i} className="flex items-start gap-3 py-1">
                      <Checkbox checked={q.resolved} onCheckedChange={() => toggleCpaQuestion(i)} className="mt-1" />
                      <p className={`text-sm flex-1 ${q.resolved ? 'line-through text-muted-foreground' : ''}`}>{q.question}</p>
                      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => removeCpaQuestion(i)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t">
                <Textarea value={newCpaQuestion} onChange={e => setNewCpaQuestion(e.target.value)} placeholder="Add a question for your CPA..." className="min-h-[50px]" />
                <Button size="sm" className="shrink-0 self-end" onClick={() => { if (newCpaQuestion.trim()) { addCpaQuestion(newCpaQuestion.trim()); setNewCpaQuestion(''); } }}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Section G: Ask Advisor */}
      <Collapsible open={advisorOpen} onOpenChange={setAdvisorOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Ask Tax Advisor</CardTitle>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${advisorOpen ? '' : '-rotate-90'}`} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">AI-powered guidance for locum-specific tax questions. Educational only.</p>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <AskAdvisorTab
                profile={advisorProfile}
                sessions={advisorSessions}
                onSaveSession={saveAdvisorSession}
                onSaveQuestion={saveAdvisorQuestion}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Deduction Edit Dialog */}
      <Dialog open={deductionEditIndex !== null} onOpenChange={() => setDeductionEditIndex(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{deductionEditIndex !== null ? deductions[deductionEditIndex]?.name : ''}</DialogTitle>
          </DialogHeader>
          {deductionEditIndex !== null && (
            <div className="space-y-4">
              <div><Label>YTD Amount ($)</Label><Input type="number" value={deductions[deductionEditIndex].ytd_amount} onChange={e => updateDeduction(deductionEditIndex, 'ytd_amount', Number(e.target.value))} /></div>
              <div>
                <Label>Documentation Status</Label>
                <Select value={deductions[deductionEditIndex].documentation_status} onValueChange={v => updateDeduction(deductionEditIndex, 'documentation_status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="needs_review">Needs Review</SelectItem>
                    <SelectItem value="cpa_ready">CPA-Ready</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Receipt Completeness (%)</Label><Input type="number" min={0} max={100} value={deductions[deductionEditIndex].receipt_completeness_percent} onChange={e => updateDeduction(deductionEditIndex, 'receipt_completeness_percent', Number(e.target.value))} /></div>
              <div><Label>Missing Documents Count</Label><Input type="number" min={0} value={deductions[deductionEditIndex].missing_docs_count} onChange={e => updateDeduction(deductionEditIndex, 'missing_docs_count', Number(e.target.value))} /></div>
              <div><Label>Notes for CPA</Label><Textarea value={deductions[deductionEditIndex].notes} onChange={e => updateDeduction(deductionEditIndex, 'notes', e.target.value)} placeholder="Flag questions about this category..." /></div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => { if (deductionEditIndex !== null) { saveDeduction(deductionEditIndex); setDeductionEditIndex(null); } }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Deduction Dialog */}
      <Dialog open={showAddDeduction} onOpenChange={setShowAddDeduction}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <div><Label>Category Name</Label><Input value={newDeductionName} onChange={e => setNewDeductionName(e.target.value)} placeholder="e.g. Professional memberships" /></div>
          <DialogFooter><Button onClick={() => { if (newDeductionName.trim()) { addDeduction(newDeductionName.trim()); setNewDeductionName(''); setShowAddDeduction(false); } }}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
