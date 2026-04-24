import { Injectable } from '@angular/core';
import { PriorityFactors, PriorityResult } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class PriorityService {
  /**
   * Calculates deadline date from urgency level.
   * All tasks get a deadline — even "Someday" tasks (60 days out).
   */
  calculateDeadlineFromUrgency(urgency: number): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let daysOffset: number;
    switch (urgency) {
      case 5: daysOffset = 3;  break;  // Right now
      case 4: daysOffset = 7;  break;  // This week
      case 3: daysOffset = 21; break;  // In the coming weeks
      case 2: daysOffset = 42; break;  // Next month
      case 1: daysOffset = 60; break;  // Someday
      default: daysOffset = 60;
    }

    return new Date(today.getTime() + daysOffset * 86_400_000).toISOString();
  }

  /**
   * Calculates urgency bonus based on days until deadline.
   * Uses exponential decay: closer deadline = higher bonus.
   */
  calculateUrgencyBonus(deadlineDate: string, k: number = 0.10): number {
    const deadline = new Date(deadlineDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);

    const daysRemaining = Math.max(
      0,
      Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000)
    );

    return 2.0 * Math.exp(-k * daysRemaining);
  }

  /**
   * Calculate priority based on the backend formula with deadline-based urgency bonus:
   * Effort_inv = 6 - Effort
   * Base = Impact * 0.35 + Urgency * 0.25 + Relevance * 0.25 + Effort_inv * 0.15
   * UrgencyBonus = 2.0 * e^(-0.10 * daysRemaining)
   * Priority = Base + UrgencyBonus
   */
  calculatePriority(factors: PriorityFactors): PriorityResult {
    const { impact, urgency, relevance, effort, deadline } = factors;

    const effortInverse = 6 - effort;

    const impactContribution = impact * 0.35;
    const urgencyContribution = urgency * 0.25;
    const relevanceContribution = relevance * 0.25;
    const effortContribution = effortInverse * 0.15;
    const urgencyBonus = this.calculateUrgencyBonus(deadline);

    const priority = impactContribution + urgencyContribution + relevanceContribution + effortContribution + urgencyBonus;

    return {
      priority: Math.round(priority * 100) / 100,
      breakdown: {
        impactContribution,
        urgencyContribution,
        relevanceContribution,
        effortContribution,
        urgencyBonus
      }
    };
  }

  /**
   * Get a human-readable explanation of the priority calculation
   */
  explainPriority(factors: PriorityFactors): string {
    const result = this.calculatePriority(factors);
    const { breakdown } = result;

    const deadline = new Date(factors.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    const daysRemaining = Math.max(
      0,
      Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000)
    );

    let explanation = `Priority: ${result.priority.toFixed(2)}\n\n`;
    explanation += `Impact (${factors.impact}): ${breakdown.impactContribution.toFixed(2)} (35%)\n`;
    explanation += `Urgency (${factors.urgency}): ${breakdown.urgencyContribution.toFixed(2)} (25%)\n`;
    explanation += `Relevance (${factors.relevance}): ${breakdown.relevanceContribution.toFixed(2)} (25%)\n`;
    explanation += `Effort (${factors.effort}): ${breakdown.effortContribution.toFixed(2)} (15%, inverted)\n`;
    explanation += `\nDeadline Urgency Bonus: +${breakdown.urgencyBonus.toFixed(2)} (${daysRemaining} days remaining)`;

    return explanation;
  }
}
