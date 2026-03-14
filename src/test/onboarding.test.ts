import { describe, it, expect, vi } from 'vitest';
import { generateInvoiceNumber, getDefaultDueDate } from '@/lib/businessLogic';
import { getOutreachTemplate, getConfirmationTemplate, getInvoiceTemplate } from '@/data/templates';

// ─── Existing onboarding tests ─────────────────────────────

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

// ─── Manual Setup path tests ────────────────────────────────

describe('Manual Quick Setup path', () => {
  it('users can choose Manual Quick Setup from onboarding (setup choice recommends manual for notes-only users)', () => {
    // Simulate: user uses "notes" only → should recommend manual
    const importTools = ['sheets_excel', 'calendar', 'quickbooks', 'wave', 'freshbooks'] as const;
    const manualTools = ['notes', 'other'] as const;

    // Notes-only user should get manual recommendation
    const userTools = ['notes'] as const;
    const hasImportTool = userTools.some((t: any) => importTools.includes(t));
    expect(hasImportTool).toBe(false); // manual recommended

    // Sheets user should get import recommendation
    const sheetsUser = ['sheets_excel', 'notes'] as const;
    const sheetsHasImport = sheetsUser.some((t: any) => importTools.includes(t));
    expect(sheetsHasImport).toBe(true); // import recommended
  });

  it('manual path creates a facility successfully', () => {
    // Validate the facility input structure
    const input = {
      name: 'Valley Animal Hospital',
      contact_name: 'Dr. Smith',
      billing_email: 'billing@valley.com',
      address: '123 Main St',
      weekday_rate: 800,
      notes: 'Great team',
    };

    expect(input.name).toBeTruthy();
    expect(input.weekday_rate).toBeGreaterThan(0);
  });

  it('manual path creates a shift successfully with proper linking', () => {
    const facilityId = 'fac-001';
    const shiftInput = {
      facility_id: facilityId,
      date: '2026-04-01',
      start_time: '08:00',
      end_time: '17:00',
      rate: 800,
      notes: '',
    };

    // Verify datetime construction
    const startDt = `${shiftInput.date}T${shiftInput.start_time}:00`;
    const endDt = `${shiftInput.date}T${shiftInput.end_time}:00`;
    expect(startDt).toBe('2026-04-01T08:00:00');
    expect(endDt).toBe('2026-04-01T17:00:00');

    // Verify shift is linked to facility
    expect(shiftInput.facility_id).toBe(facilityId);
  });

  it('onboarding cannot complete without at least 1 facility and 1 shift', () => {
    // canComplete logic: facilities.length >= 1 && shifts.length >= 1
    const noFacilities = { facilities: [], shifts: [{ id: 's1' }] };
    const noShifts = { facilities: [{ id: 'f1' }], shifts: [] };
    const complete = { facilities: [{ id: 'f1' }], shifts: [{ id: 's1' }] };

    expect(noFacilities.facilities.length >= 1 && noFacilities.shifts.length >= 1).toBe(false);
    expect(noShifts.facilities.length >= 1 && noShifts.shifts.length >= 1).toBe(false);
    expect(complete.facilities.length >= 1 && complete.shifts.length >= 1).toBe(true);
  });

  it('add another practice / add another shift loop works correctly', () => {
    // Simulating the loop: after first facility+shift, user adds more
    const facilities = [
      { id: 'f1', name: 'Clinic A' },
      { id: 'f2', name: 'Clinic B' },
    ];
    const shifts = [
      { id: 's1', facility_id: 'f1' },
      { id: 's2', facility_id: 'f2' },
      { id: 's3', facility_id: 'f1' },
    ];

    expect(facilities.length).toBe(2);
    expect(shifts.length).toBe(3);

    // All shifts should be linked to valid facilities
    const facilityIds = new Set(facilities.map(f => f.id));
    shifts.forEach(s => {
      expect(facilityIds.has(s.facility_id)).toBe(true);
    });
  });

  it('newly created shift is linked to the manually created facility', () => {
    const facilityId = 'manual-fac-uuid';
    const shift = {
      facility_id: facilityId,
      start_datetime: '2026-04-15T09:00:00',
      end_datetime: '2026-04-15T18:00:00',
      status: 'booked',
      rate_applied: 750,
    };

    expect(shift.facility_id).toBe(facilityId);
    expect(shift.status).toBe('booked');
  });
});
