import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { OPPORTUNITY_CATEGORIES, type ReviewStatus, type TaxOpportunityReviewItem, type TaxAdvisorProfile } from '@/hooks/useTaxAdvisor';
import { CheckCircle2, Circle, Clock, BookmarkCheck } from 'lucide-react';

interface Props {
  reviewItems: TaxOpportunityReviewItem[];
  profile: TaxAdvisorProfile | null;
  onUpdateItem: (category: string, status: ReviewStatus, notes?: string) => Promise<void>;
}

const STATUS_CONFIG: Record<ReviewStatus, { label: string; icon: React.ReactNode; color: string }> = {
  not_started: { label: 'Not Started', icon: <Circle className="h-3.5 w-3.5" />, color: 'bg-muted text-muted-foreground' },
  reviewing: { label: 'Reviewing', icon: <Clock className="h-3.5 w-3.5" />, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  saved_for_cpa: { label: 'Saved for CPA', icon: <BookmarkCheck className="h-3.5 w-3.5" />, color: 'bg-primary/10 text-primary' },
  done_for_now: { label: 'Done for Now', icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

const CATEGORY_DETAILS: Record<string, { why: string; docs: string; cautions: string; cpaQuestions: string[] }> = {
  ce_travel: {
    why: 'CE events often involve registration fees, travel, lodging, and meals — areas commonly discussed with tax professionals.',
    docs: 'Keep receipts for registration, airfare/mileage, hotel, meals. Log dates, locations, and CE credit hours.',
    cautions: 'Mixed personal/business travel needs careful documentation. The deductibility of meals and entertainment has specific rules worth reviewing.',
    cpaQuestions: ['How should I document CE travel expenses?', 'What records do I need for mixed business/personal CE trips?'],
  },
  vehicle_mileage: {
    why: 'If you drive to locum assignments, mileage documentation is commonly reviewed by tax professionals.',
    docs: 'Use a mileage log (app or spreadsheet) with date, destination, purpose, and miles. Keep fuel/maintenance receipts.',
    cautions: 'Commuting vs. business mileage distinctions matter. Standard mileage rate vs. actual expenses is a discussion point.',
    cpaQuestions: ['Should I use standard mileage or actual expenses?', 'How do I distinguish commuting from business miles?'],
  },
  credentials_memberships: {
    why: 'Professional licenses, DEA registration, board certifications, and memberships are areas commonly associated with locum work.',
    docs: 'Keep renewal notices, payment confirmations, and receipts for all professional fees.',
    cautions: 'Some memberships may have personal use components. Documentation of business purpose is important.',
    cpaQuestions: ['Which professional fees and memberships should I discuss with you?', 'How should I document the business purpose of memberships?'],
  },
  equipment_supplies: {
    why: 'Stethoscopes, scrubs, reference materials, and other supplies purchased for work may be worth discussing.',
    docs: 'Keep receipts and note the business purpose for each purchase.',
    cautions: 'Items with personal use may need allocation. Depreciation rules apply to larger purchases.',
    cpaQuestions: ['How should I handle equipment that has both personal and professional use?', 'Are there depreciation considerations for my equipment?'],
  },
  retirement_planning: {
    why: 'Self-employed individuals have access to specific retirement account options that may differ from W-2 employees.',
    docs: 'Track contributions, deadlines, and account types. Keep annual statements.',
    cautions: 'Contribution limits and deadlines vary by account type and entity structure. S-Corp owners have specific rules.',
    cpaQuestions: ['What retirement account options should I consider given my entity type?', 'What are the contribution deadlines I should know about?'],
  },
  multi_state_work: {
    why: 'Working in multiple states may create filing obligations and documentation requirements worth discussing.',
    docs: 'Track dates worked in each state, income earned per state, and state license fees.',
    cautions: 'State tax reciprocity agreements, nexus rules, and withholding requirements vary. This area benefits from professional review.',
    cpaQuestions: ['Do I have filing obligations in states where I do locum work?', 'How should I track income by state?'],
  },
  entity_structure: {
    why: 'The choice between sole proprietor, LLC, and S-Corp has planning implications that are commonly reviewed.',
    docs: 'Keep formation documents, operating agreements, payroll records (S-Corp), and track reasonable compensation discussions.',
    cautions: 'Entity changes have timing, cost, and compliance implications. This is a significant decision requiring professional guidance.',
    cpaQuestions: ['Is my current entity structure still appropriate given my income level?', 'What would be involved in changing my entity structure?'],
  },
  home_office: {
    why: 'If you have a dedicated workspace for administrative tasks, this area is commonly discussed with tax professionals.',
    docs: 'Measure dedicated space, keep utility bills, internet bills, and document exclusive business use.',
    cautions: 'The "exclusive use" requirement is strict. Simplified vs. regular method is a discussion point.',
    cpaQuestions: ['Do I qualify for the home office discussion given my work situation?', 'Should I use the simplified or regular calculation method?'],
  },
};

export default function OpportunityReviewTab({ reviewItems, profile, onUpdateItem }: Props) {
  const getStatus = (cat: string): ReviewStatus => reviewItems.find(r => r.category === cat)?.status || 'not_started';
  const getNotes = (cat: string): string => reviewItems.find(r => r.category === cat)?.notes || '';

  // Suggest categories based on profile
  const suggested = new Set<string>();
  if (profile?.travels_for_ce) suggested.add('ce_travel');
  if (profile?.uses_personal_vehicle) suggested.add('vehicle_mileage');
  if (profile?.pays_own_subscriptions) suggested.add('credentials_memberships');
  if (profile?.buys_supplies_equipment) suggested.add('equipment_supplies');
  if (profile?.retirement_planning_interest) suggested.add('retirement_planning');
  if (profile?.multi_state_work) suggested.add('multi_state_work');
  if (profile?.entity_type && profile.entity_type !== 'sole_proprietor') suggested.add('entity_structure');
  if (profile?.combines_business_personal_travel) suggested.add('home_office');

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review common planning areas and gather what you'll want to discuss with your CPA.
      </p>

      {OPPORTUNITY_CATEGORIES.map(cat => {
        const status = getStatus(cat.key);
        const notes = getNotes(cat.key);
        const detail = CATEGORY_DETAILS[cat.key];
        const isSuggested = suggested.has(cat.key);
        const cfg = STATUS_CONFIG[status];

        return (
          <Card key={cat.key} className={isSuggested ? 'border-primary/30' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{cat.label}</CardTitle>
                    {isSuggested && <Badge variant="secondary" className="text-xs">Suggested</Badge>}
                  </div>
                  <CardDescription className="mt-1">{cat.description}</CardDescription>
                </div>
                <Select value={status} onValueChange={(v) => onUpdateItem(cat.key, v as ReviewStatus)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <span className="flex items-center gap-1.5">{v.icon}{v.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            {detail && (
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-foreground mb-1">Why this may matter</p>
                  <p className="text-muted-foreground">{detail.why}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">What to gather / document</p>
                  <p className="text-muted-foreground">{detail.docs}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Caution areas</p>
                  <p className="text-muted-foreground">{detail.cautions}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Suggested CPA questions</p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {detail.cpaQuestions.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </div>
                <Textarea
                  placeholder="Your notes for this area…"
                  value={notes}
                  onChange={e => onUpdateItem(cat.key, status, e.target.value)}
                  className="mt-2"
                  rows={2}
                />
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
