// S-Corp Fit Assessment — scoring logic, savings calculator, content constants

export interface AssessmentAnswers {
  incomeRange: string;
  incomeStability: string;
  currentEntity: string;
  payrollComfort: string;
  hasCPA: string;
  yearsInPractice: string;
}

export type FitResult = 'worth_exploring' | 'maybe_later' | 'likely_not_now';

export interface AssessmentResult {
  answers: AssessmentAnswers;
  result: FitResult;
  savingsEstimate: { low: number; high: number } | null;
  completedAt: string;
}

export const ASSESSMENT_QUESTIONS = [
  {
    key: 'incomeRange' as const,
    question: 'What is your projected annual 1099 income?',
    options: [
      { value: '0-60k', label: 'Under $60K' },
      { value: '60-100k', label: '$60K – $100K' },
      { value: '100-150k', label: '$100K – $150K' },
      { value: '150k+', label: '$150K+' },
    ],
  },
  {
    key: 'incomeStability' as const,
    question: 'How stable is your monthly income from relief work?',
    options: [
      { value: 'steady', label: 'Steady — consistent monthly income' },
      { value: 'moderate', label: 'Moderate — some seasonal variation' },
      { value: 'variable', label: 'Variable — highly seasonal or unpredictable' },
    ],
  },
  {
    key: 'currentEntity' as const,
    question: 'What is your current business entity type?',
    options: [
      { value: 'sole_prop', label: 'Sole proprietorship / 1099' },
      { value: 'llc', label: 'LLC (taxed as sole prop)' },
      { value: 'scorp', label: 'Already an S-Corp' },
      { value: 'unsure', label: 'Not sure' },
    ],
  },
  {
    key: 'payrollComfort' as const,
    question: 'How comfortable are you with running payroll?',
    options: [
      { value: 'yes', label: 'Comfortable — I can manage it' },
      { value: 'outsource', label: 'Would outsource to a payroll service' },
      { value: 'no', label: 'Not comfortable with the admin burden' },
    ],
  },
  {
    key: 'hasCPA' as const,
    question: 'Do you currently have a CPA or tax professional?',
    options: [
      { value: 'yes', label: 'Yes, I have one' },
      { value: 'looking', label: 'Looking for one' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    key: 'yearsInPractice' as const,
    question: 'How long have you been working independently as a relief clinician?',
    options: [
      { value: 'lt1', label: 'Less than 1 year' },
      { value: '1-3', label: '1–3 years' },
      { value: '3+', label: '3+ years' },
    ],
  },
] as const;

export function scoreAssessment(answers: AssessmentAnswers): FitResult {
  let score = 0;

  // Income — strongest signal
  if (answers.incomeRange === '150k+') score += 4;
  else if (answers.incomeRange === '100-150k') score += 3;
  else if (answers.incomeRange === '60-100k') score += 1;

  // Stability
  if (answers.incomeStability === 'steady') score += 2;
  else if (answers.incomeStability === 'moderate') score += 1;

  // Entity — already S-Corp = no change needed
  if (answers.currentEntity === 'scorp') return 'likely_not_now'; // already there
  if (answers.currentEntity === 'llc') score += 1;

  // Payroll comfort
  if (answers.payrollComfort === 'yes' || answers.payrollComfort === 'outsource') score += 1;

  // CPA
  if (answers.hasCPA === 'yes') score += 1;

  // Years — caution for very new
  if (answers.yearsInPractice === 'lt1') score -= 1;
  else if (answers.yearsInPractice === '3+') score += 1;

  if (score >= 6) return 'worth_exploring';
  if (score >= 3) return 'maybe_later';
  return 'likely_not_now';
}

export function calculateSavingsEstimate(incomeRange: string): { low: number; high: number } | null {
  // Educational estimate: (income - reasonable salary) * 15.3%
  // Using two salary benchmarks per range
  const ranges: Record<string, { income: number; salaryLow: number; salaryHigh: number }> = {
    '60-100k': { income: 80000, salaryLow: 50000, salaryHigh: 60000 },
    '100-150k': { income: 125000, salaryLow: 60000, salaryHigh: 80000 },
    '150k+': { income: 175000, salaryLow: 70000, salaryHigh: 100000 },
  };
  const r = ranges[incomeRange];
  if (!r) return null;
  const rate = 0.153;
  return {
    low: Math.round((r.income - r.salaryHigh) * rate),
    high: Math.round((r.income - r.salaryLow) * rate),
  };
}

export const FIT_RESULT_CONFIG: Record<FitResult, { label: string; color: string; icon: string; description: string }> = {
  worth_exploring: {
    label: 'Worth Exploring',
    color: 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-800',
    icon: '✅',
    description: 'Your income level and work patterns suggest discussing an S-Corp structure with your CPA could be worthwhile.',
  },
  maybe_later: {
    label: 'Maybe Later',
    color: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800',
    icon: '🔶',
    description: 'Some factors align, but your current income or stability may not justify the additional complexity yet. Worth revisiting as your practice grows.',
  },
  likely_not_now: {
    label: 'Likely Not Now',
    color: 'text-muted-foreground bg-muted/50 border-border',
    icon: '⏸️',
    description: 'Based on your current situation, the costs and complexity of an S-Corp may outweigh the potential benefits. This could change as your practice evolves.',
  },
};

export const PLAYBOOK_SECTIONS = [
  {
    title: 'What Is an S-Corp?',
    content: `An S-Corp is a tax election — not a separate entity type. You form an LLC (or corporation), then file Form 2553 with the IRS to be taxed as an S-Corporation.\n\nThe key difference: instead of all your net income being subject to self-employment (SE) tax, you split it into a **reasonable salary** (subject to payroll taxes) and **distributions** (not subject to SE tax).\n\nThis is the primary tax planning reason relief clinicians consider S-Corp status.`,
    cpaQuestions: ['Is my current income level high enough to benefit from S-Corp taxation?'],
  },
  {
    title: 'How S-Corp Taxation Works',
    content: `As a sole proprietor or single-member LLC, **all** your net business income is subject to the 15.3% self-employment tax (Social Security + Medicare).\n\nWith an S-Corp, you pay yourself a W-2 salary and pay payroll taxes only on that salary. The remaining profit is distributed to you and is **not** subject to SE tax.\n\n**Example concept** (discuss actual numbers with your CPA): If your net income is $120K and you pay yourself $70K salary, only the $70K is subject to payroll taxes — potentially saving thousands annually.`,
    cpaQuestions: ['What would be a reasonable salary for my relief work volume and specialty?'],
  },
  {
    title: 'Common Benefits Worth Reviewing',
    content: `- **SE tax reduction** — The primary financial benefit for most relief professionals\n- **Accountable plan** — Your S-Corp can reimburse business expenses (mileage, CE, licensing) tax-free\n- **Retirement contributions** — S-Corp status opens additional retirement planning strategies\n- **Professional structure** — May provide credibility benefits with facilities and agencies`,
    cpaQuestions: ['Would an accountable plan provide additional tax benefits in my situation?', 'What retirement contribution strategies work best with S-Corp status?'],
  },
  {
    title: 'Requirements & Ongoing Obligations',
    content: `Running an S-Corp adds administrative requirements:\n\n- **Payroll** — Must run regular payroll for yourself (monthly or semi-monthly)\n- **Quarterly payroll taxes** — File and pay employer payroll tax deposits\n- **Annual tax return** — File Form 1120-S (S-Corp return) in addition to your personal return\n- **State requirements** — Many states have separate S-Corp registration, annual reports, and franchise taxes\n- **Reasonable compensation** — Must pay yourself a salary that the IRS considers "reasonable" for your work`,
    cpaQuestions: ['What are my state-specific S-Corp requirements and annual costs?'],
  },
  {
    title: 'Cost of Running an S-Corp',
    content: `Common ongoing costs to discuss with your CPA:\n\n- **Payroll service** — $30–$100/month for a basic self-employed payroll service\n- **Additional tax preparation** — $500–$1,500+ for the S-Corp return (Form 1120-S)\n- **State fees** — Annual registration, franchise tax, or minimum tax (varies by state, $0–$800+)\n- **Bookkeeping** — May need more formal record-keeping\n\nThe general rule: these costs should be significantly less than your SE tax savings for the election to make sense.`,
    cpaQuestions: ['What would my total annual cost be to maintain S-Corp status in my state?', 'At what point do the S-Corp costs outweigh the tax savings?'],
  },
  {
    title: 'When It Typically Makes Sense',
    content: `S-Corp status is most commonly discussed when:\n\n- Net self-employment income consistently exceeds **$80K–$100K+** per year\n- Income is **relatively stable and predictable** month-to-month\n- You plan to continue relief work for the **foreseeable future**\n- You're willing to manage (or outsource) the additional administrative requirements\n- The projected SE tax savings meaningfully exceed the costs of maintaining the structure\n\nThis is a general framework — your CPA can evaluate your specific situation.`,
    cpaQuestions: ['Based on my income trajectory, when would be the optimal time to make the S-Corp election?'],
  },
  {
    title: 'Common Mistakes to Avoid',
    content: `- **Setting salary too low** — The IRS scrutinizes S-Corp owners who pay themselves unreasonably low salaries to minimize payroll taxes\n- **Missing payroll deadlines** — Late payroll tax deposits carry significant penalties\n- **Forgetting state requirements** — Some states don't recognize S-Corp status or have minimum franchise taxes that reduce the benefit\n- **Not running payroll at all** — Taking only distributions without paying salary is a red flag\n- **Electing too early** — If your income is inconsistent or below $60K, the costs may outweigh benefits`,
    cpaQuestions: ['What salary level would the IRS consider reasonable for my type of work?'],
  },
  {
    title: 'Questions to Ask Your CPA',
    content: `Bring these questions to your next CPA meeting:\n\n1. Based on my current and projected income, would S-Corp status save me money after all costs?\n2. What would a "reasonable salary" look like for my relief work?\n3. What are the specific state requirements and costs in my state(s)?\n4. Should I form a new LLC or convert my existing structure?\n5. What's the best timing — calendar year start, or mid-year?\n6. How would this affect my quarterly estimated tax payments?\n7. What payroll service do you recommend for a single-employee S-Corp?`,
    cpaQuestions: [
      'Based on my income, would S-Corp status save me money after all costs?',
      'What would a reasonable salary look like for my relief work?',
      'What are the S-Corp requirements and costs in my state?',
      'What is the best timing to make the election?',
      'How would S-Corp status affect my quarterly estimated tax payments?',
    ],
  },
] as const;
