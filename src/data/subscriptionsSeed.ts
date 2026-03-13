// Seed data for Required Subscriptions
// These are demo subscriptions to populate the tab for new users

export const SUBSCRIPTION_SEEDS = [
  {
    name: 'VIN (Veterinary Information Network)',
    provider: 'VIN',
    category: 'reference_tool',
    renewal_date: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 6);
      return d.toISOString().split('T')[0];
    })(),
    billing_frequency: 'annual',
    cost: 549,
    currency: 'USD',
    status: 'active',
    website_url: 'https://www.vin.com',
    notes: 'Primary clinical reference and CE resource',
    auto_renew: true,
    used_for: 'general_reference',
  },
  {
    name: "Plumb's Veterinary Drugs",
    provider: "Plumb's",
    category: 'reference_tool',
    renewal_date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 18);
      return d.toISOString().split('T')[0];
    })(),
    billing_frequency: 'annual',
    cost: 324,
    currency: 'USD',
    status: 'active',
    website_url: 'https://www.plumbsveterinarydrugs.com',
    notes: 'Drug reference — renewal coming up',
    auto_renew: false,
    used_for: 'prescriptions',
  },
  {
    name: 'AVMA Membership',
    provider: 'American Veterinary Medical Association',
    category: 'membership',
    renewal_date: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return d.toISOString().split('T')[0];
    })(),
    billing_frequency: 'annual',
    cost: 370,
    currency: 'USD',
    status: 'active',
    website_url: 'https://www.avma.org',
    notes: 'Professional association membership — expired, needs renewal',
    auto_renew: false,
    used_for: 'relief_work',
  },
];
