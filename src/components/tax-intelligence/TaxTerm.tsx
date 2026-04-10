import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

const TAX_GLOSSARY: Record<string, string> = {
  k1_distribution:
    'Profits passed from your S-Corp to you personally. Unlike W-2 wages, K-1 distributions are not subject to self-employment (FICA) tax — that\'s the main S-Corp tax advantage.',
  se_tax:
    'Self-employment tax covers Social Security (12.4%) and Medicare (2.9%) — totaling 15.3% on net earnings. As a 1099 contractor, you pay both the employee and employer halves.',
  agi:
    'Adjusted Gross Income — your total income minus specific adjustments like the SE tax deduction and retirement contributions. AGI determines your tax bracket.',
  marginal_rate:
    'The tax rate applied to your next dollar of income. For example, a 24% marginal rate means each additional $1 earned is taxed at $0.24.',
  effective_rate:
    'Your overall average tax rate — total tax divided by total income. This is typically lower than your marginal rate because income is taxed in graduated brackets.',
  employer_fica:
    'The employer portion of FICA taxes (7.65%) that your S-Corp pays on your W-2 salary. This is a deductible business expense for the corporation.',
  '1040es':
    'IRS Form 1040-ES is used to pay estimated quarterly taxes on income that isn\'t subject to withholding — like your 1099 income or S-Corp K-1 distributions.',
  standard_deduction:
    'A fixed dollar amount that reduces your taxable income. Most filers use the standard deduction rather than itemizing. The amount depends on your filing status.',
  w2_salary:
    'The wages you pay yourself from your S-Corp. The IRS requires this to be "reasonable compensation" for the work you do. Payroll taxes (FICA) apply to this amount.',
  reasonable_compensation:
    'The salary amount the IRS considers fair for the work you perform through your S-Corp. Most relief vet CPAs recommend setting this at 40–60% of net profit.',
  schedule_c:
    'The IRS form where sole proprietors and single-member LLCs report business income and expenses. Your net profit from Schedule C flows to your personal 1040.',
  '1120s':
    'The tax return filed by S-Corporations. It reports the company\'s income, deductions, and each shareholder\'s share of profit (K-1).',
  filing_status_mfj:
    'Married Filing Jointly — you and your spouse combine income and deductions on one return. This usually results in lower tax brackets and a higher standard deduction.',
  filing_status_hoh:
    'Head of Household — available if you\'re unmarried and pay more than half the cost of maintaining a home for a qualifying dependent. Offers better brackets than Single.',
  retirement_sep:
    'A Simplified Employee Pension IRA. You can contribute up to 25% of net self-employment income (max $70,000 for 2026). Contributions are tax-deductible.',
  retirement_solo401k:
    'A Solo 401(k) for self-employed individuals. You can contribute as both employee ($23,500) and employer (25% of compensation), up to $70,000 total.',
  extra_withholding:
    'Additional federal tax withheld from each S-Corp paycheck beyond the standard amount. Many S-Corp owners use this to cover tax on distributions and avoid quarterly payments.',
  net_income:
    'Your gross income minus business expenses. This is the amount subject to self-employment tax (for 1099) or used to calculate your S-Corp salary and distributions.',
  quarterly_payment:
    'Estimated tax payments due four times a year to the IRS (and often your state). These cover income tax and SE tax on earnings not subject to payroll withholding.',
  federal_taxable_income:
    'Your AGI minus the standard deduction (or itemized deductions). This is the amount that\'s actually run through the federal tax brackets.',
  pte:
    'Pass-Through Entity tax — an optional state-level election where your S-Corp pays state income tax at the entity level. This can convert a non-deductible personal expense into a deductible business expense.',
  fica:
    'Federal Insurance Contributions Act — the combined Social Security and Medicare taxes. Employees pay 7.65%, and employers match it. Self-employed individuals pay both halves (15.3%).',
  spouse_withholding:
    'Federal income tax withheld from your spouse\'s W-2 paychecks by their employer. When filing jointly, this withholding reduces your household\'s remaining tax obligation.',
  se_deduction:
    'You can deduct the employer-equivalent portion (50%) of your self-employment tax when calculating AGI. This partially offsets the double-FICA burden of being self-employed.',
};

export type TaxTermKey = keyof typeof TAX_GLOSSARY;

interface TaxTermProps {
  term: string;
  children: ReactNode;
  className?: string;
}

export default function TaxTerm({ term, children, className = '' }: TaxTermProps) {
  const definition = TAX_GLOSSARY[term];
  if (!definition) {
    return <span className={className}>{children}</span>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-0.5 border-b border-dotted border-muted-foreground/40 cursor-help ${className}`}
          >
            {children}
            <HelpCircle className="h-3 w-3 text-muted-foreground/60 shrink-0" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          {definition}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
