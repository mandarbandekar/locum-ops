import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import TaxProfileSetup from '@/components/tax-intelligence/TaxProfileSetup';
import TaxDashboard from '@/components/tax-intelligence/TaxDashboard';
import TaxProjectionDisplay, { daysPerWeekToIndex, indexToDaysPerWeek } from '@/components/tax-intelligence/TaxProjectionDisplay';
import { useTaxIntelligence } from '@/hooks/useTaxIntelligence';
import { useData } from '@/contexts/DataContext';
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
  const { shifts } = useData();
  const [setupOpen, setSetupOpen] = useState(false);

  // Schedule selector state — initialized from DB profile
  const savedDays = (taxProfile as any)?.typical_days_per_week;
  const [scheduleIndex, setScheduleIndex] = useState(savedDays ? daysPerWeekToIndex(savedDays) : 1);

  // Sync from DB when profile loads
  useEffect(() => {
    if (savedDays) setScheduleIndex(daysPerWeekToIndex(savedDays));
  }, [savedDays]);

  const handleScheduleChange = (index: number) => {
    setScheduleIndex(index);
    const days = indexToDaysPerWeek(index);
    saveProfile({ typical_days_per_week: days } as any);
  };

  // Derive day rate from shifts or profile
  const dayRate = useMemo(() => {
    if (shifts.length > 0) {
      const rates = shifts.map(s => s.rate_applied).filter(r => r > 0);
      if (rates.length > 0) return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
    }
    if (taxProfile?.annual_relief_income) {
      // Rough estimate: annual / 240 as a baseline
      return Math.round(taxProfile.annual_relief_income / 240);
    }
    return 650;
  }, [shifts, taxProfile?.annual_relief_income]);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (loading) {
    return <p className="text-muted-foreground py-8 text-center">Loading…</p>;
  }

  // If no full tax profile yet, show the projection display with schedule selector
  if (!hasProfile) {
    return (
      <div className="space-y-6">
        {/* Setup wizard modal */}
        <TaxProfileSetup
          open={setupOpen}
          onOpenChange={setSetupOpen}
          existingProfile={taxProfile}
          onSave={saveProfile}
        />

        {shifts.length > 0 ? (
          <>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground">Your tax snapshot</h2>
              <p className="text-sm text-muted-foreground">
                Here's what your quarter looks like if you keep this pace. Refines as you log more shifts.
              </p>
            </div>
            <TaxProjectionDisplay
              dayRate={dayRate}
              timezone={timezone}
              selectedScheduleIndex={scheduleIndex}
              onScheduleChange={handleScheduleChange}
              defaultExpanded={true}
              variant="page"
            />
            <Button onClick={() => setSetupOpen(true)} variant="outline" className="w-full gap-2">
              <Sparkles className="h-4 w-4" />
              Complete full tax profile for personalized estimates
            </Button>
          </>
        ) : (
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
        )}
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
      />
    </div>
  );
}
