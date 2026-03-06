import { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Download, DollarSign, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import {
  aggregateQuarterlyIncome,
  calculateSetAside,
  getDefaultDueDates,
  generateTaxExportCSV,
} from '@/lib/taxCalculations';

const db = (table: string) => supabase.from(table as any);

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not started' },
  { value: 'discussed', label: 'Discussed with accountant' },
  { value: 'scheduled', label: 'Payment scheduled' },
  { value: 'paid', label: 'Paid' },
];

const DISCLAIMER_TEXT =
  'LocumOps does not provide tax, legal, or financial advice. Estimates shown are based only on information you enter and income you track in the app. Always verify due dates and amounts with a qualified tax professional.';

const BANNER_TEXT =
  'Not tax advice. LocumOps provides tracking tools and reminders only. Tax rules vary by state and situation. Please confirm due dates and amounts with your accountant or tax professional.';

interface TaxSettings {
  id?: string;
  tax_year: number;
  filing_type_label: string;
  state_label: string;
  set_aside_mode: 'percent' | 'fixed';
  set_aside_percent: number;
  set_aside_fixed_monthly: number;
  disclaimer_accepted_at: string | null;
}

interface QuarterStatus {
  id?: string;
  quarter: number;
  tax_year: number;
  due_date: string;
  status: string;
  notes: string;
}

export default function TaxesPage() {
  const { invoices } = useData();
  const { user, isDemo } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showFirstUseModal, setShowFirstUseModal] = useState(false);
  const [accountantConfirmed, setAccountantConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState<TaxSettings>({
    tax_year: currentYear,
    filing_type_label: '',
    state_label: '',
    set_aside_mode: 'percent',
    set_aside_percent: 30,
    set_aside_fixed_monthly: 0,
    disclaimer_accepted_at: null,
  });

  const [quarterStatuses, setQuarterStatuses] = useState<QuarterStatus[]>([]);

  const defaultDueDates = useMemo(() => getDefaultDueDates(selectedYear), [selectedYear]);

  // Load data
  useEffect(() => {
    if (isDemo) {
      // Demo mode: use defaults
      const defaults = getDefaultDueDates(selectedYear);
      setQuarterStatuses([1, 2, 3, 4].map((q) => ({
        quarter: q, tax_year: selectedYear, due_date: defaults[q], status: 'not_started', notes: '',
      })));
      setSettings((s) => ({ ...s, tax_year: selectedYear, disclaimer_accepted_at: null }));
      setLoading(false);
      setShowFirstUseModal(true);
      return;
    }
    if (!user) return;
    loadData();
  }, [selectedYear, user?.id, isDemo]);

  async function loadData() {
    setLoading(true);
    try {
      // Load settings
      const { data: settingsData } = await db('tax_settings')
        .select('*')
        .eq('tax_year', selectedYear)
        .maybeSingle();

      if (settingsData) {
        setSettings({
          id: settingsData.id,
          tax_year: settingsData.tax_year,
          filing_type_label: settingsData.filing_type_label,
          state_label: settingsData.state_label,
          set_aside_mode: settingsData.set_aside_mode,
          set_aside_percent: Number(settingsData.set_aside_percent),
          set_aside_fixed_monthly: Number(settingsData.set_aside_fixed_monthly),
          disclaimer_accepted_at: settingsData.disclaimer_accepted_at,
        });
        if (!settingsData.disclaimer_accepted_at) {
          setShowFirstUseModal(true);
        }
      } else {
        setSettings({
          tax_year: selectedYear,
          filing_type_label: '',
          state_label: '',
          set_aside_mode: 'percent',
          set_aside_percent: 30,
          set_aside_fixed_monthly: 0,
          disclaimer_accepted_at: null,
        });
        setShowFirstUseModal(true);
      }

      // Load quarter statuses
      const { data: qsData } = await db('tax_quarter_statuses')
        .select('*')
        .eq('tax_year', selectedYear)
        .order('quarter');

      if (qsData && qsData.length > 0) {
        setQuarterStatuses(qsData.map((r: any) => ({
          id: r.id, quarter: r.quarter, tax_year: r.tax_year,
          due_date: r.due_date, status: r.status, notes: r.notes,
        })));
      } else {
        const defaults = getDefaultDueDates(selectedYear);
        setQuarterStatuses([1, 2, 3, 4].map((q) => ({
          quarter: q, tax_year: selectedYear, due_date: defaults[q], status: 'not_started', notes: '',
        })));
      }
    } catch (err) {
      console.error('Failed to load tax data', err);
    } finally {
      setLoading(false);
    }
  }

  // Accept disclaimer
  async function acceptDisclaimer() {
    const now = new Date().toISOString();
    const newSettings = { ...settings, disclaimer_accepted_at: now };
    setSettings(newSettings);
    setShowFirstUseModal(false);
    console.log('tax_disclaimer_accepted', { year: selectedYear });

    if (!isDemo && user) {
      if (settings.id) {
        await db('tax_settings').update({ disclaimer_accepted_at: now }).eq('id', settings.id);
      } else {
        const { data } = await db('tax_settings')
          .insert({ user_id: user.id, ...newSettings })
          .select()
          .single();
        if (data) setSettings((s) => ({ ...s, id: data.id }));
      }
    }
  }

  // Save settings
  async function saveSettings() {
    console.log('tax_settings_saved', { year: selectedYear, mode: settings.set_aside_mode });
    toast.success('Tax settings saved');

    if (isDemo) return;
    if (!user) return;

    if (settings.id) {
      await db('tax_settings').update({
        filing_type_label: settings.filing_type_label,
        state_label: settings.state_label,
        set_aside_mode: settings.set_aside_mode,
        set_aside_percent: settings.set_aside_percent,
        set_aside_fixed_monthly: settings.set_aside_fixed_monthly,
      }).eq('id', settings.id);
    } else {
      const { data } = await db('tax_settings')
        .insert({ user_id: user.id, ...settings })
        .select()
        .single();
      if (data) setSettings((s) => ({ ...s, id: data.id }));
    }
  }

  // Save quarter status
  async function saveQuarterStatus(qs: QuarterStatus) {
    console.log('tax_quarter_saved', { year: selectedYear, quarter: qs.quarter, status: qs.status });
    toast.success(`Q${qs.quarter} status saved`);

    if (isDemo || !user) return;

    if (qs.id) {
      await db('tax_quarter_statuses').update({
        due_date: qs.due_date, status: qs.status, notes: qs.notes,
      }).eq('id', qs.id);
    } else {
      const { data } = await db('tax_quarter_statuses')
        .insert({ user_id: user.id, tax_year: selectedYear, quarter: qs.quarter, due_date: qs.due_date, status: qs.status, notes: qs.notes })
        .select()
        .single();
      if (data) {
        setQuarterStatuses((prev) =>
          prev.map((q) => (q.quarter === qs.quarter ? { ...q, id: data.id } : q))
        );
      }
    }
  }

  // Computed data
  const quarterlyIncome = useMemo(
    () => aggregateQuarterlyIncome(invoices, selectedYear),
    [invoices, selectedYear]
  );

  const setAsideData = useMemo(
    () =>
      calculateSetAside(
        quarterlyIncome,
        settings.set_aside_mode,
        settings.set_aside_percent,
        settings.set_aside_fixed_monthly
      ),
    [quarterlyIncome, settings.set_aside_mode, settings.set_aside_percent, settings.set_aside_fixed_monthly]
  );

  const totalIncome = quarterlyIncome.reduce((s, q) => s + q.income, 0);
  const totalSetAside = setAsideData.reduce((s, q) => s + q.amount, 0);

  // Update quarter status locally
  const updateQS = useCallback(
    (quarter: number, field: keyof QuarterStatus, value: string) => {
      setQuarterStatuses((prev) =>
        prev.map((q) => (q.quarter === quarter ? { ...q, [field]: value } : q))
      );
    },
    []
  );

  // Export CSV
  function exportCSV() {
    const csv = generateTaxExportCSV(
      selectedYear,
      quarterlyIncome,
      setAsideData,
      settings.set_aside_mode,
      settings.set_aside_percent,
      settings.set_aside_fixed_monthly,
      quarterStatuses
    );
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LocumOps_Tax_Summary_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('tax_export_csv', { year: selectedYear });
    toast.success('CSV exported');
  }

  const disclaimerAccepted = !!settings.disclaimer_accepted_at;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading tax tracker…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* First-use modal */}
      <Dialog open={showFirstUseModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Important Disclaimer
            </DialogTitle>
            <DialogDescription className="text-left pt-2">
              {DISCLAIMER_TEXT}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={acceptDisclaimer}>I Understand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page header */}
      <div className="page-header flex-col sm:flex-row gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Estimated Tax Tracker
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV} disabled={!disclaimerAccepted}>
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export for accountant</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Disclaimer banner */}
      <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
          {BANNER_TEXT}
        </AlertDescription>
      </Alert>

      {disclaimerAccepted && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">Paid Income ({selectedYear})</p>
                <p className="text-xl font-bold">${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">Est. Set-Aside</p>
                <p className="text-xl font-bold">${totalSetAside.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">Mode</p>
                <p className="text-xl font-bold">
                  {settings.set_aside_mode === 'percent' ? `${settings.set_aside_percent}%` : `$${settings.set_aside_fixed_monthly}/mo`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">Invoices Paid</p>
                <p className="text-xl font-bold">
                  {invoices.filter((i) => i.status === 'paid' && i.paid_at && new Date(i.paid_at).getFullYear() === selectedYear).length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Set-aside preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Set-Aside Preference
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={settings.set_aside_mode}
                onValueChange={(v) => setSettings((s) => ({ ...s, set_aside_mode: v as 'percent' | 'fixed' }))}
                className="flex flex-col sm:flex-row gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percent" id="mode-percent" />
                  <Label htmlFor="mode-percent">Percent of paid income</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="mode-fixed" />
                  <Label htmlFor="mode-fixed">Fixed $ per month</Label>
                </div>
              </RadioGroup>

              <div className="flex flex-col sm:flex-row gap-4">
                {settings.set_aside_mode === 'percent' ? (
                  <div className="flex-1">
                    <Label>Percent (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={settings.set_aside_percent}
                      onChange={(e) => setSettings((s) => ({ ...s, set_aside_percent: Number(e.target.value) }))}
                    />
                  </div>
                ) : (
                  <div className="flex-1">
                    <Label>Monthly amount ($)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={settings.set_aside_fixed_monthly}
                      onChange={(e) => setSettings((s) => ({ ...s, set_aside_fixed_monthly: Number(e.target.value) }))}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <Label>Filing type (optional label)</Label>
                  <Input
                    placeholder="e.g. 1099, S-Corp"
                    value={settings.filing_type_label}
                    onChange={(e) => setSettings((s) => ({ ...s, filing_type_label: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <Label>State (optional label)</Label>
                  <Input
                    placeholder="e.g. California"
                    value={settings.state_label}
                    onChange={(e) => setSettings((s) => ({ ...s, state_label: e.target.value }))}
                  />
                </div>
              </div>

              <Button onClick={saveSettings} size="sm">Save Preferences</Button>
            </CardContent>
          </Card>

          {/* Quarterly table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quarterly Estimated Tax Tracker</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quarterlyIncome.map((q) => {
                  const sa = setAsideData.find((s) => s.quarter === q.quarter);
                  const qs = quarterStatuses.find((s) => s.quarter === q.quarter);
                  if (!qs) return null;

                  return (
                    <Card key={q.quarter} className="border">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h3 className="font-semibold">{q.label}</h3>
                          <Badge variant={qs.status === 'paid' ? 'default' : 'secondary'}>
                            {STATUS_OPTIONS.find((o) => o.value === qs.status)?.label ?? qs.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground block">Paid Income</span>
                            <span className="font-medium">${q.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Set-Aside</span>
                            <span className="font-medium">${(sa?.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs">Due Date</Label>
                            <Input
                              type="date"
                              value={qs.due_date}
                              onChange={(e) => updateQS(q.quarter, 'due_date', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs">Status</Label>
                            <Select
                              value={qs.status}
                              onValueChange={(v) => updateQS(q.quarter, 'status', v)}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Monthly breakdown */}
                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Monthly breakdown
                          </summary>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {q.monthlyBreakdown.map((m) => (
                              <div key={m.month} className="text-xs">
                                <span className="text-muted-foreground">{m.monthLabel}:</span>{' '}
                                <span className="font-medium">${m.income.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </details>

                        <div>
                          <Label className="text-xs text-muted-foreground">Notes</Label>
                          <Textarea
                            rows={2}
                            value={qs.notes}
                            onChange={(e) => updateQS(q.quarter, 'notes', e.target.value)}
                            placeholder="Notes for your accountant…"
                            className="text-sm"
                          />
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => saveQuarterStatus(qs)}
                        >
                          Save Q{q.quarter}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="mt-4 flex items-start gap-2">
                <Checkbox
                  id="accountant-confirm"
                  checked={accountantConfirmed}
                  onCheckedChange={(v) => setAccountantConfirmed(!!v)}
                />
                <Label htmlFor="accountant-confirm" className="text-sm text-muted-foreground leading-snug">
                  I will confirm due dates and amounts with my accountant.
                </Label>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
