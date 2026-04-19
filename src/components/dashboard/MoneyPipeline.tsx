import { ChevronRight } from 'lucide-react';

export interface PipelineStage {
  key: string;
  label: string;
  amount: number;
  count: number;
  countLabel: string; // "shifts" | "invoices" | "payments"
  subLabel?: string; // e.g. "due this week", "this month"
  topBorderColor: string;
  tintBg?: boolean;
  tintColor?: string;
}

interface MoneyPipelineProps {
  stages: PipelineStage[];
  quarter: number;
  quarterEarnings: number;
  shiftsThisQuarter: number;
  avgPerShift: number;
  onStageClick?: (key: string) => void;
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function MoneyPipeline({
  stages, quarter, quarterEarnings, shiftsThisQuarter, avgPerShift, onStageClick,
}: MoneyPipelineProps) {
  return (
    <section>
      {/* Header */}
      <div className="mb-3">
        <h2
          className="font-semibold text-foreground"
          style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', fontSize: '18px' }}
        >
          Money Pipeline
        </h2>
        <p className="text-[13px] mt-0.5" style={{ color: '#6B7280' }}>
          Track every dollar from shift to bank account
        </p>
      </div>

      {/* Pipeline cards */}
      <div className="flex md:grid md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] gap-3 md:gap-2 items-stretch overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-2 md:pb-0">
        {stages.map((s, i) => {
          const isEmpty = s.amount === 0 && s.count === 0;
          return (
            <div key={s.key} className="contents">
              <div
                role={onStageClick ? 'button' : undefined}
                tabIndex={onStageClick ? 0 : undefined}
                onClick={onStageClick ? () => onStageClick(s.key) : undefined}
                onKeyDown={onStageClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStageClick(s.key); } } : undefined}
                className={`snap-start shrink-0 md:shrink min-w-[160px] md:min-w-0 bg-card rounded-lg shadow-sm border-t-4 p-5 flex flex-col transition-all duration-150 ${onStageClick ? 'cursor-pointer hover:shadow-md md:hover:scale-[1.02]' : ''}`}
                style={{
                  borderTopColor: s.topBorderColor,
                  backgroundColor: s.tintBg && s.amount > 0 ? `${s.tintColor}0D` : undefined,
                }}
              >
                <p
                  className="text-[11px] font-semibold uppercase mb-2"
                  style={{ letterSpacing: '0.05em', color: '#6B7280' }}
                >
                  {s.label}
                </p>
                <p
                  className={`text-[24px] font-semibold leading-tight ${isEmpty ? 'text-muted-foreground/60' : 'text-foreground'}`}
                  style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}
                >
                  {fmt(s.amount)}
                </p>
                <p className="text-[13px] mt-1" style={{ color: '#6B7280' }}>
                  {isEmpty ? '—' : `${s.count} ${s.countLabel}`}
                  {s.subLabel && !isEmpty && (
                    <span className="block text-[11px] mt-0.5">{s.subLabel}</span>
                  )}
                </p>
              </div>
              {i < stages.length - 1 && (
                <div className="hidden md:flex items-center justify-center">
                  <ChevronRight className="h-5 w-5" style={{ color: '#D1D5DB' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* This Quarter row */}
      <div
        className="mt-4 flex flex-col md:flex-row md:items-center md:justify-center gap-1 md:gap-3 text-[13px] text-center"
        style={{ color: '#6B7280' }}
      >
        <span>Q{quarter} Earnings: <span className="font-medium text-foreground/80">{fmt(quarterEarnings)}</span></span>
        <span className="hidden md:inline">·</span>
        <span>Shifts Completed: <span className="font-medium text-foreground/80">{shiftsThisQuarter}</span></span>
        <span className="hidden md:inline">·</span>
        <span>Avg per Shift: <span className="font-medium text-foreground/80">{fmt(avgPerShift)}</span></span>
      </div>
    </section>
  );
}
