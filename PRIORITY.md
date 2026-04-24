# Priority Calculation System

This document describes the complete priority calculation system for task management, including the formula, parameters, deadline handling, and automatic recalculation.

---

## Formula

```
Effort_inv = 6 - Effort

Priority = Impact × 0.35 + Urgency × 0.25 + Relevance × 0.25 + Effort_inv × 0.15 + urgency_bonus(deadline)
```

**Higher priority value = higher position in queue**

### Key Features

- **Additive formula**: No division, all factors contribute positively
- **Inverted effort**: Lower effort contributes more to priority (6 - Effort)
- **Dynamic urgency bonus**: Priority increases automatically as deadline approaches
- **Daily recalculation**: All task priorities are recalculated daily at 2:00 AM UTC
- **Custom deadlines**: Users can set custom deadlines or use auto-calculated ones

---

## Parameters

All parameters are rated on a scale of **1–5**:

### Impact (Weight: 0.35)

How much value or benefit the task provides when completed.

- **5**: Critical value, game-changing impact
- **4**: High value, significant improvement
- **3**: Moderate value, noticeable benefit
- **2**: Low value, minor improvement
- **1**: Minimal value, negligible benefit

### Urgency (Weight: 0.25)

How time-sensitive the task is. Used as a base score — the actual urgency contribution comes from the deadline-based bonus.

- **5**: Immediate action required, critical deadline
- **4**: Urgent, should be done very soon
- **3**: Moderate time pressure
- **2**: Can wait, but shouldn't be delayed too long
- **1**: No time pressure, can be done anytime

### Relevance (Weight: 0.25)

How well the task aligns with current goals and priorities.

- **5**: Directly aligned with primary goals
- **4**: Strongly aligned with goals
- **3**: Moderately aligned
- **2**: Somewhat aligned
- **1**: Minimally aligned or tangential

### Effort (Weight: 0.15, Inverted)

Amount of work required to complete the task.

- **5**: Very high effort, complex or time-consuming (contributes 0.15 to priority)
- **4**: High effort, substantial work required (contributes 0.30 to priority)
- **3**: Moderate effort (contributes 0.45 to priority)
- **2**: Low effort, relatively simple (contributes 0.60 to priority)
- **1**: Minimal effort, very quick to complete (contributes 0.75 to priority)

**Note**: Effort is inverted (6 - Effort), so lower effort contributes more to priority, encouraging quick wins.

---

## Weight Distribution

Current weights sum to 1.0:

- **Impact**: 0.35 (35%) — highest weight for value-driven prioritization
- **Urgency**: 0.25 (25%) — time sensitivity
- **Relevance**: 0.25 (25%) — goal alignment
- **Effort (inverted)**: 0.15 (15%) — smaller weight to avoid over-penalizing complex tasks
- **Urgency bonus**: 0.00–2.00 (additive, deadline-driven)

This configuration prioritizes high-impact work while giving equal weight to urgency and goal alignment.

---

## Dynamic Urgency Bonus

The urgency bonus scales continuously based on days remaining until the deadline using an exponential decay curve.

### Formula

```
days_remaining = max(0, deadline_date - today)
urgency_bonus  = 2.0 × e^(-k × days_remaining)

k = 0.10  (current value)
```

### Why Exponential Decay?

The bonus grows slowly when the deadline is far away and accelerates sharply in the final days. This mirrors real-world urgency: a task due in 30 days feels manageable, but the same task due in 2 days demands immediate attention.

### Bonus Values (k = 0.10)

| Days remaining | Urgency bonus | Context |
|---|---|---|
| 0 (today or overdue) | +2.00 | Maximum urgency |
| 1 day | +1.81 | |
| 2 days | +1.64 | |
| 3 days | +1.48 | "Right now" default |
| 7 days | +1.01 | "This week" default |
| 14 days | +0.50 | |
| 21 days | +0.25 | "Coming weeks" default |
| 30 days | +0.10 | |
| 42 days | +0.03 | "Next month" default |
| 60 days | +0.00 | "Someday" default |

### Tuning the k Coefficient

| k value | Behavior |
|---|---|
| `0.05` | Gradual — bonus meaningful even 60+ days out |
| `0.10` | **Current** — moderate curve, bonus significant within 2 weeks |
| `0.80` | Steep — bonus significant only within final few days |

**Current setting (k = 0.10)** provides a balanced urgency curve where tasks gradually become more urgent over weeks.

---

## Deadline Management

### Auto-Calculated Deadlines

When no custom deadline is provided, the system automatically calculates a deadline based on the urgency level:

| Urgency | Label | Deadline offset | Initial urgency bonus |
|---|---|---|---|
| 5 | Right now | today + 3 days | +1.48 |
| 4 | This week | today + 7 days | +1.01 |
| 3 | Coming weeks | today + 21 days | +0.25 |
| 2 | Next month | today + 42 days | +0.03 |
| 1 | Someday | today + 60 days | +0.00 |

**All tasks have a deadline** — even "Someday" tasks get a deadline 60 days out. This ensures all tasks eventually gain urgency as time passes.

### Custom Deadlines

Users can override auto-calculated deadlines by selecting a custom date. When a custom deadline is set:

- The `custom_deadline` flag is set to `true`
- The deadline is displayed to the user on the task card
- The urgency bonus is calculated from the custom deadline
- Changing urgency does NOT override an existing custom deadline
- Selecting a new urgency option clears the custom deadline and uses auto-calculated deadline

### Deadline Display Rules

- **Auto-calculated deadlines**: Not shown to the user (internal only)
- **Custom deadlines**: Displayed on task cards with "Deadline" label
- **Relative format**: Deadlines are shown in relative format (e.g., "in 3 days", "2 days ago")

---

## Daily Priority Recalculation

A scheduled job runs daily at **2:00 AM UTC** to recalculate all task priorities:

1. Loads all tasks from all queues
2. Recalculates priority for each task using current date
3. Saves updated priorities
4. Checks for priority changes that require active task demotion

This ensures:
- Tasks automatically gain urgency as deadlines approach
- "Someday" tasks eventually become urgent
- Priority scores reflect current state, not creation state

---

## Examples

### Example 1: High-Impact, Low-Effort Task (no deadline pressure)

```
Impact: 4, Urgency: 3, Relevance: 5, Effort: 2
Deadline: today + 21 days (auto-calculated from urgency 3)

Effort_inv = 6 - 2 = 4
Base = (4 × 0.35) + (3 × 0.25) + (5 × 0.25) + (4 × 0.15)
     = 1.4 + 0.75 + 1.25 + 0.6 = 4.0

Urgency bonus: 2.0 × e^(-0.10 × 21) ≈ 0.25
Final Priority = 4.0 + 0.25 = 4.25
```

### Example 2: Critical Task Due in 2 Days

```
Impact: 3, Urgency: 5, Relevance: 3, Effort: 4
Deadline: today + 2 days (custom or auto-calculated)

Effort_inv = 6 - 4 = 2
Base = (3 × 0.35) + (5 × 0.25) + (3 × 0.25) + (2 × 0.15)
     = 1.05 + 1.25 + 0.75 + 0.3 = 3.35

Urgency bonus: 2.0 × e^(-0.10 × 2) ≈ 1.64
Final Priority = 3.35 + 1.64 = 4.99
```

### Example 3: Maximum Priority Task (overdue)

```
Impact: 5, Urgency: 5, Relevance: 5, Effort: 1
Deadline: today or past

Effort_inv = 6 - 1 = 5
Base = (5 × 0.35) + (5 × 0.25) + (5 × 0.25) + (5 × 0.15)
     = 1.75 + 1.25 + 1.25 + 0.75 = 5.0

Urgency bonus: 2.0 (deadline reached/overdue)
Final Priority = 5.0 + 2.0 = 7.0
```

### Example 4: "Someday" Task Priority Over Time

```
Day 0: Create "Someday" task
Impact: 3, Urgency: 1, Relevance: 3, Effort: 1
Deadline: today + 60 days (auto-calculated)

Base priority = 3.05
Urgency bonus = 2.0 × e^(-0.10 × 60) ≈ 0.00
Priority = 3.05 (very low)

Day 30: 30 days remaining
Urgency bonus = 2.0 × e^(-0.10 × 30) ≈ 0.10
Priority = 3.15 (slightly higher)

Day 53: 7 days remaining
Urgency bonus = 2.0 × e^(-0.10 × 7) ≈ 1.01
Priority = 4.06 (significantly higher!)

Day 58: 2 days remaining
Urgency bonus = 2.0 × e^(-0.10 × 2) ≈ 1.64
Priority = 4.69 (critical!)
```

This demonstrates how "Someday" tasks automatically escalate as their deadline approaches.

---

## Priority Score Ranges

Based on the formula, priority scores fall into these ranges:

| Score | Label | Description |
|---|---|---|
| ≥ 6.0 | Critical | Maximum impact + near deadline |
| 4.5 – 5.99 | High | High value or approaching deadline |
| 3.0 – 4.49 | Normal | Standard priority tasks |
| < 3.0 | Low | Low value with distant deadline |

**Theoretical range**: 0.85 (minimum) – 7.0 (maximum)

---

## Implementation

### Core Functions

Located in `src/services/priorityCalc.ts`:

```typescript
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
```

### Task Model

Located in `src/models/task.ts`:

```typescript
export const TaskSchema = z.object({
  // ... other fields
  deadline: z.string().datetime(),           // Required, always a date
  custom_deadline: z.boolean().default(false), // True if user-set
  priority: z.number(),                      // Calculated value
  // ... other fields
});
```

### Scheduled Recalculation

Located in `src/index.ts`:

```typescript
// Daily at 2:00 AM UTC
cron.schedule('0 2 * * *', async () => {
  await recalculateAllPriorities();
});
```

---

## Modifying the Formula

To change the priority calculation:

1. **Adjust Weights**: Modify the weight values in `calculatePriority()`
   - Ensure weights sum to 1.0 for balanced scoring
   - Example: To prioritize urgency more, use Impact: 0.3, Urgency: 0.4, Relevance: 0.2, Effort: 0.1

2. **Change k Coefficient**: Modify the default value in `calculateUrgencyBonus()`
   - Higher k = steeper curve (urgency matters only close to deadline)
   - Lower k = gradual curve (urgency builds over longer period)

3. **Change Deadline Offsets**: Modify the switch statement in `calculateDeadlineFromUrgency()`
   - Adjust how many days each urgency level represents

4. **Update Tests**: Modify `tests/priorityCalc.test.ts` to reflect new expected values

5. **Update Documentation**: Keep this file in sync with any formula changes

---

## Testing

Test file: `tests/priorityCalc.test.ts`

Tests cover:
- Basic priority calculation with all parameter combinations
- Urgency bonus calculation at various time intervals
- Deadline auto-calculation from urgency levels
- Edge cases (overdue, same day, far future)
- Formula accuracy to 2 decimal places
