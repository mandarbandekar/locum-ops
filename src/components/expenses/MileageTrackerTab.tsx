import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Car, MapPin, CheckCircle2, AlertCircle, ArrowRight, Info, TrendingUp, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useData } from '@/contexts/DataContext';
import { MileageOnboarding } from './MileageOnboarding';
import { MileageReviewBanner } from './MileageReviewBanner';
import MileageBackfillCard from './MileageBackfillCard';
import type { Expense } from '@/hooks/useExpenses';

const MILEAGE_ONBOARDING_KEY = 'locumops_mileage_tab_onboarding_dismissed';

interface Props {
  expenses: Expense[];
  config: { irs_mileage_rate_cents: number };
  draftMileageExpenses: Expense[];
  confirmedMileageExpenses: Expense[];
  ytdMileageMiles: number;
  ytdMileageDeductionCents: number;
  confirmMileage: (id: string) => Promise<void>;
  dismissMileage: (id: string) => Promise<void>;
  confirmAllMileage: () => Promise<void>;
  editExpense: (id: string, data: Partial<Expense>) => Promise<any>;
}

export default function MileageTrackerTab({
  config, draftMileageExpenses, confirmedMileageExpenses,
  ytdMileageMiles, ytdMileageDeductionCents,
  confirmMileage, dismissMileage, confirmAllMileage,
}: Props) {
  const navigate = useNavigate();
  const { profile: userProfile } = useUserProfile();
  const { facilities } = useData();
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

  const thisMonthMiles = useMemo(() => {
    const now = new Date();
    return confirmedMileageExpenses
      .filter(e => {
        const d = new Date(e.expense_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + (e.mileage_miles || 0), 0);
  }, [confirmedMileageExpenses]);

  return (
    <div className="space-y-4">
      {/* Onboarding */}
      {showOnboarding && (
        <MileageOnboarding onDismiss={() => {
          setShowOnboarding(false);
          localStorage.setItem(MILEAGE_ONBOARDING_KEY, '1');
        }} />
      )}

      {/* YTD Stats Strip */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 px-4 flex items-center gap-2.5">
            <Car className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-[11px] text-muted-foreground">YTD Miles</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[240px] text-xs">
                      <p className="font-medium mb-1">IRS Commute Rule for Relief Vets</p>
                      <p>As a relief vet with no fixed office, travel from home to each clinic is generally deductible business mileage — not a personal commute.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="font-semibold text-sm">{ytdMileageMiles.toLocaleString()} mi</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 flex items-center gap-2.5">
            <TrendingUp className="h-4 w-4 text-green-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">YTD Deduction</p>
              <p className="font-semibold text-sm">{fmt(ytdMileageDeductionCents)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 flex items-center gap-2.5">
            <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">This Month</p>
              <p className="font-semibold text-sm">{thisMonthMiles.toLocaleString()} mi</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Setup Status */}
      <Card className={homeAddressSet ? 'border-green-200 dark:border-green-900' : 'border-amber-200 dark:border-amber-900'}>
        <CardContent className="py-3 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {homeAddressSet ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium">
                {homeAddressSet ? 'Home address set' : 'Home address needed'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                IRS rate: ${(irsRate / 100).toFixed(2)}/mile ({new Date().getFullYear()})
              </p>
            </div>
          </div>
          {!homeAddressSet && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate('/settings/profile')}>
              <MapPin className="h-3.5 w-3.5" />
              Set Address
            </Button>
          )}
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

      {/* Confirmed Mileage Log */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Confirmed Mileage Log</h3>
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
    </div>
  );
}
