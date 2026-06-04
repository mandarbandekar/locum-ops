import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Expense } from '@/hooks/useExpenses';
import type { Facility } from '@/types';
import { filterMileageTrips, buildFilteredMileageCsv, buildFilteredMileagePdf, type MileageFilter } from '@/lib/mileageReportCsv';
import SectionExportMenu from '@/components/cpa-prep/SectionExportMenu';

interface Props {
  expenses: Expense[];
  facilities: Facility[];
  irsRateCents: number;
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function monthRange(year: number, monthIdx: number): { start: string; end: string; label: string } {
  const start = toYMD(new Date(year, monthIdx, 1));
  const end = toYMD(new Date(year, monthIdx + 1, 0));
  return { start, end, label: `${MONTHS_SHORT[monthIdx]} ${year}` };
}

type PresetKey = 'this-month' | 'last-month' | 'last-3-months' | 'ytd' | 'last-365' | 'last-year' | 'month' | 'custom';

function presetRange(key: PresetKey): { start: string; end: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (key === 'this-month') return monthRange(y, m);
  if (key === 'last-month') {
    const d = new Date(y, m - 1, 1);
    return monthRange(d.getFullYear(), d.getMonth());
  }
  if (key === 'last-3-months') {
    const start = toYMD(new Date(y, m - 2, 1));
    const end = toYMD(new Date(y, m + 1, 0));
    return { start, end, label: 'Last 3 months' };
  }
  if (key === 'ytd') {
    return { start: `${y}-01-01`, end: toYMD(now), label: `${y} YTD` };
  }
  if (key === 'last-365') {
    const d = new Date(now); d.setDate(d.getDate() - 364);
    return { start: toYMD(d), end: toYMD(now), label: 'Last 365 days' };
  }
  if (key === 'last-year') {
    return { start: `${y - 1}-01-01`, end: `${y - 1}-12-31`, label: `${y - 1}` };
  }
  return monthRange(y, m);
}

export default function MileageReportCard({ expenses, facilities, irsRateCents }: Props) {
  const now = new Date();
  const [preset, setPreset] = useState<PresetKey>('this-month');
  const [pickerYear, setPickerYear] = useState(now.getFullYear());
  const [pickerMonth, setPickerMonth] = useState<number>(now.getMonth());
  const [customStart, setCustomStart] = useState(`${now.getFullYear()}-01-01`);
  const [customEnd, setCustomEnd] = useState(toYMD(now));
  const [pickerMode, setPickerMode] = useState<'month' | 'custom'>('month');
  const [clinicIds, setClinicIds] = useState<string[] | null>(null);
  const [status, setStatus] = useState<'all' | 'confirmed' | 'draft'>('confirmed');
  const [open, setOpen] = useState(false);

  const range = useMemo(() => {
    if (preset === 'month') return monthRange(pickerYear, pickerMonth);
    if (preset === 'custom') {
      return { start: customStart, end: customEnd, label: `${customStart} → ${customEnd}` };
    }
    return presetRange(preset);
  }, [preset, pickerYear, pickerMonth, customStart, customEnd]);

  const filter: MileageFilter = { start: range.start, end: range.end, clinicIds, status };

  const trips = useMemo(
    () => filterMileageTrips(expenses, facilities, filter, irsRateCents),
    [expenses, facilities, filter.start, filter.end, clinicIds, status, irsRateCents]
  );

  const totalMiles = trips.reduce((s, t) => s + t.miles, 0);
  const totalDeduction = trips.reduce((s, t) => s + t.deductionCents, 0);

  // Clinics with any mileage (all-time) for filter options
  const clinicOptions = useMemo(() => {
    const ids = new Set<string>();
    expenses.forEach(e => { if ((e.mileage_miles || 0) > 0 && e.facility_id) ids.add(e.facility_id); });
    return facilities.filter(f => ids.has(f.id));
  }, [expenses, facilities]);

  const fmt$ = (c: number) => `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function handleDownload() {
    const csv = buildFilteredMileageCsv(trips, range.label, irsRateCents);
    const safe = range.label.replace(/[^\w-]+/g, '_');
    downloadBlob(csv, `mileage-report_${safe}.csv`, 'text/csv;charset=utf-8;');
  }

  function toggleClinic(id: string) {
    setClinicIds(prev => {
      const cur = prev ?? [];
      if (cur.includes(id)) {
        const next = cur.filter(x => x !== id);
        return next.length === 0 ? null : next;
      }
      return [...cur, id];
    });
  }

  const presetChips: { key: PresetKey; label: string }[] = [
    { key: 'this-month', label: 'This month' },
    { key: 'last-month', label: 'Last month' },
    { key: 'last-3-months', label: 'Last 3 months' },
    { key: 'ytd', label: 'Year to date' },
    { key: 'last-365', label: 'Last 365 days' },
    { key: 'last-year', label: 'Last year' },
  ];

  return (
    <Card>
      <CardContent className="py-4 px-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold">Mileage Report</h3>
            <p className="text-[11px] text-muted-foreground">Filter, review, and download detailed mileage for any period.</p>
          </div>
          <Button size="sm" onClick={handleDownload} disabled={trips.length === 0} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Download CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Date range */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {range.label}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[520px] p-0" align="start">
              <div className="flex">
                {/* Left: presets */}
                <div className="w-[160px] border-r border-border p-2 space-y-0.5">
                  {presetChips.map(p => (
                    <button
                      key={p.key}
                      onClick={() => { setPreset(p.key); }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors',
                        preset === p.key ? 'bg-muted font-medium' : 'hover:bg-muted/50'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {/* Right: month/custom */}
                <div className="flex-1 p-3">
                  <Tabs value={pickerMode} onValueChange={(v) => setPickerMode(v as any)}>
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="month">Month</TabsTrigger>
                      <TabsTrigger value="custom">Custom range</TabsTrigger>
                    </TabsList>
                    <TabsContent value="month" className="mt-3">
                      <div className="flex items-center justify-between mb-3">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPickerYear(y => y - 1)}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium">{pickerYear}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPickerYear(y => y + 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {MONTHS_SHORT.map((m, i) => {
                          const isFuture = pickerYear > now.getFullYear() || (pickerYear === now.getFullYear() && i > now.getMonth());
                          const selected = preset === 'month' && pickerMonth === i && pickerYear === pickerYear;
                          return (
                            <button
                              key={m}
                              disabled={isFuture}
                              onClick={() => { setPreset('month'); setPickerMonth(i); setOpen(false); }}
                              className={cn(
                                'h-9 rounded-full text-[13px] font-medium transition-colors',
                                isFuture ? 'text-muted-foreground/40 cursor-not-allowed' :
                                  selected ? 'bg-foreground text-background' : 'bg-muted hover:bg-muted/70'
                              )}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    </TabsContent>
                    <TabsContent value="custom" className="mt-3 space-y-3">
                      <div>
                        <Label className="text-xs">Start date</Label>
                        <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-9 mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">End date</Label>
                        <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-9 mt-1" />
                      </div>
                      <Button size="sm" className="w-full" onClick={() => { setPreset('custom'); setOpen(false); }}>
                        Apply
                      </Button>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Clinic filter */}
          {clinicOptions.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  {clinicIds == null ? 'All clinics' : `${clinicIds.length} clinic${clinicIds.length === 1 ? '' : 's'}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-1 max-h-72 overflow-auto">
                  <button
                    onClick={() => setClinicIds(null)}
                    className={cn('w-full text-left px-2 py-1.5 rounded text-[13px] hover:bg-muted', clinicIds == null && 'bg-muted font-medium')}
                  >
                    All clinics
                  </button>
                  {clinicOptions.map(f => {
                    const checked = clinicIds?.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        onClick={() => toggleClinic(f.id)}
                        className={cn('w-full text-left px-2 py-1.5 rounded text-[13px] hover:bg-muted flex items-center gap-2', checked && 'bg-muted font-medium')}
                      >
                        <span className={cn('h-3.5 w-3.5 rounded border border-border flex items-center justify-center', checked && 'bg-foreground border-foreground')}>
                          {checked && <span className="h-1.5 w-1.5 rounded-sm bg-background" />}
                        </span>
                        <span className="truncate">{f.name}</span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Status */}
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            {(['confirmed', 'draft', 'all'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  'px-3 py-1.5 text-[12px] capitalize transition-colors',
                  status === s ? 'bg-muted font-medium' : 'hover:bg-muted/50'
                )}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>

          {clinicIds != null && (
            <Button variant="ghost" size="sm" onClick={() => setClinicIds(null)} className="gap-1 text-muted-foreground">
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Trips</p>
            <p className="text-xl font-semibold tabular-nums">{trips.length}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Miles</p>
            <p className="text-xl font-semibold tabular-nums">{Math.round(totalMiles).toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Deduction</p>
            <p className="text-xl font-semibold tabular-nums text-green-600 dark:text-green-400">{fmt$(totalDeduction)}</p>
          </div>
        </div>

        {/* Table */}
        {trips.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
            No mileage in this range.
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 sticky top-0">
                  <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium">Date</th>
                    <th className="text-left px-3 py-2 font-medium">Clinic</th>
                    <th className="text-left px-3 py-2 font-medium">Route</th>
                    <th className="text-right px-3 py-2 font-medium">Miles</th>
                    <th className="text-right px-3 py-2 font-medium">Deduction</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((t, i) => (
                    <tr key={i} className="border-t border-border/60">
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                        {new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-3 py-2 truncate max-w-[180px]">{t.clinic}</td>
                      <td className="px-3 py-2 truncate max-w-[260px] text-muted-foreground">{t.description || '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{Math.round(t.miles * 10) / 10}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt$(t.deductionCents)}</td>
                      <td className="px-3 py-2">
                        <Badge variant={t.status === 'confirmed' ? 'secondary' : 'outline'} className="text-[10px] capitalize">
                          {t.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
