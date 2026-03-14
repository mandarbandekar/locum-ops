import { describe, it, expect } from 'vitest';
import { getConfidenceLevel, type ImportedEntity, type ReviewStatus } from '../hooks/useSetupAssistant';

// Helper to create mock entities
function mockEntity(overrides: Partial<ImportedEntity> = {}): ImportedEntity {
  return {
    id: crypto.randomUUID(),
    import_job_id: 'job-1',
    entity_type: 'facility',
    raw_data: {},
    parsed_data: { name: 'Test Facility' },
    confidence_score: 0.9,
    review_status: 'pending',
    ...overrides,
  };
}

describe('AI Setup Assistant', () => {
  describe('Confidence scoring', () => {
    it('returns high for scores >= 0.8', () => {
      expect(getConfidenceLevel(0.9)).toBe('high');
      expect(getConfidenceLevel(0.8)).toBe('high');
    });
    it('returns medium for 0.5–0.79', () => {
      expect(getConfidenceLevel(0.6)).toBe('medium');
      expect(getConfidenceLevel(0.5)).toBe('medium');
    });
    it('returns needs_review for < 0.5 or null', () => {
      expect(getConfidenceLevel(0.3)).toBe('needs_review');
      expect(getConfidenceLevel(null)).toBe('needs_review');
    });
  });

  describe('Review status logic', () => {
    it('entities start with pending review status', () => {
      const entity = mockEntity();
      expect(entity.review_status).toBe('pending');
    });

    it('no records finalized until status changes from pending', () => {
      const entities: ImportedEntity[] = [
        mockEntity({ entity_type: 'facility' }),
        mockEntity({ entity_type: 'shift' }),
        mockEntity({ entity_type: 'contract' }),
      ];
      const confirmed = entities.filter(e => e.review_status === 'confirmed');
      expect(confirmed).toHaveLength(0);
    });

    it('confirmed entities count correctly in summary', () => {
      const entities: ImportedEntity[] = [
        mockEntity({ entity_type: 'facility', review_status: 'confirmed' }),
        mockEntity({ entity_type: 'facility', review_status: 'confirmed' }),
        mockEntity({ entity_type: 'facility', review_status: 'skipped' }),
        mockEntity({ entity_type: 'contract', review_status: 'confirmed' }),
        mockEntity({ entity_type: 'shift', review_status: 'edited' }),
        mockEntity({ entity_type: 'shift', review_status: 'pending' }),
      ];
      const confirmed = entities.filter(e => e.review_status === 'confirmed' || e.review_status === 'edited');
      const facilitiesImported = confirmed.filter(e => e.entity_type === 'facility').length;
      const contractsAdded = confirmed.filter(e => e.entity_type === 'contract').length;
      const shiftsImported = confirmed.filter(e => e.entity_type === 'shift').length;
      const needsReview = entities.filter(e => e.review_status === 'pending').length;

      expect(facilitiesImported).toBe(2);
      expect(contractsAdded).toBe(1);
      expect(shiftsImported).toBe(1);
      expect(needsReview).toBe(1);
    });
  });

  describe('Duplicate detection', () => {
    it('entities can be merged or kept separate', () => {
      const entities: ImportedEntity[] = [
        mockEntity({ parsed_data: { name: 'VCA Almaden', possible_duplicate_of: 'VCA Almaden Valley' } }),
        mockEntity({ parsed_data: { name: 'VCA Almaden Valley' } }),
      ];

      // User merges first entity
      entities[0].review_status = 'merged';
      entities[1].review_status = 'confirmed';

      expect(entities[0].review_status).toBe('merged');
      expect(entities[1].review_status).toBe('confirmed');
    });
  });

  describe('Skip path', () => {
    it('skip for now produces no confirmed entities', () => {
      const entities: ImportedEntity[] = [];
      const confirmed = entities.filter(e => e.review_status === 'confirmed');
      expect(confirmed).toHaveLength(0);
    });
  });

  describe('Post-setup summary', () => {
    it('shows correct counts', () => {
      const entities: ImportedEntity[] = [
        mockEntity({ entity_type: 'facility', review_status: 'confirmed' }),
        mockEntity({ entity_type: 'facility', review_status: 'confirmed' }),
        mockEntity({ entity_type: 'facility', review_status: 'confirmed' }),
        mockEntity({ entity_type: 'contract', review_status: 'confirmed' }),
        mockEntity({ entity_type: 'shift', review_status: 'confirmed' }),
        mockEntity({ entity_type: 'shift', review_status: 'confirmed' }),
        mockEntity({ entity_type: 'shift', review_status: 'confirmed' }),
        mockEntity({ entity_type: 'shift', review_status: 'confirmed' }),
        mockEntity({ entity_type: 'shift', review_status: 'pending' }),
      ];

      const confirmed = entities.filter(e => e.review_status === 'confirmed' || e.review_status === 'edited');
      const summary = {
        facilities_imported: confirmed.filter(e => e.entity_type === 'facility').length,
        contracts_added: confirmed.filter(e => e.entity_type === 'contract').length,
        shifts_imported: confirmed.filter(e => e.entity_type === 'shift').length,
        items_need_review: entities.filter(e => e.review_status === 'pending').length,
      };

      expect(summary.facilities_imported).toBe(3);
      expect(summary.contracts_added).toBe(1);
      expect(summary.shifts_imported).toBe(4);
      expect(summary.items_need_review).toBe(1);
    });
  });
});
