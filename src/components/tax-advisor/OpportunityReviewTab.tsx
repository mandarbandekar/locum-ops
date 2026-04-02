import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { OPPORTUNITY_CATEGORIES, type ReviewStatus, type TaxOpportunityReviewItem, type TaxAdvisorProfile } from '@/hooks/useTaxAdvisor';
import { useData } from '@/contexts/DataContext';
import { CheckCircle2, Circle, Clock, BookmarkCheck, ChevronDown, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  reviewItems: TaxOpportunityReviewItem[];
  profile: TaxAdvisorProfile | null;
  onUpdateItem: (category: string, status: ReviewStatus, notes?: string) => Promise<void>;
  onSaveQuestion: (q: string, topic: string) => Promise<void>;
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

export default function OpportunityReviewTab({ reviewItems, profile, onUpdateItem, onSaveQuestion }: Props) {
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const { facilities } = useData();

  const getStatus = (cat: string): ReviewStatus => reviewItems.find(r => r.category === cat)?.status || 'not_started';
  const getNotes = (cat: string): string => reviewItems.find(r => r.category === cat)?.notes || '';

  // Suggest categories based on profile + data
  const suggested = new Set<string>();
  if (profile?.travels_for_ce) suggested.add('ce_travel');
  if (profile?.uses_personal_vehicle) suggested.add('vehicle_mileage');
  if (profile?.pays_own_subscriptions) suggested.add('credentials_memberships');
  if (profile?.buys_supplies_equipment) suggested.add('equipment_supplies');
  if (profile?.retirement_planning_interest) suggested.add('retirement_planning');
  if (profile?.multi_state_work) suggested.add('multi_state_work');
  if (profile?.entity_type && profile.entity_type !== 'sole_proprietor') suggested.add('entity_structure');
  if (profile?.combines_business_personal_travel) suggested.add('home_office');

  // Auto-suggest multi-state if facilities span 2+ states
  if (facilities && facilities.length >= 2) {
    const states = new Set(facilities.map(f => {
      const parts = f.address?.split(',');
      return parts?.[parts.length - 1]?.trim()?.split(' ')?.[0];
    }).filter(Boolean));
    if (states.size >= 2) suggested.add('multi_state_work');
  }

  // Sort: suggested first, then rest
  const sortedCategories = [...OPPORTUNITY_CATEGORIES].sort((a, b) => {
    const aS = suggested.has(a.key) ? 0 : 1;
    const bS = suggested.has(b.key) ? 0 : 1;
    return aS - bS;
  });

  // Progress
  const reviewedCount = OPPORTUNITY_CATEGORIES.filter(c => getStatus(c.key) !== 'not_started').length;
  const totalCount = OPPORTUNITY_CATEGORIES.length;
  const progressPct = Math.round((reviewedCount / totalCount) * 100);

  const toggleCard = (key: string) => {
    setOpenCards(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSaveQuestion = async (question: string, topic: string) => {
    await onSaveQuestion(question, topic);
    toast({ title: 'Question saved to CPA list' });
  };

  return (
    <div className="space-y-4">
      {/* Progress strip */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium">{reviewedCount} of {totalCount} areas reviewed</p>
            <p className="text-xs text-muted-foreground">{progressPct}%</p>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
      </div>

      {/* Cards */}
      {sortedCategories.map(cat => {
        const status = getStatus(cat.key);
        const notes = getNotes(cat.key);
        const detail = CATEGORY_DETAILS[cat.key];
        const isSuggested = suggested.has(cat.key);
        const cfg = STATUS_CONFIG[status];
        const isOpen = openCards.has(cat.key);

        return (
          <Collapsible key={cat.key} open={isOpen} onOpenChange={() => toggleCard(cat.key)}>
            <Card className={isSuggested ? 'border-primary/30' : ''}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-sm">{cat.label}</span>
                    {isSuggested && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Suggested</Badge>}
                    <Badge className={`text-[10px] px-1.5 py-0 ${cfg.color} border-0`}>
                      {cfg.label}
                    </Badge>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                {detail && (
                  <CardContent className="pt-0 pb-4 space-y-3 text-sm border-t">
                    <p className="text-muted-foreground pt-3">{cat.description}</p>

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

                    {/* CPA questions with save buttons */}
                    <div>
                      <p className="font-medium text-foreground mb-2">Suggested CPA questions</p>
                      <div className="space-y-1.5">
                        {detail.cpaQuestions.map((q, i) => (
                          <div key={i} className="flex items-start gap-2 group">
                            <p className="text-muted-foreground flex-1 text-sm">• {q}</p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              onClick={(e) => { e.stopPropagation(); handleSaveQuestion(q, cat.key); }}
                            >
                              <Plus className="h-3 w-3 mr-1" /> Save
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Status + Notes */}
                    <div className="flex items-center gap-3 pt-2">
                      <Select value={status} onValueChange={(v) => onUpdateItem(cat.key, v as ReviewStatus)}>
                        <SelectTrigger className="w-[160px] h-8 text-xs">
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
                    <Textarea
                      placeholder="Your notes for this area…"
                      value={notes}
                      onChange={e => onUpdateItem(cat.key, status, e.target.value)}
                      rows={2}
                    />
                  </CardContent>
                )}
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}
