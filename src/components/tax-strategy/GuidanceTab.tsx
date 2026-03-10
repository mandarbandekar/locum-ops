import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ENTITY_DISCLAIMER } from './TaxDisclaimer';
import { AlertTriangle, BookOpen, ChevronDown, Lightbulb, Building2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = (table: string) => supabase.from(table as any);

interface TaxProfile {
  id?: string;
  current_entity_type: string;
  projected_annual_profit: number | null;
  stable_income: boolean | null;
  payroll_active: boolean | null;
  admin_complexity_ok: boolean | null;
  retirement_interest: boolean | null;
  income_up_this_year: boolean | null;
  multi_facility_work: boolean | null;
  relief_income_major_source: boolean | null;
  reserve_percent: number | null;
}

const DEFAULT_PROFILE: TaxProfile = {
  current_entity_type: 'sole_proprietor',
  projected_annual_profit: null,
  stable_income: null,
  payroll_active: null,
  admin_complexity_ok: null,
  retirement_interest: null,
  income_up_this_year: null,
  multi_facility_work: null,
  relief_income_major_source: null,
  reserve_percent: 30,
};

const ENTITY_CARDS = [
  {
    type: '1099 / Sole Proprietor',
    icon: '📋',
    description: 'The simplest structure. Your relief income flows directly to your personal tax return (Schedule C). No separate entity needed.',
    whenToDiscuss: 'If you are still early and keeping things simple, staying 1099 may be easier operationally. Good for clinicians working a few shifts per month or testing the relief/locum model.',
    tradeoff: 'Simplest setup and lowest admin. You pay self-employment tax on all net income. No payroll required.',
  },
  {
    type: 'LLC',
    icon: '🏢',
    description: 'A legal entity that separates your personal assets from your business. Can be taxed as a sole proprietor (default) or elect S-corp taxation.',
    whenToDiscuss: 'If you work regularly across multiple clinics and want liability protection, forming an LLC may be worth discussing with your CPA and attorney.',
    tradeoff: 'Provides liability protection but adds state filing fees and annual maintenance. Tax treatment depends on election.',
  },
  {
    type: 'S-Corp',
    icon: '🏛️',
    description: 'A tax election (often applied to an LLC) that splits income into salary and distributions. The salary portion is subject to payroll taxes; distributions are not.',
    whenToDiscuss: 'If your relief income is growing and becoming more consistent across clinics, this may be worth discussing with your CPA. Payroll and reasonable compensation are key concepts.',
    tradeoff: 'Potential payroll tax savings at higher income levels. Requires running payroll, setting reasonable compensation, and additional compliance/admin.',
  },
];

const CONCEPT_CARDS = [
  {
    title: 'Estimated Taxes',
    icon: '📅',
    body: "If clinics aren't withholding taxes from your relief income, you may need to plan for quarterly payments. The IRS expects tax payments throughout the year, not just at filing time.",
  },
  {
    title: 'Reasonable Compensation',
    icon: '💰',
    body: 'For S-corp users, you must pay yourself a "reasonable salary" through payroll before taking distributions. What counts as reasonable depends on your profession, hours, and market rates.',
  },
  {
    title: 'Accountable Plans',
    icon: '📝',
    body: 'For S-corp users, an accountable plan lets your company reimburse you for business expenses (mileage, CE, licensing, insurance) without those reimbursements being taxable income.',
  },
  {
    title: 'QBI Deduction',
    icon: '📊',
    body: 'The Qualified Business Income deduction may allow sole proprietors and some pass-through entity owners to deduct up to 20% of qualified business income. Eligibility depends on income level and profession.',
  },
  {
    title: 'Documentation Matters',
    icon: '📂',
    body: 'Mileage, CE, licensing, insurance, and travel records are easier to discuss with your CPA when they\'re organized throughout the year. Good records support the deductions you want to claim.',
  },
];

function getCheckerOutput(profile: TaxProfile): string[] {
  const results: string[] = [];
  const profit = profile.projected_annual_profit || 0;

  if (profit > 60000 && profile.stable_income && !profile.payroll_active) {
    results.push('Your income level and stability may be worth discussing with your CPA in the context of entity structure.');
  }
  if (profit > 100000) {
    results.push('At this income level, reviewing entity options and compensation planning with your CPA is generally recommended.');
  }
  if (profile.income_up_this_year) {
    results.push('Since your income increased this year, reviewing estimated tax payments and entity strategy with your CPA may be timely.');
  }
  if (profile.multi_facility_work) {
    results.push('Because you work across multiple facilities, documentation and reimbursement structure may be worth reviewing.');
  }
  if (profile.retirement_interest) {
    results.push('Review retirement contribution options with your CPA — entity structure can affect available plan types.');
  }
  if (profile.admin_complexity_ok === false) {
    results.push('You may want to keep things simple for now. Additional entity complexity adds admin and compliance requirements.');
  }
  if (profile.payroll_active) {
    results.push('Review payroll complexity and compensation planning with your CPA.');
  }
  if (profile.relief_income_major_source) {
    results.push('Since relief/locum work is a major income source, long-term tax planning and entity strategy are worth reviewing regularly.');
  }
  if (results.length === 0) {
    results.push('Based on what you entered, a simple conversation with your CPA can help confirm the right path for your situation.');
  }

  return results;
}

export default function GuidanceTab() {
  const { user, isDemo } = useAuth();
  const [profile, setProfile] = useState<TaxProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(!isDemo);
  const [showResults, setShowResults] = useState(false);
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo || !user) { setLoading(false); return; }
    loadProfile();
  }, [user?.id, isDemo]);

  async function loadProfile() {
    setLoading(true);
    const { data } = await db('tax_profiles').select('*').maybeSingle() as { data: any };
    if (data) {
      setProfile({
        id: data.id,
        current_entity_type: data.current_entity_type,
        projected_annual_profit: data.projected_annual_profit ? Number(data.projected_annual_profit) : null,
        stable_income: data.stable_income,
        payroll_active: data.payroll_active,
        admin_complexity_ok: data.admin_complexity_ok,
        retirement_interest: data.retirement_interest,
        income_up_this_year: data.income_up_this_year,
        multi_facility_work: data.multi_facility_work,
        relief_income_major_source: data.relief_income_major_source,
        reserve_percent: data.reserve_percent ? Number(data.reserve_percent) : 30,
      });
    }
    setLoading(false);
  }

  async function saveProfile() {
    if (isDemo) { toast.success('Profile saved (demo)'); return; }
    if (!user) return;
    const payload = {
      current_entity_type: profile.current_entity_type,
      projected_annual_profit: profile.projected_annual_profit,
      stable_income: profile.stable_income,
      payroll_active: profile.payroll_active,
      admin_complexity_ok: profile.admin_complexity_ok,
      retirement_interest: profile.retirement_interest,
      income_up_this_year: profile.income_up_this_year,
      multi_facility_work: profile.multi_facility_work,
      relief_income_major_source: profile.relief_income_major_source,
      reserve_percent: profile.reserve_percent,
    };
    if (profile.id) {
      await db('tax_profiles').update(payload).eq('id', profile.id);
    } else {
      const { data } = await db('tax_profiles').insert({ user_id: user.id, ...payload } as any).select().single() as { data: any };
      if (data) setProfile(p => ({ ...p, id: data.id }));
    }
    toast.success('Tax profile saved');
  }

  const setBool = (field: keyof TaxProfile, value: string) => {
    setProfile(p => ({ ...p, [field]: value === 'yes' ? true : value === 'no' ? false : null }));
  };

  if (loading) return <p className="text-muted-foreground py-8 text-center">Loading…</p>;

  return (
    <div className="space-y-8">
      {/* Entity Basics */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5" /> Entity Basics</h2>
          <p className="text-sm text-muted-foreground mt-1">{ENTITY_DISCLAIMER}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {ENTITY_CARDS.map(card => (
            <Card key={card.type} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-xl">{card.icon}</span>
                  {card.type}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-3 text-sm">
                <p className="text-muted-foreground">{card.description}</p>
                <Collapsible open={expandedEntity === card.type} onOpenChange={o => setExpandedEntity(o ? card.type : null)}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 px-0 text-primary">
                      Learn more <ChevronDown className="h-3 w-3" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-2">
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-xs font-medium mb-1">When clinicians often discuss this:</p>
                      <p className="text-xs text-muted-foreground">{card.whenToDiscuss}</p>
                    </div>
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-xs font-medium mb-1">Tradeoff:</p>
                      <p className="text-xs text-muted-foreground">{card.tradeoff}</p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CPA Checker */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Worth discussing with a CPA?</h2>
          <p className="text-sm text-muted-foreground mt-1">Answer a few questions to get neutral guidance on what might be worth bringing up with your CPA.</p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Projected annual business profit</Label>
                <Input type="number" placeholder="e.g. 120000" value={profile.projected_annual_profit ?? ''} onChange={e => setProfile(p => ({ ...p, projected_annual_profit: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div>
                <Label>Current entity type</Label>
                <RadioGroup value={profile.current_entity_type} onValueChange={v => setProfile(p => ({ ...p, current_entity_type: v }))} className="flex flex-wrap gap-3 mt-1">
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="sole_proprietor" id="e-sp" /><Label htmlFor="e-sp" className="text-sm">1099 / Sole Prop</Label></div>
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="llc" id="e-llc" /><Label htmlFor="e-llc" className="text-sm">LLC</Label></div>
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="s_corp" id="e-sc" /><Label htmlFor="e-sc" className="text-sm">S-Corp</Label></div>
                </RadioGroup>
              </div>
            </div>

            {[
              { field: 'stable_income' as const, label: 'Stable monthly income?' },
              { field: 'payroll_active' as const, label: 'Already running payroll?' },
              { field: 'admin_complexity_ok' as const, label: 'Willing to handle more admin/compliance?' },
              { field: 'retirement_interest' as const, label: 'Planning retirement contributions?' },
              { field: 'income_up_this_year' as const, label: 'Major increase in income this year?' },
              { field: 'multi_facility_work' as const, label: 'Work across multiple clinics/facilities?' },
              { field: 'relief_income_major_source' as const, label: 'Relief/locum work is a major income source?' },
            ].map(({ field, label }) => (
              <div key={field} className="flex items-center justify-between">
                <Label className="text-sm">{label}</Label>
                <RadioGroup
                  value={profile[field] === true ? 'yes' : profile[field] === false ? 'no' : ''}
                  onValueChange={v => setBool(field, v)}
                  className="flex gap-3"
                >
                  <div className="flex items-center gap-1"><RadioGroupItem value="yes" id={`${field}-y`} /><Label htmlFor={`${field}-y`} className="text-xs">Yes</Label></div>
                  <div className="flex items-center gap-1"><RadioGroupItem value="no" id={`${field}-n`} /><Label htmlFor={`${field}-n`} className="text-xs">No</Label></div>
                </RadioGroup>
              </div>
            ))}

            <div className="flex gap-2">
              <Button onClick={() => { saveProfile(); setShowResults(true); }}>Save & See Guidance</Button>
            </div>

            {showResults && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Guidance</p>
                {getCheckerOutput(profile).map((r, i) => (
                  <p key={i} className="text-sm text-muted-foreground">• {r}</p>
                ))}
                <p className="text-xs text-muted-foreground italic mt-2">{ENTITY_DISCLAIMER}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Concept Cards */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5" /> Key Concepts</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CONCEPT_CARDS.map(card => (
            <Card key={card.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span>{card.icon}</span> {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{card.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export { getCheckerOutput, DEFAULT_PROFILE };
export type { TaxProfile };
