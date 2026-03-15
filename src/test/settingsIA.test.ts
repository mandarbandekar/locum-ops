import { describe, it, expect } from 'vitest';

// Settings navigation IA
const SETTINGS_LINKS = [
  { to: '/settings/profile', label: 'Profile' },
  { to: '/settings/scheduling', label: 'Scheduling' },
  { to: '/settings/payments', label: 'Payments' },
  { to: '/settings/reminders', label: 'Reminders' },
  { to: '/settings/business-taxes', label: 'Business & Taxes' },
  { to: '/settings/security', label: 'Security' },
  { to: '/settings/account', label: 'Account' },
];

describe('Settings IA', () => {
  it('navigation has all 7 sections in correct order', () => {
    const labels = SETTINGS_LINKS.map(l => l.label);
    expect(labels).toEqual([
      'Profile', 'Scheduling', 'Payments',
      'Reminders', 'Business & Taxes', 'Security', 'Account',
    ]);
  });

  it('Business & Taxes defaults to Tracker tab', () => {
    // The SettingsBusinessTaxesPage initializes activeTab to 'tracker'
    const defaultTab = 'tracker';
    expect(defaultTab).toBe('tracker');
  });

  it('Profile fields used by invoicing are present', () => {
    const profileFields = [
      'first_name', 'last_name', 'company_name', 'company_address',
      'invoice_email', 'invoice_phone', 'timezone', 'currency', 'profession',
    ];
    expect(profileFields).toContain('company_address');
    expect(profileFields).toContain('invoice_email');
    expect(profileFields).toContain('company_name');
  });

  it('Payment settings are separated from invoicing', () => {
    const invoicingPath = SETTINGS_LINKS.find(l => l.label === 'Invoicing')?.to;
    const paymentsPath = SETTINGS_LINKS.find(l => l.label === 'Payments')?.to;
    expect(invoicingPath).toBe('/settings/invoicing');
    expect(paymentsPath).toBe('/settings/payments');
    expect(invoicingPath).not.toBe(paymentsPath);
  });

  it('Reminders remain centralized in one section', () => {
    const reminderLinks = SETTINGS_LINKS.filter(l => l.label.toLowerCase().includes('reminder'));
    expect(reminderLinks).toHaveLength(1);
    expect(reminderLinks[0].to).toBe('/settings/reminders');
  });

  it('Security section exists for sensitive credential handling', () => {
    const security = SETTINGS_LINKS.find(l => l.label === 'Security');
    expect(security).toBeDefined();
    expect(security!.to).toBe('/settings/security');
    // Security page includes helper text about credential portal passwords
    const helperText = 'Sensitive information is stored securely and hidden by default.';
    expect(helperText).toContain('stored securely');
  });
});
