import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import TaxProfileSetup from '@/components/tax-intelligence/TaxProfileSetup';
import TaxDashboard from '@/components/tax-intelligence/TaxDashboard';
import { useTaxIntelligence } from '@/hooks/useTaxIntelligence';
import { useData } from '@/contexts/DataContext';
import { posthog } from '@/lib/posthog';
import { calculateTaxV1, mapDbProfileToV1 } from '@/lib/taxCalculatorV1';
import type { TaxAdvisorProfile, TaxAdvisorSession, SavedTaxQuestion } from '@/hooks/useTaxAdvisor';

interface Props {
  profile: TaxAdvisorProfile | null;
  sessions: TaxAdvisorSession[];
  scorpResult: any;
  onSaveSession: (prompt: string, response: string, title?: string) => Promise<TaxAdvisorSession | null>;
  onSaveQuestion: (q: string, topic: string, sessionId?: string) => Promise<void>;
  onSaveScorpResult: (result: any) => Promise<void>;
}

export default function TaxEstimateTab({
  profile: advisorProfile, sessions, scorpResult,
  onSaveSession, onSaveQuestion, onSaveScorpResult,
}: Props) {
  const { profile: taxProfile, loading, saveProfile, hasProfile } = useTaxIntelligence();
  const { shifts, facilities } = useData();
  const [setupOpen, setSetupOpen] = useState(false);
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasProfile || !taxProfile) return;
    if (trackedRef.current === taxProfile.id) return;
    trackedRef.current = taxProfile.id;
    try {
      if (typeof posthog !== 'undefined') {
        let quarterly = 0;
        try {
          const v1 = mapDbProfileToV1(taxProfile as any, { shifts, facilities, today: new Date() });
          const result = calculateTaxV1(v1);
          quarterly = Number(result?.quarterlyPayment) || 0;
        } catch { /* ignore calc errors */ }
        const filing = taxProfile.filing_status || 'single';
        const entity = taxProfile.entity_type === 's_corp' ? 's_corp' : 'schedule_c';
        const isFirstView = !sessionStorage.getItem('ph_tax_estimate_viewed');
        if (isFirstView) sessionStorage.setItem('ph_tax_estimate_viewed', '1');
        posthog.capture('tax_estimate_viewed', {
          is_first_view: isFirstView,
          estimated_quarterly_amount: quarterly,
          filing_status: filing,
          entity_type: entity,
        });
      }
    } catch { /* noop */ }
  }, [hasProfile, taxProfile]);

  if (loading) {
    return <p className="text-muted-foreground py-8 text-center">Loading…</p>;
  }

  if (!hasProfile) {
    return (
      <div className="space-y-6">
        <TaxProfileSetup
          open={setupOpen}
          onOpenChange={setSetupOpen}
          existingProfile={taxProfile}
          onSave={saveProfile}
        />
        <div className="text-center py-12 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Set Up Your Tax Profile</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Answer 8 quick questions about your tax situation so we can calculate your quarterly estimates, personalize your tax guidance, and track what you owe.
            </p>
          </div>
          <Button onClick={() => setSetupOpen(true)} size="lg" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Get Started
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TaxProfileSetup
        open={setupOpen}
        onOpenChange={setSetupOpen}
        existingProfile={taxProfile}
        onSave={saveProfile}
      />
      <TaxDashboard
        profile={taxProfile!}
        onEditProfile={() => setSetupOpen(true)}
        onSaveProfile={(updates) => saveProfile(updates as any)}
      />
    </div>
  );
}
