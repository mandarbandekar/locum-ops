import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Car, ShieldCheck, GraduationCap, Heart, Laptop, Briefcase,
  Home, Wrench, PiggyBank, Utensils, HelpCircle, FileText
} from 'lucide-react';

const CATEGORY_CARDS = [
  {
    title: 'Mileage & Travel',
    description: 'Per-mile logging, tolls, parking, flights to distant clinics',
    groupKey: 'travel_vehicle',
    defaultSub: 'mileage',
    badge: 'Schedule C',
    badgeClass: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
    icon: Car,
  },
  {
    title: 'Professional Licenses',
    description: 'State DVM, DEA, USDA accreditation, board certs',
    groupKey: 'professional_compliance',
    defaultSub: 'dvm_license',
    badge: 'Deductible',
    badgeClass: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
    icon: FileText,
  },
  {
    title: 'Continuing Education',
    description: 'CE courses, conferences, journals, online subscriptions',
    groupKey: 'education_development',
    defaultSub: 'ce_conference',
    badge: 'Deductible',
    badgeClass: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
    icon: GraduationCap,
  },
  {
    title: 'Malpractice Insurance',
    description: 'E&O, liability, disability, workers comp',
    groupKey: 'insurance',
    defaultSub: 'malpractice_eo',
    badge: 'Deductible',
    badgeClass: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
    icon: ShieldCheck,
  },
  {
    title: 'Health Insurance',
    description: 'Self-employed health insurance premiums',
    groupKey: 'insurance',
    defaultSub: 'health_insurance',
    badge: 'Above-the-Line',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
    icon: Heart,
  },
  {
    title: 'Professional Software',
    description: 'ReliefVet OS, VIN, scheduling apps, phone & internet',
    groupKey: 'technology_software',
    defaultSub: 'reliefvet_os',
    badge: 'Deductible',
    badgeClass: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
    icon: Laptop,
  },
  {
    title: 'S-Corp / Business Admin',
    description: 'CPA fees, legal, LLC, banking, payroll processing',
    groupKey: 'business_operations',
    defaultSub: 'cpa_tax_prep',
    badge: 'Deductible',
    badgeClass: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
    icon: Briefcase,
  },
  {
    title: 'Home Office',
    description: 'Simplified method: $5/sq ft up to 300 sq ft',
    groupKey: 'home_office',
    defaultSub: 'home_office_deduction',
    badge: 'Schedule C',
    badgeClass: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
    icon: Home,
  },
  {
    title: 'Equipment & Scrubs',
    description: 'Stethoscope, otoscope, PPE, scrubs, medical bags',
    groupKey: 'equipment_supplies',
    defaultSub: 'medical_equipment',
    badge: 'Deductible',
    badgeClass: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
    icon: Wrench,
  },
  {
    title: 'Retirement Contributions',
    description: 'SEP-IRA and Solo 401(k) contributions',
    groupKey: 'retirement',
    defaultSub: 'sep_ira',
    badge: 'Schedule 1',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
    icon: PiggyBank,
  },
  {
    title: 'Meals & Entertainment',
    description: 'Business meals during travel or with contacts',
    groupKey: 'meals_entertainment',
    defaultSub: 'business_meals',
    badge: '50% Rule',
    badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700',
    icon: Utensils,
  },
  {
    title: 'Other / Uncategorized',
    description: 'Add a description and manually assign deductibility',
    groupKey: 'uncategorized',
    defaultSub: 'other',
    badge: 'Custom',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    icon: HelpCircle,
  },
];

interface Props {
  onSelectCategory: (defaultSubcategory: string) => void;
}

export default function ExpenseCategoryGrid({ onSelectCategory }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Log an Expense
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CATEGORY_CARDS.map(cat => (
          <Card
            key={cat.defaultSub}
            className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
            onClick={() => onSelectCategory(cat.defaultSub)}
          >
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <cat.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold text-sm">{cat.title}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{cat.description}</p>
              <Badge variant="outline" className={`text-[10px] w-fit mt-auto ${cat.badgeClass}`}>
                {cat.badge}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
