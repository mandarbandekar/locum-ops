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
  /** Optional one-line teaching description shown only in the first-time experience */
  description?: string;
}

interface MoneyPipelineProps {
  stages: PipelineStage[];
  quarter: number;
  quarterEarnings: number;
  shiftsThisQuarter: number;
  avgPerShift: number;
  onStageClick?: (key: string) => void;
  /** When provided, hides the default "Money Pipeline" header (caller renders its own). */
  hideHeader?: boolean;
  /** Stage key to apply a gentle pulse animation on the top border (first-time UX). */
  highlightStageKey?: string;
  /** Suffix appended to "$0" amounts (first-time UX), e.g. "so far". */
  zeroSuffix?: string;
  /** Stage key to render an extra teaching footnote under (first-time UX). */
  stageFootnoteKey?: string;
  stageFootnoteText?: string;
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function MoneyPipeline({
  stages, quarter, quarterEarnings, shiftsThisQuarter, avgPerShift, onStageClick,
  hideHeader, highlightStageKey, zeroSuffix, stageFootnoteKey, stageFootnoteText,
}: MoneyPipelineProps) {
  return (
    <section>
      {/* Header */}
      {!hideHeader && (
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
      )}

      {/* Pipeline cards */}
      <div className="flex md:grid md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] gap-3 md:gap-2 items-stretch overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-2 md:pb-0">
        {stages.map((s, i) => {
          const isEmpty = s.amount === 0 && s.count === 0;
          const isHighlighted = highlightStageKey === s.key;
          return (
            <div key={s.key} className="contents">
              <div
                role={onStageClick ? 'button' : undefined}
                tabIndex={onStageClick ? 0 : undefined}
                onClick={onStageClick ? () => onStageClick(s.key) : undefined}
                onKeyDown={onStageClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStageClick(s.key); } } : undefined}
                className={`relative snap-start shrink-0 md:shrink min-w-[160px] md:min-w-0 bg-card rounded-lg shadow-sm border-t-4 p-5 flex flex-col transition-all duration-150 ${onStageClick ? 'cursor-pointer hover:shadow-md md:hover:scale-[1.02]' : ''}`}
                style={{
                  borderTopColor: s.topBorderColor,
                  backgroundColor: s.tintBg && s.amount > 0 ? `${s.tintColor}0D` : undefined,
                }}
              >
                {isHighlighted && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -top-1 left-0 right-0 h-1 rounded-t-lg animate-pulse"
                    style={{ backgroundColor: s.topBorderColor, opacity: 0.5 }}
                  />
                )}
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
                  {isEmpty && zeroSuffix && (
                    <span className="text-[13px] font-normal ml-1 text-muted-foreground/70">
                      {zeroSuffix}
                    </span>
                  )}
                </p>
                <p className="text-[13px] mt-1" style={{ color: '#6B7280' }}>
                  {isEmpty ? '—' : `${s.count} ${s.countLabel}`}
                  {s.subLabel && !isEmpty && (
                    <span className="block text-[11px] mt-0.5">{s.subLabel}</span>
                  )}
                </p>
                {s.description && (
                  <p className="mt-2 text-[11px] italic" style={{ color: '#9CA3AF' }}>
                    {s.description}
                  </p>
                )}
                {stageFootnoteKey === s.key && stageFootnoteText && (
                  <p className="mt-1 text-[11px]" style={{ color: '#1A5C6B' }}>
                    {stageFootnoteText}
                  </p>
                )}
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
        <span>Q{quarter} Earnings: <span className="font-medium text-foreground/80">{quarterEarnings === 0 && zeroSuffix ? `${fmt(0)} ${zeroSuffix}` : fmt(quarterEarnings)}</span></span>
        <span className="hidden md:inline">·</span>
        <span>Shifts Completed: <span className="font-medium text-foreground/80">{shiftsThisQuarter}</span></span>
        <span className="hidden md:inline">·</span>
        <span>Avg per Shift: <span className="font-medium text-foreground/80">{fmt(avgPerShift)}</span></span>
      </div>
    </section>
  );
}
