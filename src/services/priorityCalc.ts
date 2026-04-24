export interface PriorityParams {
  impact: number;
  urgency: number;
  relevance: number;
  effort: number;
  deadline: string;
}

/**
 * Calculates deadline date from urgency level.
 * All tasks get a deadline — even "Someday" tasks (60 days out).
 */
export function calculateDeadlineFromUrgency(urgency: number): string {
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
export function calculateUrgencyBonus(
  deadlineDate: string,
  k: number = 0.10
): number {
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

export function calculatePriority(params: PriorityParams): number {
  const { impact, urgency, relevance, effort, deadline } = params;

  const effortInv = 6 - effort;
  const base =
    impact * 0.35 +
    urgency * 0.25 +
    relevance * 0.25 +
    effortInv * 0.15;

  const bonus = calculateUrgencyBonus(deadline);

  return Math.round((base + bonus) * 100) / 100;
}
