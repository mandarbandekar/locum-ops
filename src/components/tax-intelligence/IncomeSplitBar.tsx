interface Props {
  earned: number;
  projected: number;
}

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function IncomeSplitBar({ earned, projected }: Props) {
  const total = earned + projected;
  const earnedPct = total > 0 ? (earned / total) * 100 : 50;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[hsl(var(--chip-success-text))]">Earned: {fmt(earned)}</span>
        <span className="font-medium text-[hsl(var(--chip-info-text))]">Projected: {fmt(projected)}</span>
      </div>
      <div className="h-4 rounded-full overflow-hidden flex bg-muted">
        {earned > 0 && (
          <div
            className="bg-[hsl(var(--success))] transition-all duration-500"
            style={{ width: `${earnedPct}%` }}
          />
        )}
        {projected > 0 && (
          <div
            className="bg-[hsl(var(--info))] transition-all duration-500"
            style={{ width: `${100 - earnedPct}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>Income earned so far</span>
        <span>Income from scheduled shifts</span>
      </div>
    </div>
  );
}
