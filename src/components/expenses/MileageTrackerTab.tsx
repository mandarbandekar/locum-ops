import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car, Route, ShieldCheck, Hash, FileText, X, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useData } from '@/contexts/DataContext';
import { MileageOnboarding } from './MileageOnboarding';
import { MileageReviewBanner } from './MileageReviewBanner';
import MileageBackfillCard from './MileageBackfillCard';
import MileageStartingBalanceDialog from './MileageStartingBalanceDialog';
import MileageReportCard from './MileageReportCard';
import AddExpenseDialog from './AddExpenseDialog';
import type { Expense } from '@/hooks/useExpenses';

const MILEAGE_ONBOARDING_KEY = 'locumops_mileage_tab_onboarding_dismissed';
const STARTING_CHIP_DISMISSED_KEY = 'locumops_mileage_starting_chip_dismissed';


interface Props {
  expenses: Expense[];
  config: { irs_mileage_rate_cents: number; home_office_rate_cents: number; tax_year: number };
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
  addExpense: (data: Partial<Expense>) => Promise<Expense | null>;
  editExpense: (id: string, data: Partial<Expense>) => Promise<any>;
  uploadReceipt: (file: File) => Promise<string | null>;
  reload: () => void;
}

export default function MileageTrackerTab({
  expenses,
  config, draftMileageExpenses, confirmedMileageExpenses,
  ytdMileageMiles, ytdMileageDeductionCents,
  startingMiles, startingMilesNote, updateMileageStartingBalance,
  confirmMileage, dismissMileage, confirmAllMileage,
  addExpense, editExpense, uploadReceipt, reload,
}: Props) {
  const navigate = useNavigate();
  const { profile: userProfile } = useUserProfile();
  const { facilities } = useData();
  const [showStartingDialog, setShowStartingDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem(MILEAGE_ONBOARDING_KEY)
  );
  const [chipDismissed, setChipDismissed] = useState(
    () => !!localStorage.getItem(STARTING_CHIP_DISMISSED_KEY)
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('mileageView') === 'reports' ? 'reports' : 'drives';
  const setView = (v: 'drives' | 'reports') => {
    const next = new URLSearchParams(searchParams);
    next.set('mileageView', v);
    setSearchParams(next, { replace: true });
  };


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

        {/* Next steps checklist */}
        <div className="mx-auto max-w-[480px]">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70 mb-2 text-center">
            What happens next
          </p>
          <ol className="space-y-2">
            {[
              { n: 1, label: 'Add your home address', sub: 'So we can measure each trip', active: true },
              { n: 2, label: 'Work your shifts as usual', sub: 'Trips appear here for review' },
              { n: 3, label: 'Confirm trips in one tap', sub: 'Each one becomes a tax deduction' },
            ].map(step => (
              <li
                key={step.n}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-3.5 py-2.5"
              >
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium"
                  style={
                    step.active
                      ? { background: '#1A5C6B', color: '#fff' }
                      : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
                  }
                >
                  {step.n}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground leading-tight">{step.label}</p>
                  <p className="text-[11px] text-muted-foreground">{step.sub}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

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
  const showStartingChip = startingMiles > 0 || !chipDismissed;

  return (
    <div className="space-y-4">
      {/* Onboarding */}
      {showOnboarding && (
        <MileageOnboarding onDismiss={() => {
          setShowOnboarding(false);
          localStorage.setItem(MILEAGE_ONBOARDING_KEY, '1');
        }} />
      )}

      {/* Persistent Hero — Money found this year */}
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

      {/* Sub-tab switcher */}
      <div className="flex gap-2 sm:gap-3 flex-wrap">
        <button
          onClick={() => setView('drives')}
          className={`primary-tab-btn relative ${view === 'drives' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <Car className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Business Drives</span>
          {draftMileageExpenses.length > 0 && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive" />
          )}
        </button>
        <button
          onClick={() => setView('reports')}
          className={`primary-tab-btn ${view === 'reports' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Mileage Reports</span>
        </button>
      </div>

      {view === 'drives' && (
        <div className="space-y-4">
          {/* Top-right starting balance chip */}
          {showStartingChip && (
            <div className="flex justify-end">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 pl-3 pr-1.5 py-1">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                <button
                  className="text-[12px] font-medium text-foreground hover:underline"
                  onClick={() => setShowStartingDialog(true)}
                >
                  {startingMiles > 0
                    ? `Starting balance: ${startingMiles.toLocaleString()} mi · Edit`
                    : 'Add miles tracked elsewhere'}
                </button>
                {startingMiles === 0 && (
                  <button
                    aria-label="Dismiss"
                    className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                    onClick={() => {
                      setChipDismissed(true);
                      localStorage.setItem(STARTING_CHIP_DISMISSED_KEY, '1');
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Pending Review */}
          <MileageReviewBanner
            drafts={draftMileageExpenses}
            onConfirm={confirmMileage}
            onDismiss={dismissMileage}
            onConfirmAll={confirmAllMileage}
            onEdit={(exp) => setEditingExpense(exp)}
          />

          {/* Backfill Past Shifts */}
          <MileageBackfillCard onComplete={reload} />

          {/* Money claimed */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Money claimed</h3>
            {confirmedMileageExpenses.length === 0 ? (
              <Card>
                <CardContent className="py-10 px-6 text-center">
                  <div
                    className="mx-auto mb-4 flex items-center justify-center rounded-full"
                    style={{ width: 48, height: 48, background: 'rgba(94, 168, 122, 0.12)' }}
                  >
                    <Route className="h-5 w-5" style={{ color: '#2D6B4A' }} />
                  </div>
                  <p className="text-[14px] font-medium text-foreground">
                    Find money you've been leaving on the table
                  </p>
                  <p className="mt-1.5 mx-auto max-w-[400px] text-[12px] text-muted-foreground leading-relaxed">
                    Relief vets on Locum Ops typically find <span className="font-medium text-foreground">$4,000–$8,000</span> in mileage deductions per year. Every confirmed trip lands here — money in your pocket at tax time.
                  </p>
                  <div className="mt-5">
                    <Button
                      onClick={() => navigate('/settings/profile')}
                      className="bg-[#1A5C6B] text-white hover:bg-[#1A5C6B]/90 text-[14px] font-medium h-10 px-5"
                    >
                      Set home address →
                    </Button>
                  </div>
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
        </div>
      )}

      {view === 'reports' && (
        <div className="space-y-4">
          {confirmedMileageExpenses.length === 0 ? (
            <Card>
              <CardContent className="py-10 px-6 text-center">
                <div
                  className="mx-auto mb-4 flex items-center justify-center rounded-full"
                  style={{ width: 48, height: 48, background: 'hsl(var(--muted))' }}
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-[14px] font-medium text-foreground">No drives to report yet</p>
                <p className="mt-1.5 mx-auto max-w-[400px] text-[12px] text-muted-foreground leading-relaxed">
                  Confirm a few drives under Business Drives and your monthly mileage reports will appear here — ready to download as PDF or CSV for your CPA.
                </p>
                <div className="mt-5">
                  <Button variant="outline" onClick={() => setView('drives')} className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Go to Business Drives
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <MileageReportCard
              expenses={expenses}
              facilities={facilities}
              irsRateCents={config.irs_mileage_rate_cents}
            />
          )}
        </div>
      )}

      <MileageStartingBalanceDialog
        open={showStartingDialog}
        onOpenChange={setShowStartingDialog}
        initialMiles={startingMiles}
        initialNote={startingMilesNote}
        taxYear={config.tax_year}
        onSave={updateMileageStartingBalance}
      />

      <AddExpenseDialog
        open={!!editingExpense}
        onOpenChange={(o) => { if (!o) setEditingExpense(null); }}
        onSubmit={addExpense}
        onEdit={async (id, data) => {
          // Confirm draft on save so it leaves the review queue
          const result = await editExpense(id, { ...data, mileage_status: 'confirmed' });
          setEditingExpense(null);
          return result;
        }}
        uploadReceipt={uploadReceipt}
        config={config}
        editingExpense={editingExpense}
        expenses={expenses}
      />
    </div>
  );

}
