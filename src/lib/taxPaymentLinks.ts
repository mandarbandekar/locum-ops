/**
 * Tax Payment Links — IRS and state portal URLs + account guidance.
 * Static data file; no API calls.
 */

import { getQuarterlyDueDates } from '@/lib/taxConstants2026';

export const IRS_PAYMENT = {
  directPay: {
    url: 'https://directpay.irs.gov',
    label: 'IRS Direct Pay',
    description: 'Free, direct from your personal bank account. No registration required.',
    accountType: 'personal' as const,
    paymentType: '1040-ES Estimated Tax',
    bestFor: ['1099', 'scorp_personal'],
  },
  eftps: {
    url: 'https://www.eftps.gov',
    label: 'EFTPS',
    description: 'Electronic Federal Tax Payment System. Required for business payroll deposits. Free but requires prior enrollment.',
    accountType: 'business' as const,
    paymentType: '1120-S or payroll deposits',
    bestFor: ['scorp_business'],
  },
};

export interface StatePaymentLink {
  name: string;
  url: string | null;
  label: string;
  personalAndBusiness: boolean;
  businessUrl?: string;
  pteUrl?: string;
  pteLabel?: string;
}

export const STATE_PAYMENT_LINKS: Record<string, StatePaymentLink> = {
  AL: { name: 'Alabama',        url: 'https://myalabamataxes.alabama.gov', label: 'My Alabama Taxes',          personalAndBusiness: true  },
  AK: { name: 'Alaska',         url: null,                                  label: 'No income tax',             personalAndBusiness: false },
  AZ: { name: 'Arizona',        url: 'https://aztaxes.gov',                 label: 'AZTaxes.gov',               personalAndBusiness: true  },
  AR: { name: 'Arkansas',       url: 'https://atap.arkansas.gov',           label: 'ATAP Arkansas',             personalAndBusiness: true  },
  CA: { name: 'California',     url: 'https://www.ftb.ca.gov/pay',          label: 'CA FTB Web Pay',            personalAndBusiness: true,
        businessUrl: 'https://www.ftb.ca.gov/pay/payment-options.html',
        pteUrl: 'https://www.ftb.ca.gov/file/business/credits/pass-through-entity-elective-tax.html',
        pteLabel: 'CA PTE Tax Payment' },
  CO: { name: 'Colorado',       url: 'https://revenue.colorado.gov/file-pay', label: 'Revenue Online CO',       personalAndBusiness: true  },
  CT: { name: 'Connecticut',    url: 'https://myconnect.ct.gov',            label: 'myconneCT',                 personalAndBusiness: true  },
  DE: { name: 'Delaware',       url: 'https://revenue.delaware.gov',        label: 'DE Revenue',                personalAndBusiness: true  },
  FL: { name: 'Florida',        url: null,                                  label: 'No income tax',             personalAndBusiness: false },
  GA: { name: 'Georgia',        url: 'https://gtc.dor.ga.gov',              label: 'Georgia Tax Center',        personalAndBusiness: true  },
  HI: { name: 'Hawaii',         url: 'https://hitax.hawaii.gov',            label: 'Hawaii Tax Online',         personalAndBusiness: true  },
  ID: { name: 'Idaho',          url: 'https://tax.idaho.gov/epay',          label: 'Idaho Tax Commission',      personalAndBusiness: true  },
  IL: { name: 'Illinois',       url: 'https://mytax.illinois.gov',          label: 'MyTax Illinois',            personalAndBusiness: true  },
  IN: { name: 'Indiana',        url: 'https://intime.dor.in.gov',           label: 'INTIME Indiana',            personalAndBusiness: true  },
  IA: { name: 'Iowa',           url: 'https://tax.iowa.gov',                label: 'Iowa Department of Revenue',personalAndBusiness: true  },
  KS: { name: 'Kansas',         url: 'https://www.kdor.ks.gov/Apps/kcsc',   label: 'Kansas Customer Service',   personalAndBusiness: true  },
  KY: { name: 'Kentucky',       url: 'https://onestop.ky.gov',              label: 'KY One Stop',               personalAndBusiness: true  },
  LA: { name: 'Louisiana',      url: 'https://latap.revenue.louisiana.gov', label: 'LaTAP',                     personalAndBusiness: true  },
  ME: { name: 'Maine',          url: 'https://portal.maine.gov/tax',        label: 'Maine Revenue Services',    personalAndBusiness: true  },
  MD: { name: 'Maryland',       url: 'https://interactive.marylandtaxes.gov', label: 'Maryland Tax Connect',    personalAndBusiness: true  },
  MA: { name: 'Massachusetts',  url: 'https://mtc.dor.state.ma.us',         label: 'MassTaxConnect',            personalAndBusiness: true  },
  MI: { name: 'Michigan',       url: 'https://www.michigan.gov/taxes',      label: 'Michigan Treasury Online',  personalAndBusiness: true  },
  MN: { name: 'Minnesota',      url: 'https://www.mndor.state.mn.us',       label: 'MN e-Services',             personalAndBusiness: true  },
  MS: { name: 'Mississippi',    url: 'https://tap.dor.ms.gov',              label: 'Taxpayer Access Point MS',  personalAndBusiness: true  },
  MO: { name: 'Missouri',       url: 'https://mytax.mo.gov',                label: 'MyTax Missouri',            personalAndBusiness: true  },
  MT: { name: 'Montana',        url: 'https://tap.dor.mt.gov',              label: 'TransAction Portal MT',     personalAndBusiness: true  },
  NE: { name: 'Nebraska',       url: 'https://pay.nebraska.gov',            label: 'Nebraska e-Pay',            personalAndBusiness: true  },
  NV: { name: 'Nevada',         url: null,                                  label: 'No income tax',             personalAndBusiness: false },
  NH: { name: 'New Hampshire',  url: null,                                  label: 'No income tax',             personalAndBusiness: false },
  NJ: { name: 'New Jersey',     url: 'https://www1.state.nj.us/TYTR_RevTaxPortal', label: 'NJ Tax Portal',    personalAndBusiness: true  },
  NM: { name: 'New Mexico',     url: 'https://tap.state.nm.us',             label: 'Taxpayer Access NM',        personalAndBusiness: true  },
  NY: { name: 'New York',       url: 'https://www.tax.ny.gov/pay',          label: 'NY Tax Online Services',    personalAndBusiness: true,
        businessUrl: 'https://www.tax.ny.gov/bus/ads/ptetelig.htm',
        pteUrl: 'https://www.tax.ny.gov/pit/pte/pass-through-entity-tax.htm',
        pteLabel: 'NY PTE Tax Payment' },
  NC: { name: 'North Carolina', url: 'https://www.ncdor.gov/file-pay',      label: 'NC DOR File & Pay',         personalAndBusiness: true  },
  ND: { name: 'North Dakota',   url: 'https://apps.nd.gov/tax/tap',         label: 'ND Taxpayer Access',        personalAndBusiness: true  },
  OH: { name: 'Ohio',           url: 'https://gateway.ohio.gov',            label: 'Ohio Business Gateway',     personalAndBusiness: true  },
  OK: { name: 'Oklahoma',       url: 'https://oktap.tax.ok.gov',            label: 'OkTAP',                     personalAndBusiness: true  },
  OR: { name: 'Oregon',         url: 'https://revenueonline.dor.oregon.gov',label: 'Revenue Online OR',         personalAndBusiness: true  },
  PA: { name: 'Pennsylvania',   url: 'https://mypath.pa.gov',               label: 'myPATH Pennsylvania',       personalAndBusiness: true  },
  RI: { name: 'Rhode Island',   url: 'https://taxportal.ri.gov',            label: 'RI Division of Taxation',   personalAndBusiness: true  },
  SC: { name: 'South Carolina', url: 'https://mydorway.dor.sc.gov',         label: 'MyDORWAY',                  personalAndBusiness: true  },
  SD: { name: 'South Dakota',   url: null,                                  label: 'No income tax',             personalAndBusiness: false },
  TN: { name: 'Tennessee',      url: null,                                  label: 'No income tax',             personalAndBusiness: false },
  TX: { name: 'Texas',          url: null,                                  label: 'No income tax',             personalAndBusiness: false },
  UT: { name: 'Utah',           url: 'https://tap.utah.gov',                label: 'Utah TAP',                  personalAndBusiness: true  },
  VT: { name: 'Vermont',        url: 'https://myvermonttaxes.vermont.gov',  label: 'myVTax',                    personalAndBusiness: true  },
  VA: { name: 'Virginia',       url: 'https://www.individual.tax.virginia.gov', label: 'VA Tax Individual',     personalAndBusiness: true  },
  WA: { name: 'Washington',     url: null,                                  label: 'No income tax',             personalAndBusiness: false },
  WV: { name: 'West Virginia',  url: 'https://mytaxes.wv.gov',              label: 'MyTaxes WV',                personalAndBusiness: true  },
  WI: { name: 'Wisconsin',      url: 'https://tap.revenue.wi.gov',          label: 'Wisconsin TAP',             personalAndBusiness: true  },
  WY: { name: 'Wyoming',        url: null,                                  label: 'No income tax',             personalAndBusiness: false },
  DC: { name: 'Washington DC',  url: 'https://mytax.dc.gov',                label: 'MyTax DC',                  personalAndBusiness: true  },
};

export interface PaymentAccountGuidance {
  account: 'personal' | 'business';
  label: string;
  reason: string;
  warning: string | null;
  portal: string;
}

export function getPaymentAccountGuidance(
  entityType: string,
  paymentDestination: string,
): PaymentAccountGuidance {
  if (entityType === '1099' || entityType === 'sole_prop') {
    return {
      account: 'personal',
      label: 'Pay from your personal account',
      reason: 'As a sole proprietor, you and your business are the same legal entity for tax purposes. Your 1040-ES is a personal tax obligation. Pay from your personal checking account.',
      warning: null,
      portal: 'IRS Direct Pay',
    };
  }

  if (entityType === 'scorp') {
    if (paymentDestination === 'federal_1040es') {
      return {
        account: 'personal',
        label: 'Pay from your personal account',
        reason: 'Your quarterly 1040-ES covers income tax on your W-2 salary and K-1 distributions — both are personal income. This is not an S-Corp obligation. Pay from your personal checking account via IRS Direct Pay.',
        warning: 'Do not pay your 1040-ES from your S-Corp business account. It is not a deductible business expense and creates accounting complications.',
        portal: 'IRS Direct Pay',
      };
    }
    if (paymentDestination === 'state_personal') {
      return {
        account: 'personal',
        label: 'Pay from your personal account',
        reason: "Your personal state estimated tax (on salary + distributions) is a personal obligation. Pay from your personal checking account through your state's individual tax portal.",
        warning: null,
        portal: 'State individual tax portal',
      };
    }
    if (paymentDestination === 'state_pte') {
      return {
        account: 'business',
        label: 'Pay from your S-Corp business account',
        reason: "PTE tax is paid by the S-Corp entity — not by you personally. It is a deductible business expense that reduces your K-1 distribution. It must be paid from your S-Corp business checking account through your state's business tax portal.",
        warning: 'Do not pay PTE tax from your personal account. It must originate from the S-Corp to qualify as a business deduction.',
        portal: 'State business tax portal',
      };
    }
    if (paymentDestination === 'payroll_fica') {
      return {
        account: 'business',
        label: 'Pay from your S-Corp business account',
        reason: 'Payroll tax deposits (FICA) are an S-Corp obligation paid through your payroll system. This is handled automatically if you use Gusto, QuickBooks Payroll, or a similar service. Do not pay this manually through EFTPS unless your payroll provider instructs you to.',
        warning: 'If your payroll service is not automatically depositing FICA, contact them immediately. Late payroll tax deposits carry significant penalties.',
        portal: 'Your payroll provider (Gusto, QuickBooks, etc.)',
      };
    }
  }

  // Fallback
  return {
    account: 'personal',
    label: 'Pay from your personal account',
    reason: 'When in doubt, quarterly estimated taxes are generally a personal obligation.',
    warning: null,
    portal: 'IRS Direct Pay',
  };
}

/** Get quarterly due dates for deadline reminders */
export const QUARTERLY_DUE_DATES = getQuarterlyDueDates;
