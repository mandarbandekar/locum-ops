import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, FileText, Landmark, Info, HelpCircle, BookOpen } from 'lucide-react';
import { evaluateCPAChecker } from '@/types/taxStrategy';
import type { TaxStrategyData } from '@/hooks/useTaxStrategy';

interface Props {
  data: TaxStrategyData;
}

const ENTITY_CARDS = [
  {
    title: '1099 / Sole Proprietor',
    icon: FileText,
    badge: 'Simplest',
    what: 'As a sole proprietor, your business income and expenses are reported on Schedule C of your personal tax return. No separate business entity filing is required.',
    when: 'If you are still early in relief or locum work and keeping things simple, staying 1099 may be easier operationally. Many relief vets start here.',
    tradeoff: 'Simplest to set up and maintain. You pay self-employment tax on net business income. No payroll complexity.',
  },
  {
    title: 'LLC',
    icon: Building2,
    badge: 'Liability Layer',
    what: 'An LLC (Limited Liability Company) provides a legal separation between your personal and business assets. By default, a single-member LLC is taxed the same as a sole proprietorship.',
    when: 'If you want liability protection while keeping tax filing simple, an LLC without an S-corp election may be worth discussing with your CPA.',
    tradeoff: 'Adds a layer of liability protection with some state registration and renewal requirements. Tax treatment is the same as sole prop unless you elect S-corp status.',
  },
  {
    title: 'S-Corp',
    icon: Landmark,
    badge: 'More Complex',
    what: 'An S-corp election (often paired with an LLC) allows you to split business income between a reasonable salary and distributions, which may reduce self-employment taxes on the distribution portion.',
    when: 'If your relief income is growing and becoming more consistent across clinics, this may be worth discussing with your CPA. Payroll and reasonable compensation are key concepts.',
    tradeoff: 'Adds payroll requirements, corporate tax filings, and administrative complexity. May provide tax benefits at higher income levels, but requires careful compliance.',
  },
];

const CONCEPT_CARDS = [
  {
    title: 'Estimated Taxes',
    icon: '📅',
    text: "If clinics aren't withholding taxes from your relief income, you may need to plan for quarterly estimated tax payments. Missing deadlines can result in penalties.",
  },
  {
    title: 'Reasonable Compensation',
    icon: '💰',
    text: 'For S-corp owners, the IRS requires paying yourself a "reasonable salary" before taking distributions. What counts as reasonable depends on your role, hours, and industry.',
  },
  {
    title: 'Accountable Plans',
    icon: '📋',
    text: 'For S-corp users, an accountable plan allows your business to reimburse you for common clinician expenses (mileage, CE, licensing) without those being treated as taxable income.',
  },
  {
    title: 'QBI Deduction',
    icon: '📊',
    text: 'The Qualified Business Income (QBI) deduction may allow eligible self-employed individuals to deduct up to 20% of qualified business income. Eligibility and limits depend on your situation.',
  },
  {
    title: 'Documentation Matters',
    icon: '📁',
    text: "Mileage, CE, licensing, insurance, and travel records are easier to discuss with your CPA when they're organized throughout the year. Good records support better tax conversations.",
  },
];

function EntityBasicsSection() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Entity Basics</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Entity examples and scenario estimates are for educational planning only. They do not recommend a business
          structure or guarantee savings.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {ENTITY_CARDS.map((card) => (
          <Card key={card.title} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <card.icon className="h-5 w-5 text-primary" />
                <Badge variant="secondary" className="text-xs">{card.badge}</Badge>
              </div>
              <CardTitle className="text-base">{card.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 text-sm">
              <div>
                <p className="font-medium text-foreground mb-1">What it is</p>
                <p className="text-muted-foreground">{card.what}</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">When to discuss</p>
                <p className="text-muted-foreground">{card.when}</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Tradeoffs</p>
                <p className="text-muted-foreground">{card.tradeoff}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CPACheckerSection({ data }: Props) {
  const [form, setForm] = useState({
    projected_profit: data.profile?.projected_annual_profit?.toString() || '',
    entity: data.profile?.current_entity_type || 'sole_proprietor',
    stable: data.profile?.stable_income ?? false,
    payroll: data.profile?.payroll_active ?? false,
    admin_ok: data.profile?.admin_complexity_ok ?? false,
    retirement: data.profile?.retirement_interest ?? false,
    income_up: data.profile?.income_up_this_year ?? false,
    multi_facility: data.profile?.multi_facility_work ?? false,
    relief_major: data.profile?.relief_income_major_source ?? false,
  });
  const [result, setResult] = useState<string[] | null>(null);

  const evaluate = () => {
    const messages = evaluateCPAChecker({
      projected_profit: parseFloat(form.projected_profit) || 0,
      entity: form.entity,
      stable: form.stable,
      payroll: form.payroll,
      admin_ok: form.admin_ok,
      retirement: form.retirement,
      income_up: form.income_up,
      multi_facility: form.multi_facility,
      relief_major: form.relief_major,
    });
    setResult(messages);

    data.saveProfile({
      current_entity_type: form.entity,
      projected_annual_profit: parseFloat(form.projected_profit) || null,
      stable_income: form.stable,
      payroll_active: form.payroll,
      admin_complexity_ok: form.admin_ok,
      retirement_interest: form.retirement,
      income_up_this_year: form.income_up,
      multi_facility_work: form.multi_facility,
      relief_income_major_source: form.relief_major,
    });
  };

  const toggles = [
    { key: 'stable' as const, label: 'Stable monthly income?' },
    { key: 'payroll' as const, label: 'Already running payroll?' },
    { key: 'admin_ok' as const, label: 'Willing to handle more admin/compliance?' },
    { key: 'retirement' as const, label: 'Planning retirement contributions?' },
    { key: 'income_up' as const, label: 'Major increase in income this year?' },
    { key: 'multi_facility' as const, label: 'Work across multiple clinics/facilities?' },
    { key: 'relief_major' as const, label: 'Relief/locum work is a major income source?' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Worth discussing with a CPA?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Answer a few questions to surface topics for your next CPA conversation.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Projected annual business profit</Label>
              <Input
                type="number"
                placeholder="e.g. 120000"
                value={form.projected_profit}
                onChange={e => setForm(f => ({ ...f, projected_profit: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Current entity type</Label>
              <Select value={form.entity} onValueChange={v => setForm(f => ({ ...f, entity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sole_proprietor">1099 / Sole Proprietor</SelectItem>
                  <SelectItem value="llc">LLC</SelectItem>
                  <SelectItem value="s_corp">S-Corp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {toggles.map(t => (
              <div key={t.key} className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm font-normal cursor-pointer">{t.label}</Label>
                <Switch
                  checked={form[t.key]}
                  onCheckedChange={v => setForm(f => ({ ...f, [t.key]: v }))}
                />
              </div>
            ))}
          </div>

          <Button onClick={evaluate}>See guidance</Button>

          {result && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Guidance</p>
              {result.map((msg, i) => (
                <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  {msg}
                </p>
              ))}
              <p className="text-xs text-muted-foreground mt-3 italic">
                This is not a recommendation. Confirm all decisions with your CPA.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ConceptCardsSection() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
        <BookOpen className="h-5 w-5" />
        Key Concepts
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CONCEPT_CARDS.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span>{card.icon}</span>
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{card.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function GuidanceTab({ data }: Props) {
  return (
    <div className="space-y-8">
      <EntityBasicsSection />
      <CPACheckerSection data={data} />
      <ConceptCardsSection />
    </div>
  );
}
