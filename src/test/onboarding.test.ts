import { describe, it, expect } from 'vitest';
import { generateInvoiceNumber, getDefaultDueDate } from '@/lib/businessLogic';
import { getOutreachTemplate, getConfirmationTemplate, getInvoiceTemplate } from '@/data/templates';

describe('generateInvoiceNumber with prefix', () => {
  it('uses default INV prefix', () => {
    const result = generateInvoiceNumber([]);
    expect(result).toMatch(/^INV-\d{4}-001$/);
  });

  it('uses custom prefix', () => {
    const result = generateInvoiceNumber([], 'LOC');
    expect(result).toMatch(/^LOC-\d{4}-001$/);
  });

  it('increments correctly with custom prefix', () => {
    const year = new Date().getFullYear();
    const existing = [
      { invoice_number: `RX-${year}-001` } as any,
      { invoice_number: `RX-${year}-002` } as any,
    ];
    const result = generateInvoiceNumber(existing, 'RX');
    expect(result).toBe(`RX-${year}-003`);
  });
});

describe('getDefaultDueDate', () => {
  it('defaults to 14 days', () => {
    const d = getDefaultDueDate();
    const expected = new Date();
    expected.setDate(expected.getDate() + 14);
    expect(d.toDateString()).toBe(expected.toDateString());
  });

  it('uses custom days', () => {
    const d = getDefaultDueDate(30);
    const expected = new Date();
    expected.setDate(expected.getDate() + 30);
    expect(d.toDateString()).toBe(expected.toDateString());
  });
});

describe('email template tones', () => {
  it('friendly tone uses emoji greeting', () => {
    const t = getOutreachTemplate('friendly');
    expect(t).toContain('😊');
    expect(t).toContain('Warmly,');
    expect(t).toContain('{{contact_name}}');
    expect(t).toContain('{{facility_name}}');
  });

  it('neutral tone uses standard greeting', () => {
    const t = getOutreachTemplate('neutral');
    expect(t).toContain('Hi {{contact_name}},');
    expect(t).toContain('Best regards,');
  });

  it('direct tone uses terse greeting', () => {
    const t = getOutreachTemplate('direct');
    expect(t).toContain('{{contact_name}},');
    expect(t).not.toContain('Hi {{contact_name}},');
    expect(t).toContain('Regards,');
  });

  it('all tones preserve template variables', () => {
    for (const tone of ['friendly', 'neutral', 'direct'] as const) {
      const outreach = getOutreachTemplate(tone);
      expect(outreach).toContain('{{contact_name}}');
      expect(outreach).toContain('{{facility_name}}');
      expect(outreach).toContain('{{month}}');

      const confirm = getConfirmationTemplate(tone);
      expect(confirm).toContain('{{shift_list}}');

      const invoice = getInvoiceTemplate(tone);
      expect(invoice).toContain('{{invoice_number}}');
      expect(invoice).toContain('{{total_amount}}');
      expect(invoice).toContain('{{due_date}}');
    }
  });
});
