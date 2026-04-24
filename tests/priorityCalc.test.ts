import { describe, it, expect } from 'vitest';
import { calculatePriority, calculateDeadlineFromUrgency, calculateUrgencyBonus } from '../src/services/priorityCalc';

describe('calculateDeadlineFromUrgency', () => {
  it('should return today + 3 days for urgency 5', () => {
    const result = calculateDeadlineFromUrgency(5);
    const deadline = new Date(result);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expected = new Date(today.getTime() + 3 * 86_400_000);
    expect(deadline.toDateString()).toBe(expected.toDateString());
  });

  it('should return today + 7 days for urgency 4', () => {
    const result = calculateDeadlineFromUrgency(4);
    const deadline = new Date(result);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expected = new Date(today.getTime() + 7 * 86_400_000);
    expect(deadline.toDateString()).toBe(expected.toDateString());
  });

  it('should return today + 21 days for urgency 3', () => {
    const result = calculateDeadlineFromUrgency(3);
    const deadline = new Date(result);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expected = new Date(today.getTime() + 21 * 86_400_000);
    expect(deadline.toDateString()).toBe(expected.toDateString());
  });

  it('should return today + 42 days for urgency 2', () => {
    const result = calculateDeadlineFromUrgency(2);
    const deadline = new Date(result);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expected = new Date(today.getTime() + 42 * 86_400_000);
    expect(deadline.toDateString()).toBe(expected.toDateString());
  });

  it('should return today + 60 days for urgency 1 (Someday)', () => {
    const result = calculateDeadlineFromUrgency(1);
    const deadline = new Date(result);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expected = new Date(today.getTime() + 60 * 86_400_000);
    expect(deadline.toDateString()).toBe(expected.toDateString());
  });

  it('should always return a valid ISO date string', () => {
    for (let urgency = 1; urgency <= 5; urgency++) {
      const result = calculateDeadlineFromUrgency(urgency);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(() => new Date(result)).not.toThrow();
    }
  });
});

describe('calculateUrgencyBonus', () => {
  it('should return 2.0 for deadline today (0 days)', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = calculateUrgencyBonus(today.toISOString());
    expect(result).toBeCloseTo(2.0, 2);
  });

  it('should return ~1.66 for deadline in 2 days', () => {
    const deadline = new Date();
    deadline.setHours(0, 0, 0, 0);
    deadline.setDate(deadline.getDate() + 2);
    const result = calculateUrgencyBonus(deadline.toISOString());
    expect(result).toBeCloseTo(1.66, 1);
  });

  it('should return ~1.45 for deadline in 3 days', () => {
    const deadline = new Date();
    deadline.setHours(0, 0, 0, 0);
    deadline.setDate(deadline.getDate() + 3);
    const result = calculateUrgencyBonus(deadline.toISOString());
    expect(result).toBeCloseTo(1.45, 1);
  });

  it('should return ~0.99 for deadline in 7 days', () => {
    const deadline = new Date();
    deadline.setHours(0, 0, 0, 0);
    deadline.setDate(deadline.getDate() + 7);
    const result = calculateUrgencyBonus(deadline.toISOString());
    expect(result).toBeCloseTo(0.99, 1);
  });

  it('should return ~0.24 for deadline in 21 days', () => {
    const deadline = new Date();
    deadline.setHours(0, 0, 0, 0);
    deadline.setDate(deadline.getDate() + 21);
    const result = calculateUrgencyBonus(deadline.toISOString());
    expect(result).toBeCloseTo(0.24, 1);
  });

  it('should return ~0.04 for deadline in 42 days', () => {
    const deadline = new Date();
    deadline.setHours(0, 0, 0, 0);
    deadline.setDate(deadline.getDate() + 42);
    const result = calculateUrgencyBonus(deadline.toISOString());
    expect(result).toBeCloseTo(0.04, 1);
  });

  it('should return ~0.00 for deadline in 60 days (Someday)', () => {
    const deadline = new Date();
    deadline.setHours(0, 0, 0, 0);
    deadline.setDate(deadline.getDate() + 60);
    const result = calculateUrgencyBonus(deadline.toISOString());
    expect(result).toBeCloseTo(0.00, 1);
  });

  it('should handle overdue deadlines as 0 days remaining', () => {
    const yesterday = new Date();
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);
    const result = calculateUrgencyBonus(yesterday.toISOString());
    expect(result).toBeCloseTo(2.0, 2);
  });
});

describe('calculatePriority with deadline', () => {
  it('should calculate priority with urgency bonus from deadline', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(today.getTime() + 7 * 86_400_000).toISOString();

    const result = calculatePriority({
      impact: 4,
      urgency: 3,
      relevance: 5,
      effort: 2,
      deadline: deadline,
    });

    const effortInv = 6 - 2;
    const base = (4 * 0.35) + (3 * 0.25) + (5 * 0.25) + (effortInv * 0.15);
    const bonus = calculateUrgencyBonus(deadline);
    const expected = Math.round((base + bonus) * 100) / 100;

    expect(result).toBe(expected);
  });

  it('should handle Someday tasks with low initial priority', () => {
    const somedayDeadline = calculateDeadlineFromUrgency(1);

    const result = calculatePriority({
      impact: 2,
      urgency: 1,
      relevance: 2,
      effort: 3,
      deadline: somedayDeadline,
    });

    // Someday (60 days) should have very low urgency bonus
    expect(result).toBeLessThan(2.5);
  });

  it('should prioritize urgent tasks with near deadline', () => {
    const urgentDeadline = calculateDeadlineFromUrgency(5); // 3 days

    const result = calculatePriority({
      impact: 3,
      urgency: 5,
      relevance: 3,
      effort: 4,
      deadline: urgentDeadline,
    });

    // Should have high urgency bonus due to close deadline
    expect(result).toBeGreaterThan(4.0);
  });

  it('should round to 2 decimal places', () => {
    const deadline = calculateDeadlineFromUrgency(3);
    const result = calculatePriority({
      impact: 3,
      urgency: 3,
      relevance: 3,
      effort: 3,
      deadline: deadline,
    });

    // Check that result has at most 2 decimal places
    expect(result).toBe(Math.round(result * 100) / 100);
  });

  it('should handle minimum values', () => {
    const deadline = calculateDeadlineFromUrgency(1);
    const result = calculatePriority({
      impact: 1,
      urgency: 1,
      relevance: 1,
      effort: 5,
      deadline: deadline,
    });

    const effortInv = 6 - 5;
    const base = (1 * 0.35) + (1 * 0.25) + (1 * 0.25) + (effortInv * 0.15);
    const bonus = calculateUrgencyBonus(deadline);
    const expected = Math.round((base + bonus) * 100) / 100;

    expect(result).toBe(expected);
  });

  it('should handle maximum values with urgency boost', () => {
    const deadline = calculateDeadlineFromUrgency(5);
    const result = calculatePriority({
      impact: 5,
      urgency: 5,
      relevance: 5,
      effort: 1,
      deadline: deadline,
    });

    const effortInv = 6 - 1;
    const base = (5 * 0.35) + (5 * 0.25) + (5 * 0.25) + (effortInv * 0.15);
    const bonus = calculateUrgencyBonus(deadline);
    const expected = Math.round((base + bonus) * 100) / 100;

    expect(result).toBe(expected);
    // Should be high due to max values and close deadline
    expect(result).toBeGreaterThan(6.0);
  });

  it('should prioritize high impact tasks', () => {
    const deadline = calculateDeadlineFromUrgency(3);
    const highImpact = calculatePriority({
      impact: 5,
      urgency: 3,
      relevance: 3,
      effort: 2,
      deadline: deadline,
    });

    const lowImpact = calculatePriority({
      impact: 1,
      urgency: 3,
      relevance: 3,
      effort: 2,
      deadline: deadline,
    });

    expect(highImpact).toBeGreaterThan(lowImpact);
  });

  it('should deprioritize high effort tasks', () => {
    const deadline = calculateDeadlineFromUrgency(4);
    const lowEffort = calculatePriority({
      impact: 4,
      urgency: 4,
      relevance: 4,
      effort: 1,
      deadline: deadline,
    });

    const highEffort = calculatePriority({
      impact: 4,
      urgency: 4,
      relevance: 4,
      effort: 5,
      deadline: deadline,
    });

    expect(lowEffort).toBeGreaterThan(highEffort);
  });
});
