import { describe, it, expect } from 'vitest';
import { getChecklistBadge, DEFAULT_CHECKLIST_ITEMS } from '@/types/contracts';
import type { ContractChecklistItem } from '@/types/contracts';

describe('Contracts module', () => {
  describe('DEFAULT_CHECKLIST_ITEMS', () => {
    it('should have 4 default checklist item types', () => {
      expect(DEFAULT_CHECKLIST_ITEMS).toHaveLength(4);
      const types = DEFAULT_CHECKLIST_ITEMS.map(i => i.type);
      expect(types).toContain('w9');
      expect(types).toContain('coi');
      expect(types).toContain('direct_deposit');
      expect(types).toContain('credentialing');
    });

    it('should have proper titles for default items', () => {
      const w9 = DEFAULT_CHECKLIST_ITEMS.find(i => i.type === 'w9');
      expect(w9?.title).toBe('W-9');
      const coi = DEFAULT_CHECKLIST_ITEMS.find(i => i.type === 'coi');
      expect(coi?.title).toBe('Certificate of Insurance (COI)');
    });
  });

  describe('getChecklistBadge', () => {
    const baseItem: ContractChecklistItem = {
      id: 'test1',
      facility_id: 'f1',
      type: 'coi',
      title: 'COI',
      status: 'needed',
      due_date: null,
      notes: '',
    };

    it('should return null when status is done', () => {
      expect(getChecklistBadge({ ...baseItem, status: 'done', due_date: '2020-01-01' })).toBeNull();
    });

    it('should return null when no due_date', () => {
      expect(getChecklistBadge({ ...baseItem, due_date: null })).toBeNull();
    });

    it('should return "overdue" when past due_date and status is not done', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      expect(getChecklistBadge({ ...baseItem, due_date: pastDate.toISOString() })).toBe('overdue');
    });

    it('should return "due_soon" when due_date is within 30 days', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 15);
      expect(getChecklistBadge({ ...baseItem, due_date: soonDate.toISOString() })).toBe('due_soon');
    });

    it('should return null when due_date is more than 30 days away', () => {
      const farDate = new Date();
      farDate.setDate(farDate.getDate() + 60);
      expect(getChecklistBadge({ ...baseItem, due_date: farDate.toISOString() })).toBeNull();
    });

    it('should return "due_soon" for in_progress items within 30 days', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 10);
      expect(getChecklistBadge({ ...baseItem, status: 'in_progress', due_date: soonDate.toISOString() })).toBe('due_soon');
    });
  });
});
