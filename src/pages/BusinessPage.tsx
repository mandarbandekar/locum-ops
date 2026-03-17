import { BarChart3, Landmark, BrainCircuit } from 'lucide-react';
import ReportsPage from '@/pages/ReportsPage';
import TaxStrategyPage from '@/pages/TaxStrategyPage';
import TaxPlanningAdvisorPage from '@/pages/TaxPlanningAdvisorPage';
import { useSearchParams } from 'react-router-dom';

export default function BusinessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'reports';

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="page-title">Business</h1>
            <p className="page-subtitle">Reports, analytics, and tax planning</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => setSearchParams({ tab: 'reports' }, { replace: true })}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border-2 font-semibold text-sm transition-all flex-1 sm:flex-none ${
            activeTab === 'reports'
              ? 'border-primary bg-primary/5 text-primary shadow-sm'
              : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/50'
          }`}
        >
          <BarChart3 className="h-5 w-5" />
          Reports
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'tax-strategy' }, { replace: true })}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border-2 font-semibold text-sm transition-all flex-1 sm:flex-none ${
            activeTab === 'tax-strategy'
              ? 'border-primary bg-primary/5 text-primary shadow-sm'
              : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/50'
          }`}
        >
          <Landmark className="h-5 w-5" />
          Estimated Tax Tracker
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'tax-advisor' }, { replace: true })}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border-2 font-semibold text-sm transition-all flex-1 sm:flex-none ${
            activeTab === 'tax-advisor'
              ? 'border-primary bg-primary/5 text-primary shadow-sm'
              : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/50'
          }`}
        >
          <BrainCircuit className="h-5 w-5" />
          Tax Planning Advisor
        </button>
      </div>

      {activeTab === 'reports' && <ReportsPage />}
      {activeTab === 'tax-strategy' && <TaxStrategyPage />}
      {activeTab === 'tax-advisor' && <TaxPlanningAdvisorPage />}
    </div>
  );
}
