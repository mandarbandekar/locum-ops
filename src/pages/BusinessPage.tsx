import { BarChart3, Landmark, BrainCircuit, Receipt } from 'lucide-react';
import ReportsPage from '@/pages/ReportsPage';
import TaxStrategyPage from '@/pages/TaxStrategyPage';
import TaxPlanningAdvisorPage from '@/pages/TaxPlanningAdvisorPage';
import DeductionsTab from '@/components/tax-strategy/DeductionsTab';
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

      <div className="flex gap-2 sm:gap-3 flex-wrap">
        <button
          onClick={() => setSearchParams({ tab: 'reports' }, { replace: true })}
          className={`primary-tab-btn ${activeTab === 'reports' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Insights</span>
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'tax-reserve' }, { replace: true })}
          className={`primary-tab-btn ${activeTab === 'tax-reserve' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <Landmark className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Tax Reserve</span>
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'deductions' }, { replace: true })}
          className={`primary-tab-btn ${activeTab === 'deductions' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Deductions</span>
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'tax-planning' }, { replace: true })}
          className={`primary-tab-btn ${activeTab === 'tax-planning' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <BrainCircuit className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Tax Planning</span>
        </button>
      </div>

      {activeTab === 'reports' && <ReportsPage />}
      {activeTab === 'tax-reserve' && <TaxStrategyPage />}
      {activeTab === 'deductions' && <DeductionsTab />}
      {activeTab === 'tax-planning' && <TaxPlanningAdvisorPage />}
    </div>
  );
}
