import { useTaxStrategies } from '@/hooks/useTaxStrategies';
import { getCombinedMarginalRate } from '@/lib/taxStrategies';
import { AlertTriangle, TrendingUp, Lightbulb } from 'lucide-react';
import StrategyCard from './StrategyCard';

export default function TaxStrategiesTab() {
  const {
    strategies, totalSavings, annualizedIncome, inputs,
    updateInputs, dismissStrategy, restoreStrategy, loading, paidShiftCount,
  } = useTaxStrategies();

  const combinedRate = getCombinedMarginalRate(annualizedIncome);

  if (loading) {
    return <p className="text-muted-foreground py-8 text-center">Loading…</p>;
  }

  // Gate: require 4 completed shifts
  if (paidShiftCount < 4) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="p-4 rounded-full bg-primary/10 mb-4">
          <Lightbulb className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Personalized Tax Strategy Unlocks After 4 Shifts</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Log at least 4 completed shifts so we can estimate your annualized income and generate
          personalized tax-saving strategies. You've completed {paidShiftCount} so far — {4 - paidShiftCount} more to go!
        </p>
        <div className="mt-4 flex gap-1">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-2 w-8 rounded-full ${i < paidShiftCount ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
      </div>
    );
  }

  const eligibleStrategies = strategies.filter(s => s.eligible && !s.dismissed);
  const ineligibleStrategies = strategies.filter(s => !s.eligible);
  const dismissedStrategies = strategies.filter(s => s.dismissed);

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          This tool provides educational tax estimates, not professional tax advice. Tax situations vary — consult a qualified CPA before making tax elections or entity structure changes.
        </p>
      </div>

      {/* Total Savings Banner */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
        <div>
          <p className="text-sm text-muted-foreground">Potential annual tax savings</p>
          <p className="text-3xl font-bold text-emerald-500">${totalSavings.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Based on ${Math.round(annualizedIncome).toLocaleString()} estimated annual income · {eligibleStrategies.length} strategies available
          </p>
        </div>
        <div className="p-3 rounded-full bg-emerald-500/10 hidden sm:block">
          <TrendingUp className="h-6 w-6 text-emerald-500" />
        </div>
      </div>

      {/* Eligible Strategies */}
      {eligibleStrategies.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Available Tax Strategies</h3>
          {eligibleStrategies.map(s => (
            <StrategyCard
              key={s.id}
              strategy={s}
              inputs={inputs}
              annualizedIncome={annualizedIncome}
              combinedRate={combinedRate}
              onUpdateInputs={updateInputs}
              onDismiss={dismissStrategy}
              onRestore={restoreStrategy}
            />
          ))}
        </div>
      )}

      {/* Not Yet Eligible */}
      {ineligibleStrategies.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Coming Soon — As Your Income Grows</h3>
          {ineligibleStrategies.map(s => (
            <StrategyCard
              key={s.id}
              strategy={s}
              inputs={inputs}
              annualizedIncome={annualizedIncome}
              combinedRate={combinedRate}
              onUpdateInputs={updateInputs}
              onDismiss={dismissStrategy}
              onRestore={restoreStrategy}
            />
          ))}
        </div>
      )}

      {/* Dismissed */}
      {dismissedStrategies.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Completed / Dismissed</h3>
          {dismissedStrategies.map(s => (
            <StrategyCard
              key={s.id}
              strategy={s}
              inputs={inputs}
              annualizedIncome={annualizedIncome}
              combinedRate={combinedRate}
              onUpdateInputs={updateInputs}
              onDismiss={dismissStrategy}
              onRestore={restoreStrategy}
            />
          ))}
        </div>
      )}
    </div>
  );
}
