import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { PriorityService } from './priority.service';
import { PriorityFactors } from '../models/task.model';

describe('PriorityService', () => {
  let service: PriorityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PriorityService]
    });

    service = TestBed.inject(PriorityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculatePriority', () => {
    it('should calculate priority with correct weights', () => {
      const factors: PriorityFactors = {
        impact: 4,
        urgency: 3,
        relevance: 5,
        effort: 2,
        deadline: service.calculateDeadlineFromUrgency(3)
      };

      const result = service.calculatePriority(factors);

      // Expected calculation:
      // effortInv = 6 - 2 = 4
      // impact: 4 * 0.35 = 1.4
      // urgency: 3 * 0.25 = 0.75
      // relevance: 5 * 0.25 = 1.25
      // effort: 4 * 0.15 = 0.6
      // base: 1.4 + 0.75 + 1.25 + 0.6 = 4.0
      // urgencyBonus: depends on deadline (21 days for urgency 3)
      expect(result.breakdown.impactContribution).toBe(1.4);
      expect(result.breakdown.urgencyContribution).toBe(0.75);
      expect(result.breakdown.relevanceContribution).toBe(1.25);
      expect(result.breakdown.effortContribution).toBe(0.6);
      expect(result.breakdown.urgencyBonus).toBeGreaterThan(0);
    });

    it('should apply high urgency bonus for near deadline', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const factors: PriorityFactors = {
        impact: 3,
        urgency: 5,
        relevance: 3,
        effort: 4,
        deadline: tomorrow.toISOString()
      };

      const result = service.calculatePriority(factors);

      // Expected calculation:
      // effortInv = 6 - 4 = 2
      // impact: 3 * 0.35 = 1.05
      // urgency: 5 * 0.25 = 1.25
      // relevance: 3 * 0.25 = 0.75
      // effort: 2 * 0.15 = 0.3
      // base: 1.05 + 1.25 + 0.75 + 0.3 = 3.35
      // urgency bonus for 1 day: 2.0 * e^(-0.10 * 1) ≈ 1.81
      expect(result.breakdown.urgencyBonus).toBeGreaterThan(1.5);
      expect(result.priority).toBeGreaterThan(4.5);
    });

    it('should apply lower urgency bonus for far deadline', () => {
      const factors: PriorityFactors = {
        impact: 3,
        urgency: 1,
        relevance: 3,
        effort: 4,
        deadline: service.calculateDeadlineFromUrgency(1) // 60 days
      };

      const result = service.calculatePriority(factors);

      // urgency bonus for 60 days should be very small
      expect(result.breakdown.urgencyBonus).toBeLessThan(0.1);
      expect(result.breakdown.urgencyBonus).toBeGreaterThan(0);
    });

    it('should calculate maximum priority correctly', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const factors: PriorityFactors = {
        impact: 5,
        urgency: 5,
        relevance: 5,
        effort: 1,
        deadline: today.toISOString() // Today - maximum urgency bonus
      };

      const result = service.calculatePriority(factors);

      // Expected calculation:
      // effortInv = 6 - 1 = 5
      // impact: 5 * 0.35 = 1.75
      // urgency: 5 * 0.25 = 1.25
      // relevance: 5 * 0.25 = 1.25
      // effort: 5 * 0.15 = 0.75
      // base: 1.75 + 1.25 + 1.25 + 0.75 = 5.0
      // urgency bonus for 0 days: 2.0
      // total: 5.0 + 2.0 = 7.0
      expect(result.priority).toBe(7.0);
      expect(result.breakdown.urgencyBonus).toBeCloseTo(2.0, 1);
    });

    it('should calculate minimum priority correctly', () => {
      const factors: PriorityFactors = {
        impact: 1,
        urgency: 1,
        relevance: 1,
        effort: 5,
        deadline: service.calculateDeadlineFromUrgency(1) // 60 days - minimal urgency bonus
      };

      const result = service.calculatePriority(factors);

      // Expected calculation:
      // effortInv = 6 - 5 = 1
      // impact: 1 * 0.35 = 0.35
      // urgency: 1 * 0.25 = 0.25
      // relevance: 1 * 0.25 = 0.25
      // effort: 1 * 0.15 = 0.15
      // base: 0.35 + 0.25 + 0.25 + 0.15 = 1.0
      // urgency bonus for 60 days: very small
      expect(result.priority).toBeGreaterThan(1.0);
      expect(result.breakdown.urgencyBonus).toBeLessThan(0.1);
    });

    it('should invert effort correctly (lower effort = higher contribution)', () => {
      const deadline = service.calculateDeadlineFromUrgency(3);

      const lowEffort: PriorityFactors = {
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 1,
        deadline
      };

      const highEffort: PriorityFactors = {
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 5,
        deadline
      };

      const lowEffortResult = service.calculatePriority(lowEffort);
      const highEffortResult = service.calculatePriority(highEffort);

      // Lower effort should contribute more
      expect(lowEffortResult.breakdown.effortContribution).toBeGreaterThan(
        highEffortResult.breakdown.effortContribution
      );

      // Lower effort should result in higher priority
      expect(lowEffortResult.priority).toBeGreaterThan(highEffortResult.priority);
    });

    it('should round priority to 2 decimal places', () => {
      const factors: PriorityFactors = {
        impact: 2,
        urgency: 2,
        relevance: 2,
        effort: 3,
        deadline: service.calculateDeadlineFromUrgency(2)
      };

      const result = service.calculatePriority(factors);

      // Priority should be rounded to 2 decimals
      expect(result.priority.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });

    it('should handle edge case with all factors equal', () => {
      const factors: PriorityFactors = {
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 3,
        deadline: service.calculateDeadlineFromUrgency(3)
      };

      const result = service.calculatePriority(factors);

      // Expected calculation:
      // effortInv = 6 - 3 = 3
      // impact: 3 * 0.35 = 1.05
      // urgency: 3 * 0.25 = 0.75
      // relevance: 3 * 0.25 = 0.75
      // effort: 3 * 0.15 = 0.45
      // base: 1.05 + 0.75 + 0.75 + 0.45 = 3.0
      // urgencyBonus: depends on deadline
      expect(result.priority).toBeGreaterThan(3.0);
    });

    it('should provide breakdown of all contributions', () => {
      const factors: PriorityFactors = {
        impact: 4,
        urgency: 3,
        relevance: 5,
        effort: 2,
        deadline: service.calculateDeadlineFromUrgency(3)
      };

      const result = service.calculatePriority(factors);

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.impactContribution).toBeDefined();
      expect(result.breakdown.urgencyContribution).toBeDefined();
      expect(result.breakdown.relevanceContribution).toBeDefined();
      expect(result.breakdown.effortContribution).toBeDefined();
      expect(result.breakdown.urgencyBonus).toBeDefined();
    });
  });

  describe('explainPriority', () => {
    it('should generate explanation for priority calculation', () => {
      const factors: PriorityFactors = {
        impact: 4,
        urgency: 3,
        relevance: 5,
        effort: 2,
        deadline: service.calculateDeadlineFromUrgency(3)
      };

      const explanation = service.explainPriority(factors);

      expect(explanation).toContain('Priority:');
      expect(explanation).toContain('Impact (4)');
      expect(explanation).toContain('Urgency (3)');
      expect(explanation).toContain('Relevance (5)');
      expect(explanation).toContain('Effort (2)');
    });

    it('should include deadline urgency bonus in explanation', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const factors: PriorityFactors = {
        impact: 3,
        urgency: 5,
        relevance: 3,
        effort: 4,
        deadline: tomorrow.toISOString()
      };

      const explanation = service.explainPriority(factors);

      expect(explanation).toContain('Deadline Urgency Bonus:');
      expect(explanation).toContain('days remaining');
    });

    it('should show days remaining in explanation', () => {
      const factors: PriorityFactors = {
        impact: 3,
        urgency: 4,
        relevance: 3,
        effort: 4,
        deadline: service.calculateDeadlineFromUrgency(4)
      };

      const explanation = service.explainPriority(factors);

      expect(explanation).toContain('days remaining');
      expect(explanation).toContain('Deadline Urgency Bonus:');
    });

    it('should show contribution percentages', () => {
      const factors: PriorityFactors = {
        impact: 4,
        urgency: 3,
        relevance: 5,
        effort: 2,
        deadline: service.calculateDeadlineFromUrgency(3)
      };

      const explanation = service.explainPriority(factors);

      expect(explanation).toContain('35%'); // Impact
      expect(explanation).toContain('25%'); // Urgency
      expect(explanation).toContain('25%'); // Relevance
      expect(explanation).toContain('15%'); // Effort
    });

    it('should indicate effort is inverted', () => {
      const factors: PriorityFactors = {
        impact: 4,
        urgency: 3,
        relevance: 5,
        effort: 2,
        deadline: service.calculateDeadlineFromUrgency(3)
      };

      const explanation = service.explainPriority(factors);

      expect(explanation).toContain('inverted');
    });
  });
});
