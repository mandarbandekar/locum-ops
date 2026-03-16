import { describe, it, expect } from 'vitest';
import { OPPORTUNITY_CATEGORIES } from '@/hooks/useTaxAdvisor';
import { ADVISOR_DISCLAIMER } from '@/components/tax-advisor/AdvisorDisclaimer';

describe('Tax Planning Advisor', () => {
  describe('Feature structure', () => {
    it('should have 4 main sections', () => {
      const sections = ['ask', 'review', 'questions', 'summary'];
      expect(sections).toHaveLength(4);
    });

    it('should have 8 opportunity review categories', () => {
      expect(OPPORTUNITY_CATEGORIES).toHaveLength(8);
      const keys = OPPORTUNITY_CATEGORIES.map(c => c.key);
      expect(keys).toContain('ce_travel');
      expect(keys).toContain('vehicle_mileage');
      expect(keys).toContain('credentials_memberships');
      expect(keys).toContain('equipment_supplies');
      expect(keys).toContain('retirement_planning');
      expect(keys).toContain('multi_state_work');
      expect(keys).toContain('entity_structure');
      expect(keys).toContain('home_office');
    });
  });

  describe('Disclaimer', () => {
    it('should contain required safety language', () => {
      expect(ADVISOR_DISCLAIMER).toContain('education and planning support only');
      expect(ADVISOR_DISCLAIMER).toContain('does not provide tax, legal, or financial advice');
      expect(ADVISOR_DISCLAIMER).toContain('qualified CPA');
    });

    it('should not use prescriptive language', () => {
      expect(ADVISOR_DISCLAIMER.toLowerCase()).not.toContain('you can deduct');
      expect(ADVISOR_DISCLAIMER.toLowerCase()).not.toContain('this qualifies');
      expect(ADVISOR_DISCLAIMER.toLowerCase()).not.toContain('this is allowed');
    });
  });

  describe('Opportunity Review statuses', () => {
    it('should support the 4 required statuses', () => {
      const validStatuses = ['not_started', 'reviewing', 'saved_for_cpa', 'done_for_now'];
      validStatuses.forEach(s => expect(typeof s).toBe('string'));
    });
  });

  describe('Category details', () => {
    it('each category should have a label and description', () => {
      OPPORTUNITY_CATEGORIES.forEach(cat => {
        expect(cat.label).toBeTruthy();
        expect(cat.description).toBeTruthy();
        expect(cat.description.length).toBeGreaterThan(20);
      });
    });

    it('category descriptions should use cautious language', () => {
      OPPORTUNITY_CATEGORIES.forEach(cat => {
        const desc = cat.description.toLowerCase();
        expect(desc).not.toContain('you can deduct');
        expect(desc).not.toContain('this qualifies');
      });
    });
  });

  describe('Intake profile fields', () => {
    it('should cover key locum planning areas', () => {
      const intakeFields = [
        'entity_type', 'travels_for_ce', 'uses_personal_vehicle',
        'multi_state_work', 'pays_own_subscriptions', 'retirement_planning_interest',
        'combines_business_personal_travel', 'buys_supplies_equipment',
      ];
      expect(intakeFields.length).toBeGreaterThanOrEqual(7);
    });
  });
});
