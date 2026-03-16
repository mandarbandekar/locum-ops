import { TaxDisclaimerBanner } from '@/components/tax-strategy/TaxDisclaimer';
import TrackerTab from '@/components/tax-strategy/TrackerTab';

export default function TaxStrategyPage() {
  return (
    <div className="space-y-6">
      <TaxDisclaimerBanner />
      <TrackerTab />
    </div>
  );
}
