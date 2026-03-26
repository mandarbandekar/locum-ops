import { describe, it, expect } from 'vitest';
import { getDefaultBillingConfig, DEFAULT_BILLING_WEEK_END_DAY, validateSenderProfile, hasBillingContact } from '@/lib/invoiceBillingDefaults';

describe('Facility Invoicing Preferences', () => {
  it('weekly cadence defaults to Saturday', () => {
    const config = getDefaultBillingConfig('fac-1');
    expect(config.billing_week_end_day).toBe('saturday');
    expect(DEFAULT_BILLING_WEEK_END_DAY).toBe('saturday');
  });

  it('billing contact is auto-reused when present', () => {
    const facility = { invoice_name_to: 'Jane Doe', invoice_email_to: 'jane@clinic.com' };
    expect(hasBillingContact(facility)).toBe(true);
  });

  it('missing billing contact warning appears when absent', () => {
    expect(hasBillingContact({ invoice_name_to: '', invoice_email_to: '' })).toBe(false);
    expect(hasBillingContact({ invoice_name_to: 'Jane', invoice_email_to: '' })).toBe(false);
    expect(hasBillingContact({ invoice_name_to: '', invoice_email_to: 'jane@clinic.com' })).toBe(false);
  });

  it('auto-generate cannot be fully enabled if required billing contact is missing', () => {
    // Simulates the component logic: auto-generate is blocked without contact
    const facility = { invoice_name_to: '', invoice_email_to: '' };
    const hasContact = hasBillingContact(facility);
    const autoGenerate = true;
    const finalAutoGenerate = hasContact ? autoGenerate : false;
    expect(finalAutoGenerate).toBe(false);
  });

  it('auto-generate works when billing contact is present', () => {
    const facility = { invoice_name_to: 'Jane', invoice_email_to: 'jane@clinic.com' };
    const hasContact = hasBillingContact(facility);
    const autoGenerate = true;
    const finalAutoGenerate = hasContact ? autoGenerate : false;
    expect(finalAutoGenerate).toBe(true);
  });

  it('existing invoicing preferences display correctly', () => {
    const config = getDefaultBillingConfig('fac-2');
    expect(config.billing_cadence).toBe('monthly');
    expect(config.auto_generate).toBe(true);
    expect(config.biweekly_anchor_date).toBeNull();
  });

  it('validates sender profile correctly', () => {
    const valid = validateSenderProfile({
      first_name: 'John',
      last_name: 'Doe',
      company_name: 'VetRelief LLC',
      company_address: '123 Main St',
      email: 'john@vetrelief.com',
      phone: null,
    });
    expect(valid.valid).toBe(true);
    expect(valid.missing).toHaveLength(0);
  });

  it('flags missing sender profile fields', () => {
    const result = validateSenderProfile({
      first_name: '',
      last_name: '',
      company_name: '',
      company_address: '',
      email: null,
      phone: null,
    });
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('name');
    expect(result.missing).toContain('company name');
    expect(result.missing).toContain('email');
  });
});
