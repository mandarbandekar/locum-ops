import { describe, it, expect } from 'vitest';
import {
  getDefaultBillingConfig,
  DEFAULT_BILLING_WEEK_END_DAY,
  validateSenderProfile,
  hasBillingContact,
} from '@/lib/invoiceBillingDefaults';

describe('Invoice onboarding', () => {
  describe('Weekly cadence defaults to Saturday', () => {
    it('DEFAULT_BILLING_WEEK_END_DAY is saturday', () => {
      expect(DEFAULT_BILLING_WEEK_END_DAY).toBe('saturday');
    });

    it('getDefaultBillingConfig sets billing_week_end_day to saturday', () => {
      const config = getDefaultBillingConfig('fac-1');
      expect(config.billing_week_end_day).toBe('saturday');
    });
  });

  describe('Profile reuse', () => {
    it('existing profile details are valid without redundant onboarding', () => {
      const result = validateSenderProfile({
        first_name: 'Sarah',
        last_name: 'Mitchell',
        company_name: 'Mitchell Vet Relief LLC',
        company_address: '123 Main St',
        email: 'sarah@example.com',
        phone: '555-0147',
      });
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('missing sender profile details show correct warnings', () => {
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

    it('partial profile with name but no company is invalid', () => {
      const result = validateSenderProfile({
        first_name: 'Jane',
        last_name: 'Doe',
        company_name: '',
        company_address: '',
        email: 'jane@example.com',
        phone: null,
      });
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('company name');
    });
  });

  describe('Facility billing contact reuse', () => {
    it('existing billing contact is detected', () => {
      expect(hasBillingContact({ invoice_name_to: 'Dr. Smith', invoice_email_to: 'smith@clinic.com' })).toBe(true);
    });

    it('missing billing contact is detected', () => {
      expect(hasBillingContact({ invoice_name_to: '', invoice_email_to: '' })).toBe(false);
    });

    it('partial contact (email only) is invalid', () => {
      expect(hasBillingContact({ invoice_name_to: '', invoice_email_to: 'billing@clinic.com' })).toBe(false);
    });

    it('partial contact (name only) is invalid', () => {
      expect(hasBillingContact({ invoice_name_to: 'Dr. Smith', invoice_email_to: '' })).toBe(false);
    });
  });

  describe('Onboarding starts with Facility Billing Setup', () => {
    it('first step is facility billing setup, not invoice profile', () => {
      // The onboarding steps should be: Facility Billing Setup, Payment Methods, Automation Review
      const STEPS = ['Facility Billing Setup', 'Payment Methods', 'Automation Review'];
      expect(STEPS[0]).toBe('Facility Billing Setup');
      expect(STEPS).not.toContain('Invoice Profile');
    });
  });
});
