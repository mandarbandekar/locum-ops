import { describe, it, expect } from 'vitest';
import { getCheckerOutput, DEFAULT_PROFILE } from '@/components/tax-strategy/GuidanceTab';
import { DEFAULT_DEDUCTION_CATEGORIES, DEFAULT_CPA_QUESTIONS, DEFAULT_CHECKLIST_ITEMS } from '@/hooks/useTaxCopilot';
import { aggregateQuarterlyIncome, calculateSetAside, generateTaxExportCSV, getDefaultDueDates } from '@/lib/taxCalculations';
import type { Invoice } from '@/types';

function makeInvoice(overrides: Partial<Invoice>): Invoice {
  return {
    id: 'test-inv', facility_id: 'f1', invoice_number: 'INV-001',
    invoice_date: '2026-01-01', period_start: '2026-01-01', period_end: '2026-01-15',
    total_amount: 1000, balance_due: 0, status: 'paid', sent_at: null,
    paid_at: '2026-01-20', due_date: null, notes: '',
    share_token: null, share_token_created_at: null, share_token_revoked_at: null,
    invoice_type: 'single',
    generation_type: 'manual',
    billing_cadence: null,
    ...overrides,
  };
}

describe('Tax Strategy Module', () => {
  describe('Reserve calculation', () => {
    it('reserve reflects user-set % and tracked paid income', () => {
      const invoices = [
        makeInvoice({ id: 'i1', total_amount: 5000, paid_at: '2026-02-15' }),
        makeInvoice({ id: 'i2', total_amount: 3000, paid_at: '2026-05-10' }),
      ];
      const quarterly = aggregateQuarterlyIncome(invoices, 2026);
      const setAside = calculateSetAside(quarterly, 'percent', 25, 0);
      const totalIncome = quarterly.reduce((s, q) => s + q.income, 0);
      const totalReserve = setAside.reduce((s, q) => s + q.amount, 0);
      expect(totalIncome).toBe(8000);
      expect(totalReserve).toBe(2000);
    });
  });

  describe('Readiness score', () => {
    it('updates when checklist items are completed', () => {
      const items = DEFAULT_CHECKLIST_ITEMS.map((item, i) => ({
        ...item, completed: i < 6, completed_at: i < 6 ? '2026-01-01' : null,
      }));
      const completed = items.filter(c => c.completed).length;
      const percent = Math.round((completed / items.length) * 100);
      expect(percent).toBe(50);
    });
  });

  describe('CPA questions', () => {
    it('default questions are generated and exist', () => {
      expect(DEFAULT_CPA_QUESTIONS.length).toBeGreaterThanOrEqual(5);
      expect(DEFAULT_CPA_QUESTIONS[0]).toContain('relief');
    });
  });

  describe('Deduction categories', () => {
    it('default categories include locum-specific items', () => {
      expect(DEFAULT_DEDUCTION_CATEGORIES).toContain('CE / Licensing');
      expect(DEFAULT_DEDUCTION_CATEGORIES).toContain('Mileage Between Clinics / Facilities');
      expect(DEFAULT_DEDUCTION_CATEGORIES).toContain('Professional Insurance / Malpractice');
      expect(DEFAULT_DEDUCTION_CATEGORIES.length).toBe(16);
    });
  });

  describe('Entity guidance checker', () => {
    it('returns neutral outputs only — never says switch or better', () => {
      const profile = {
        ...DEFAULT_PROFILE,
        projected_annual_profit: 150000,
        stable_income: true,
        multi_facility_work: true,
        retirement_interest: true,
        income_up_this_year: true,
        relief_income_major_source: true,
      };
      const results = getCheckerOutput(profile);
      results.forEach(r => {
        expect(r.toLowerCase()).not.toContain('switch to');
        expect(r.toLowerCase()).not.toContain('this is better');
        expect(r.toLowerCase()).not.toContain('will save');
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns simple guidance for low-income profiles', () => {
      const results = getCheckerOutput(DEFAULT_PROFILE);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('CSV export', () => {
    it('generates successfully', () => {
      const quarterly = aggregateQuarterlyIncome([], 2026);
      const setAside = calculateSetAside(quarterly, 'percent', 30, 0);
      const csv = generateTaxExportCSV(2026, quarterly, setAside, 'percent', 30, 0, [
        { quarter: 1, due_date: '2026-04-15', status: 'not_started', notes: '' },
      ]);
      expect(csv).toContain('2026');
      expect(csv.length).toBeGreaterThan(50);
    });
  });
});
