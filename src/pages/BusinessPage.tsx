import { useMemo } from 'react';
import { Activity, Heart, BarChart3, Building2, Compass } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { Button } from '@/components/ui/button';
import FinancialHealthTab from '@/components/business/FinancialHealthTab';
import PerformanceInsightsTab from '@/components/business/PerformanceInsightsTab';
import ClinicScorecardTab from '@/components/business/ClinicScorecardTab';
import { SpotlightTour, TourStep } from '@/components/SpotlightTour';
import { useSpotlightTour } from '@/hooks/useSpotlightTour';

const BUSINESS_TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="business-financial"]',
    title: 'Financial Health',
    description: 'Revenue trends, payment aging, and cash flow analysis. See which months are strongest and spot slow-paying clinics.',
    placement: 'bottom',
    icon: Heart,
  },
  {
    targetSelector: '[data-tour="business-performance"]',
    title: 'Performance Insights',
    description: 'Shift frequency, average day rates, utilization metrics, and income-per-clinic breakdowns to optimize your schedule.',
    placement: 'bottom',
    icon: BarChart3,
  },
  {
    targetSelector: '[data-tour="business-scorecard"]',
    title: 'Clinic Scorecard',
    description: 'Rate each clinic on payment speed, reliability, and overall experience. Identify your most and least profitable relationships.',
    placement: 'bottom',
    icon: Building2,
  },
  {
    targetSelector: '[data-tour="business-header"]',
    title: 'Your Business Hub',
    description: 'Your back-office command center. Everything a relief vet needs to run their practice like a business — not just a gig.',
    placement: 'bottom',
    icon: Activity,
  },
];

export default function BusinessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'financial-health';
  const { invoices, shifts, facilities, lineItems } = useData();
  const businessTour = useSpotlightTour('locumops_tour_business');

  // Attention badges
  const badges = useMemo(() => {
    let financialAttention = false;
    let scorecardAttention = false;
    invoices.forEach(inv => {
      const status = computeInvoiceStatus(inv);
      if (status === 'overdue') financialAttention = true;
    });

    // Check if any facility has 3+ overdue
    const facilityOverdue: Record<string, number> = {};
    invoices.forEach(inv => {
      if (computeInvoiceStatus(inv) === 'overdue') {
        facilityOverdue[inv.facility_id] = (facilityOverdue[inv.facility_id] || 0) + 1;
      }
    });
    if (Object.values(facilityOverdue).some(c => c >= 3)) scorecardAttention = true;

    return { financialAttention, scorecardAttention };
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div className="page-header" data-tour="business-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="page-title">Business Insights</h1>
            <p className="page-subtitle">Your relief practice at a glance</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={businessTour.startTour}
            className="ml-auto gap-1.5 text-xs text-primary hover:bg-primary/10"
          >
            <Compass className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tour</span>
          </Button>
        </div>
      </div>

      <div className="flex gap-2 sm:gap-3 flex-wrap">
        <button
          data-tour="business-financial"
          onClick={() => setSearchParams({ tab: 'financial-health' }, { replace: true })}
          className={`primary-tab-btn relative ${activeTab === 'financial-health' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Financial Health</span>
          {badges.financialAttention && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive" />
          )}
        </button>
        <button
          data-tour="business-performance"
          onClick={() => setSearchParams({ tab: 'performance' }, { replace: true })}
          className={`primary-tab-btn ${activeTab === 'performance' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Performance Insights</span>
        </button>
        <button
          data-tour="business-scorecard"
          onClick={() => setSearchParams({ tab: 'scorecard' }, { replace: true })}
          className={`primary-tab-btn relative ${activeTab === 'scorecard' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Clinic Scorecard</span>
          {badges.scorecardAttention && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive" />
          )}
        </button>
      </div>

      {activeTab === 'financial-health' && <FinancialHealthTab />}
      {activeTab === 'performance' && <PerformanceInsightsTab />}
      {activeTab === 'scorecard' && <ClinicScorecardTab />}

      <SpotlightTour steps={BUSINESS_TOUR_STEPS} isOpen={businessTour.isOpen} onClose={businessTour.closeTour} />
    </div>
  );
}
