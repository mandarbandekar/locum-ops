import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseISO, isWithinInterval, differenceInMinutes } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useData } from '@/contexts/DataContext';
import { getEffectiveEngagement } from '@/lib/engagementOptions';

interface Props {
  rangeStart: Date;
  rangeEnd: Date;
}

const PALETTE = [
  'hsl(142, 71%, 45%)',
  'hsl(215, 80%, 55%)',
  'hsl(280, 65%, 60%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 55%)',
  'hsl(180, 60%, 45%)',
  'hsl(25, 85%, 55%)',
  'hsl(260, 55%, 60%)',
  'hsl(160, 65%, 42%)',
];

const fmtCurrency = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function IncomeBySource({ rangeStart, rangeEnd }: Props) {
  const navigate = useNavigate();
  const { shifts, facilities } = useData();

  const { segments, rateRows, distinctCount, hasAnyShifts, hasThirdParty } = useMemo(() => {
    const facilitiesById = new Map(facilities.map((f) => [f.id, f]));

    type Bucket = { key: string; label: string; earnings: number; minutes: number; shiftCount: number };
    const buckets = new Map<string, Bucket>();
    let totalShifts = 0;
    let thirdPartySeen = false;

    shifts.forEach((shift) => {
      const start = parseISO(shift.start_datetime);
      if (!isWithinInterval(start, { start: rangeStart, end: rangeEnd })) return;
      const facility = facilitiesById.get(shift.facility_id);
      if (!facility) return;
      totalShifts++;

      const eff = getEffectiveEngagement(shift, facility);
      let key: string;
      let label: string;
      if (eff.engagement_type === 'direct') {
        key = 'direct::all';
        label = 'Direct clinics';
      } else {
        thirdPartySeen = true;
        const source = (eff.source_name || '').trim() || 'Platform';
        key = `${eff.engagement_type}::${source.toLowerCase()}`;
        label = source;
      }

      const earnings = shift.rate_applied || 0;
      const end = parseISO(shift.end_datetime);
      const minutes = Math.max(0, differenceInMinutes(end, start));

      const existing = buckets.get(key);
      if (existing) {
        existing.earnings += earnings;
        existing.minutes += minutes;
        existing.shiftCount += 1;
      } else {
        buckets.set(key, { key, label, earnings, minutes, shiftCount: 1 });
      }
    });

    const all = Array.from(buckets.values()).filter((b) => b.earnings > 0 || b.shiftCount > 0);
    const totalEarnings = all.reduce((s, b) => s + b.earnings, 0);

    const segments = all
      .slice()
      .sort((a, b) => b.earnings - a.earnings)
      .map((b, i) => ({
        ...b,
        pct: totalEarnings > 0 ? (b.earnings / totalEarnings) * 100 : 0,
        color: PALETTE[i % PALETTE.length],
      }));

    const rateRows = all
      .filter((b) => b.shiftCount >= 2 && b.minutes > 0)
      .map((b) => ({
        label: b.label,
        avgHourly: b.earnings / (b.minutes / 60),
        shiftCount: b.shiftCount,
      }))
      .sort((a, b) => b.avgHourly - a.avgHourly);

    return {
      segments,
      rateRows,
      distinctCount: all.length,
      hasAnyShifts: totalShifts > 0,
      hasThirdParty: thirdPartySeen,
    };
  }, [shifts, facilities, rangeStart, rangeEnd]);

  // Hide the entire card for users who only work direct clinics — the source
  // breakdown is only meaningful when they have at least one Via Platform shift.
  if (!hasThirdParty) return null;

  const chartConfig = useMemo(() => {
    const cfg: Record<string, { label: string; color: string }> = {};
    segments.forEach((s) => {
      cfg[s.key] = { label: s.label, color: s.color };
    });
    return cfg;
  }, [segments]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Income by Source</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAnyShifts ? (
          <p className="text-sm text-muted-foreground text-center py-8">No shifts logged in this period.</p>
        ) : distinctCount === 1 ? (
          <div className="text-center py-6 px-4 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              As you categorize more of your facilities by platform or employer, you'll see income breakdowns and rate
              comparisons across your sources here. This is one of the clearest ways to see where your relief work is
              actually most profitable.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/facilities')}>
              Update a facility
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-[260px_1fr] items-center">
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, _name, item) => {
                          const seg = segments.find((s) => s.key === item?.payload?.key);
                          return (
                            <span className="flex items-center justify-between gap-3 w-full">
                              <span>{seg?.label}</span>
                              <span className="font-medium">
                                {fmtCurrency(Number(value))} ({seg?.pct.toFixed(1)}%)
                              </span>
                            </span>
                          );
                        }}
                      />
                    }
                  />
                  <Pie
                    data={segments}
                    dataKey="earnings"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {segments.map((s) => (
                      <Cell key={s.key} fill={s.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="space-y-1.5">
                {segments.map((s) => (
                  <div key={s.key} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.label}</span>
                    </div>
                    <div className="text-muted-foreground shrink-0">
                      <span className="font-medium text-foreground">{fmtCurrency(s.earnings)}</span>
                      <span className="ml-1.5">({s.pct.toFixed(1)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {rateRows.length > 0 && (
              <div className="mt-6">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Average Hourly Rate by Source
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Avg Hourly Rate</TableHead>
                      <TableHead className="text-right">Shifts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rateRows.map((r) => (
                      <TableRow key={r.label}>
                        <TableCell className="font-medium">{r.label}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          ${r.avgHourly.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/hr
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.shiftCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
