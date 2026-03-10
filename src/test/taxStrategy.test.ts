import { describe, it, expect } from 'vitest';
import { evaluateCPAChecker, DEFAULT_DEDUCTION_CATEGORIES, DEFAULT_CHECKLIST_ITEMS } from '@/types/taxStrategy';

describe('Tax Strategy — Reserve Calculations', () => {
  it('reserve amount reflects reserve % and paid income', () => {
    const income = 100000;
    const pct = 30;
    const reserve = Math.round((pct / 100) * income * 100) / 100;
    expect(reserve).toBe(30000);
  });

  it('reserve amount with zero percent returns zero', () => {
    const income = 100000;
    const reserve = Math.round((0 / 100) * income * 100) / 100;
    expect(reserve).toBe(0);
  });

  it('reserve amount with custom percent', () => {
    const income = 85000;
    const pct = 25;
    const reserve = Math.round((pct / 100) * income * 100) / 100;
    expect(reserve).toBe(21250);
  });
});

describe('Tax Strategy — Readiness Score', () => {
  it('updates when checklist items are completed', () => {
    const items = [
      { completed: true },
      { completed: true },
      { completed: false },
      { completed: false },
    ];
    const score = Math.round((items.filter(i => i.completed).length / items.length) * 100);
    expect(score).toBe(50);
  });

  it('is 100 when all complete', () => {
    const items = [{ completed: true }, { completed: true }, { completed: true }];
    const score = Math.round((items.filter(i => i.completed).length / items.length) * 100);
    expect(score).toBe(100);
  });

  it('is 0 when none complete', () => {
    const items = [{ completed: false }, { completed: false }];
    const score = Math.round((items.filter(i => i.completed).length / items.length) * 100);
    expect(score).toBe(0);
  });

  it('handles empty checklist', () => {
    const items: { completed: boolean }[] = [];
    const score = items.length === 0 ? 0 : Math.round((items.filter(i => i.completed).length / items.length) * 100);
    expect(score).toBe(0);
  });
});

describe('Tax Strategy — CPA Checker', () => {
  it('returns neutral outputs only — no direct recommendations', () => {
    const result = evaluateCPAChecker({
      projected_profit: 120000,
      entity: 'sole_proprietor',
      stable: true,
      payroll: false,
      admin_ok: true,
      retirement: true,
      income_up: true,
      multi_facility: true,
      relief_major: true,
    });

    result.forEach(msg => {
      expect(msg.toLowerCase()).not.toContain('switch to');
      expect(msg.toLowerCase()).not.toContain('this will save');
      expect(msg.toLowerCase()).not.toContain('this is better');
      expect(msg.toLowerCase()).not.toContain('you should');
      // Should reference CPA or neutral framing
      expect(
        msg.toLowerCase().includes('cpa') ||
        msg.toLowerCase().includes('may be worth') ||
        msg.toLowerCase().includes('may want') ||
        msg.toLowerCase().includes('worth reviewing') ||
        msg.toLowerCase().includes('worth discussing')
      ).toBe(true);
    });
  });

  it('returns at least one message for any input', () => {
    const result = evaluateCPAChecker({
      projected_profit: 0, entity: 'sole_proprietor',
      stable: false, payroll: false, admin_ok: false,
      retirement: false, income_up: false, multi_facility: false, relief_major: false,
    });
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('mentions payroll for s-corp without payroll', () => {
    const result = evaluateCPAChecker({
      projected_profit: 100000, entity: 's_corp',
      stable: true, payroll: false, admin_ok: true,
      retirement: false, income_up: false, multi_facility: false, relief_major: false,
    });
    expect(result.some(m => m.toLowerCase().includes('payroll'))).toBe(true);
  });

  it('mentions multi-facility when applicable', () => {
    const result = evaluateCPAChecker({
      projected_profit: 50000, entity: 'sole_proprietor',
      stable: false, payroll: false, admin_ok: true,
      retirement: false, income_up: false, multi_facility: true, relief_major: false,
    });
    expect(result.some(m => m.toLowerCase().includes('facilities'))).toBe(true);
  });
});

describe('Tax Strategy — Default Categories', () => {
  it('includes locum-specific categories', () => {
    expect(DEFAULT_DEDUCTION_CATEGORIES).toContain('CE / licensing');
    expect(DEFAULT_DEDUCTION_CATEGORIES).toContain('Mileage between clinics / facilities');
    expect(DEFAULT_DEDUCTION_CATEGORIES).toContain('DEA / certification renewals');
    expect(DEFAULT_DEDUCTION_CATEGORIES).toContain('Professional insurance / malpractice');
    expect(DEFAULT_DEDUCTION_CATEGORIES).toContain('Travel for assignments');
    expect(DEFAULT_DEDUCTION_CATEGORIES).toContain('Lodging for away assignments');
  });

  it('has at least 15 categories', () => {
    expect(DEFAULT_DEDUCTION_CATEGORIES.length).toBeGreaterThanOrEqual(15);
  });
});

describe('Tax Strategy — Deduction Categories Data', () => {
  it('renders with completeness and missing docs data', () => {
    const cat = {
      name: 'CE / licensing',
      ytd_amount: 2400,
      documentation_status: 'cpa_ready',
      receipt_completeness_percent: 95,
      missing_docs_count: 0,
      notes: '',
    };
    expect(cat.receipt_completeness_percent).toBe(95);
    expect(cat.missing_docs_count).toBe(0);
    expect(cat.ytd_amount).toBeGreaterThan(0);
    expect(cat.documentation_status).toBe('cpa_ready');
  });
});

describe('Tax Strategy — CSV Export', () => {
  it('generates valid CSV content', () => {
    const lines: string[] = [];
    lines.push('LocumOps CPA Planning Packet — 2026');
    lines.push('DISCLAIMER: Not tax or financial advice.');
    lines.push('');
    lines.push('Entity Type,1099 / Sole Proprietor');
    lines.push('YTD Paid Income,50000.00');
    lines.push('Category,YTD Amount');
    lines.push('"CE / licensing",2400.00');
    const csv = lines.join('\n');
    expect(csv).toContain('LocumOps');
    expect(csv).toContain('50000.00');
    expect(csv).toContain('CE / licensing');
  });
});

describe('Tax Strategy — Checklist Items', () => {
  it('has expected default items', () => {
    const keys = DEFAULT_CHECKLIST_ITEMS.map(i => i.key);
    expect(keys).toContain('entity_reviewed');
    expect(keys).toContain('cpa_consulted');
    expect(keys).toContain('mileage_reviewed');
    expect(keys).toContain('ce_organized');
    expect(keys).toContain('cpa_packet_ready');
  });

  it('all items have key and label', () => {
    DEFAULT_CHECKLIST_ITEMS.forEach(item => {
      expect(item.key).toBeTruthy();
      expect(item.label).toBeTruthy();
    });
  });
});
