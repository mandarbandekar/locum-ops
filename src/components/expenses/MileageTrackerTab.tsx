import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car, Route, ShieldCheck, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useData } from '@/contexts/DataContext';
import { MileageOnboarding } from './MileageOnboarding';
import { MileageReviewBanner } from './MileageReviewBanner';
import MileageBackfillCard from './MileageBackfillCard';
import MileageStartingBalanceDialog from './MileageStartingBalanceDialog';
import type { Expense } from '@/hooks/useExpenses';

const MILEAGE_ONBOARDING_KEY = 'locumops_mileage_tab_onboarding_dismissed';

interface Props {
  expenses: Expense[];
  config: { irs_mileage_rate_cents: number; tax_year: number };
  draftMileageExpenses: Expense[];
  confirmedMileageExpenses: Expense[];
  ytdMileageMiles: number;
  ytdMileageDeductionCents: number;
  startingMiles: number;
  startingMilesDeductionCents: number;
  startingMilesNote: string;
  updateMileageStartingBalance: (miles: number, note: string) => Promise<void> | void;
  confirmMileage: (id: string) => Promise<void>;
  dismissMileage: (id: string) => Promise<void>;
  confirmAllMileage: () => Promise<void>;
  editExpense: (id: string, data: Partial<Expense>) => Promise<any>;
  reload: () => void;
}

export default function MileageTrackerTab({
  config, draftMileageExpenses, confirmedMileageExpenses,
  ytdMileageMiles, ytdMileageDeductionCents,
  startingMiles, startingMilesNote, updateMileageStartingBalance,
  confirmMileage, dismissMileage, confirmAllMileage, reload,
}: Props) {
  const navigate = useNavigate();
  const { profile: userProfile } = useUserProfile();
  const { facilities } = useData();
  const [showStartingDialog, setShowStartingDialog] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem(MILEAGE_ONBOARDING_KEY)
  );

  const facilityMap = useMemo(() => {
    const m: Record<string, string> = {};
    facilities.forEach(f => { m[f.id] = f.name; });
    return m;
  }, [facilities]);

  const homeAddressSet = !!(userProfile as any)?.home_address;
  const irsRate = config.irs_mileage_rate_cents;
  const fmt = (cents: number) => '$' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const thisMonthCents = useMemo(() => {
    const now = new Date();
    return confirmedMileageExpenses
      .filter(e => {
        const d = new Date(e.expense_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + e.amount_cents, 0);
  }, [confirmedMileageExpenses]);

  const clinicCount = useMemo(() => {
    const ids = new Set<string>();
    confirmedMileageExpenses.forEach(e => { if (e.facility_id) ids.add(e.facility_id); });
    return ids.size;
  }, [confirmedMileageExpenses]);

  // ============================================================
  // EMPTY STATE — no home address set
  // ============================================================
  if (!homeAddressSet) {
    return (
      <div className="space-y-6">
        {/* Hero */}
        <div className="mx-auto max-w-[480px] text-center pt-6 pb-2">
          <div
            className="mx-auto mb-5 flex items-center justify-center rounded-full"
            style={{ width: 56, height: 56, background: 'rgba(94, 168, 122, 0.12)' }}
          >
            <Route className="h-7 w-7" style={{ color: '#2D6B4A' }} />
          </div>
          <h2 className="text-[18px] font-medium text-foreground">
            Find money you've been leaving on the table
          </h2>
          <p className="mt-2 mx-auto max-w-[440px] text-[13px] text-muted-foreground leading-relaxed">
            Relief vets on Locum Ops typically find <span className="font-medium text-foreground">$4,000–$8,000</span> in mileage deductions per year. Add your home address and we'll auto-calculate every trip.
          </p>
          <div className="mt-5">
            <Button
              onClick={() => navigate('/settings/profile')}
              className="bg-[#1A5C6B] text-white hover:bg-[#1A5C6B]/90 text-[14px] font-medium h-10 px-5"
            >
              Add home address →
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground/70">
            Takes 30 seconds. Used only to calculate distance to clinics.
          </p>
        </div>

        {/* Faded preview card */}
        <div className="mx-auto max-w-[480px]" style={{ opacity: 0.6 }}>
          <Card className="bg-secondary/40 relative">
            <CardContent className="py-5 px-5">
              <span className="absolute top-3 right-3 inline-flex items-center rounded-full border border-border/40 bg-white px-2 py-0.5 text-[10px] text-muted-foreground">
                Preview · your dashboard after first shift
              </span>
              <p className="text-[12px] text-muted-foreground">Money found this year</p>
              <p className="mt-1 text-[28px] font-medium leading-none" style={{ color: '#1A5C6B' }}>
                $1,471.40
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">2,102 miles · 4 clinics</p>
              <div className="mt-3 flex gap-2 flex-wrap">
                <span className="inline-flex items-center rounded-full bg-white border border-border/40 px-2.5 py-1 text-[11px] text-muted-foreground">
                  South County · $24.22
                </span>
                <span className="inline-flex items-center rounded-full bg-white border border-border/40 px-2.5 py-1 text-[11px] text-muted-foreground">
                  Parktown · $23.80
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>IRS standard rate ${(irsRate / 100).toFixed(2)}/mile · auto-updated each tax year</span>
        </div>
      </div>
    );
  }

  // ============================================================
  // POPULATED STATE
  // ============================================================
  return (
    <div className="space-y-4">
      {/* Onboarding */}
      {showOnboarding && (
        <MileageOnboarding onDismiss={() => {
          setShowOnboarding(false);
          localStorage.setItem(MILEAGE_ONBOARDING_KEY, '1');
        }} />
      )}

      {/* Hero — Money found this year */}
      <Card>
        <CardContent className="py-5 px-5">
          <p className="text-[12px] text-muted-foreground">Money found this year</p>
          <p
            className="mt-1 text-[38px] font-medium tabular-nums sm:text-[38px] text-[30px]"
            style={{ color: '#1A5C6B', lineHeight: 1.1 }}
          >
            {fmt(ytdMileageDeductionCents)}
          </p>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {ytdMileageMiles.toLocaleString()} miles tracked across {clinicCount} {clinicCount === 1 ? 'clinic' : 'clinics'}
            {' · '}
            <span className="text-foreground">+{fmt(thisMonthCents)} this month</span>
          </p>
        </CardContent>
      </Card>

      {/* Pending Review */}
      <MileageReviewBanner
        drafts={draftMileageExpenses}
        onConfirm={confirmMileage}
        onDismiss={dismissMileage}
        onConfirmAll={confirmAllMileage}
        onEdit={() => {}}
      />

      {/* Backfill Past Shifts */}
      <MileageBackfillCard onComplete={reload} />

      {/* YTD Starting Balance */}
      <Card>
        <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {startingMiles > 0
                  ? `Starting balance: ${startingMiles.toLocaleString()} mi imported`
                  : 'Add miles tracked elsewhere this year'}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {startingMiles > 0 && startingMilesNote
                  ? startingMilesNote
                  : `Already tracked ${config.tax_year} miles in another app? Add the total so YTD picks up where you left off.`}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => setShowStartingDialog(true)}>
            {startingMiles > 0 ? 'Edit' : 'Add'}
          </Button>
        </CardContent>
      </Card>

      {/* Money claimed (formerly Confirmed Mileage Log) */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Money claimed</h3>
        {confirmedMileageExpenses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No confirmed mileage entries yet. Complete a shift and entries will appear here for review.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {confirmedMileageExpenses.map(exp => (
              <Card key={exp.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <Car className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">
                        {exp.facility_id && facilityMap[exp.facility_id] ? facilityMap[exp.facility_id] : 'Mileage'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(exp.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {exp.route_description && (
                        <span className="text-[10px] text-muted-foreground truncate">· {exp.route_description}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{exp.mileage_miles ?? 0} mi</p>
                    <p className="text-[10px] text-muted-foreground">{fmt(exp.amount_cents)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <MileageStartingBalanceDialog
        open={showStartingDialog}
        onOpenChange={setShowStartingDialog}
        initialMiles={startingMiles}
        initialNote={startingMilesNote}
        taxYear={config.tax_year}
        onSave={updateMileageStartingBalance}
      />
    </div>
  );
}
