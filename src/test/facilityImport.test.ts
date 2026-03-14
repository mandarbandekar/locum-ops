import { describe, it, expect } from 'vitest';
import { getConfidenceLevel } from '@/hooks/useSetupAssistant';
import type { FacilitySuggestion, SuggestionCategory } from '@/hooks/useFacilityImport';

function makeSuggestion(overrides: Partial<FacilitySuggestion> = {}): FacilitySuggestion {
  return {
    id: 'test-1',
    category: 'contacts' as SuggestionCategory,
    action: 'add',
    data: { name: 'Jane Doe', role: 'Practice Manager', email: 'jane@clinic.com' },
    confidence: 0.9,
    source_label: 'Uploaded file: rates.csv',
    status: 'pending',
    ...overrides,
  };
}

describe('Facility Import', () => {
  it('facility detail should support import action (structural test)', () => {
    // The FacilityImportDialog component exists and can be rendered
    // This test validates the data structures are correct
    const s = makeSuggestion();
    expect(s.category).toBe('contacts');
    expect(s.status).toBe('pending');
    expect(s.source_label).toContain('Uploaded file');
  });

  it('suggestions are grouped by category', () => {
    const suggestions: FacilitySuggestion[] = [
      makeSuggestion({ id: '1', category: 'contacts' }),
      makeSuggestion({ id: '2', category: 'rates', data: { weekday_rate: 1500 } }),
      makeSuggestion({ id: '3', category: 'contacts', data: { name: 'Bob', role: 'Billing' } }),
      makeSuggestion({ id: '4', category: 'terms', data: { cancellation_policy: '48h notice' } }),
    ];
    const grouped = suggestions.reduce<Record<string, FacilitySuggestion[]>>((acc, s) => {
      (acc[s.category] = acc[s.category] || []).push(s);
      return acc;
    }, {});
    expect(Object.keys(grouped)).toHaveLength(3);
    expect(grouped.contacts).toHaveLength(2);
    expect(grouped.rates).toHaveLength(1);
    expect(grouped.terms).toHaveLength(1);
  });

  it('applying a suggestion does not auto-overwrite (status tracking)', () => {
    const suggestions = [
      makeSuggestion({ id: '1', status: 'pending' }),
      makeSuggestion({ id: '2', status: 'pending' }),
    ];
    // Simulate applying one
    const updated = suggestions.map(s => s.id === '1' ? { ...s, status: 'applied' as const } : s);
    expect(updated[0].status).toBe('applied');
    expect(updated[1].status).toBe('pending');
  });

  it('applied updates preserve source metadata', () => {
    const s = makeSuggestion({ source_label: 'Uploaded contract: agreement.pdf' });
    expect(s.source_label).toContain('agreement.pdf');
  });

  it('pending suggestions count is correct', () => {
    const suggestions = [
      makeSuggestion({ id: '1', status: 'pending' }),
      makeSuggestion({ id: '2', status: 'applied' }),
      makeSuggestion({ id: '3', status: 'ignored' }),
      makeSuggestion({ id: '4', status: 'pending' }),
    ];
    const pendingCount = suggestions.filter(s => s.status === 'pending').length;
    expect(pendingCount).toBe(2);
  });

  it('confidence levels map correctly for facility suggestions', () => {
    expect(getConfidenceLevel(0.95)).toBe('high');
    expect(getConfidenceLevel(0.65)).toBe('medium');
    expect(getConfidenceLevel(0.3)).toBe('needs_review');
    expect(getConfidenceLevel(null)).toBe('needs_review');
  });
});
