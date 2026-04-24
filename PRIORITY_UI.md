# Priority UI: User-Facing Form Options

This document defines the user-facing form options for task creation and editing. Each option maps to internal priority parameters used by the `calculatePriority()` function.

---

## Task Creation Form

The task form presents 3 simple questions that map to the 4 priority parameters (Impact, Urgency, Relevance, Effort) plus an optional custom deadline.

---

## Question 1: When does this need to be done?

**Maps to**: Urgency + Deadline

This question sets both the urgency score AND calculates an automatic deadline. Users can also choose to set a custom deadline.

### Options

| Display Label | Subtitle | Urgency | Auto Deadline |
|---|---|---|---|
| Right now | Critical, within 3 days | 5 | today + 3 days |
| This week | 4–7 days | 4 | today + 7 days |
| In the coming weeks | 1–3 weeks | 3 | today + 21 days |
| Next month | 3–6 weeks | 2 | today + 42 days |
| Someday | No deadline | 1 | today + 60 days |
| **Custom deadline** | Set exact deadline | varies | user-selected date |

### Custom Deadline Behavior

When **"Custom deadline"** is selected:
1. A date picker appears below the dropdown
2. User must select a date (required when this option is chosen)
3. The system calculates urgency based on days until the selected deadline:
   - ≤ 3 days: urgency = 5
   - ≤ 7 days: urgency = 4
   - ≤ 21 days: urgency = 3
   - ≤ 42 days: urgency = 2
   - > 42 days: urgency = 1
4. The `custom_deadline` flag is set to `true`
5. The deadline is displayed on the task card

### Editing Behavior

When editing a task:
- **Task with custom deadline**: Dropdown shows "Custom deadline" selected, date picker shows the custom date
- **Task with auto deadline**: Dropdown shows the corresponding urgency option (no date picker)
- **Changing urgency**: Clears any custom deadline and uses the new auto-calculated deadline
- **Changing to custom deadline**: Clears auto deadline, requires date selection

---

## Question 2: What does this task accomplish?

**Maps to**: Impact + Relevance (combined)

These two parameters are set together because tasks that align with primary goals typically also carry high impact, and vice versa.

### Options

| Display Label | Subtitle | Impact | Relevance |
|---|---|---|---|
| Advances career or business | Strategic goal | 5 | 5 |
| Produces or ships something new | Product/Feature | 5 | 4 |
| Removes a blocker or problem | Bug/Bottleneck | 4 | 5 |
| Improves or optimizes | Quality/Speed | 3 | 3 |
| Routine or administrative | Maintenance/Report | 2 | 2 |
| Other / unclear value | No clear benefit | 1 | 1 |

### UI Implementation

```html
<select formControlName="accomplishmentOption">
  <option value="" disabled>Select accomplishment...</option>
  <option value="career">Advances career or business (Strategic goal)</option>
  <option value="shipping">Produces or ships something new (Product/Feature)</option>
  <option value="blocker">Removes a blocker or problem (Bug/Bottleneck)</option>
  <option value="optimize">Improves or optimizes (Quality/Speed)</option>
  <option value="routine">Routine or administrative (Maintenance/Report)</option>
  <option value="other">Other / unclear value</option>
</select>
```

### Mapping Code

```typescript
switch (formValue.accomplishmentOption) {
  case 'career': impact = 5; relevance = 5; break;
  case 'shipping': impact = 5; relevance = 4; break;
  case 'blocker': impact = 4; relevance = 5; break;
  case 'optimize': impact = 3; relevance = 3; break;
  case 'routine': impact = 2; relevance = 2; break;
  case 'other': impact = 1; relevance = 1; break;
}
```

---

## Question 3: How much time and effort does this take?

**Maps to**: Effort

### Options

| Display Label | Subtitle | Effort |
|---|---|---|
| Quick task | < 30 min | 1 |
| Small task | 30 min – 2 h | 2 |
| Half-day work | 2–6 hours | 3 |
| Full-day project | 1–2 days | 4 |
| Large body of work | 3+ days | 5 |

**Remember**: Effort is inverted in the formula (6 - Effort), so lower effort contributes MORE to priority, encouraging quick wins.

---

## Priority Badge Display

After priority is calculated, it's displayed to the user with a color-coded badge.

### Priority Ranges and Colors

| Priority Score | Label | Badge Color | Text Color |
|---|---|---|---|
| ≥ 6.0 | Critical | bg-red-600 | text-white |
| 4.5 – 5.99 | High | bg-orange-500 | text-white |
| 3.0 – 4.49 | Normal | bg-blue-500 | text-white |
| < 3.0 | Low | bg-gray-500 | text-white |

### UI Component

Located in `ui/src/app/features/queue/components/priority-badge/priority-badge.component.ts`:

```typescript
getPriorityLabel(): string {
  if (this.priority >= 6) return 'Critical';
  if (this.priority >= 4.5) return 'High';
  if (this.priority >= 3) return 'Normal';
  return 'Low';
}

getPriorityColor(): string {
  if (this.priority >= 6) return 'bg-red-600 text-white';
  if (this.priority >= 4.5) return 'bg-orange-500 text-white';
  if (this.priority >= 3) return 'bg-blue-500 text-white';
  return 'bg-gray-500 text-white';
}
```

---

## Deadline Display

Deadlines are displayed on task cards, but only when they are **custom** (user-set) deadlines.

### Display Rules

- **Auto-calculated deadlines**: Not displayed (internal only for priority calculation)
- **Custom deadlines**: Displayed with "Deadline" label in relative format

### Relative Date Format

Uses the `relativeDate` pipe to format deadlines:

- **Future**: "in 3 days", "in 2 weeks", "in 1 month"
- **Today**: "today"
- **Past (overdue)**: "2 days ago", "1 week ago"

### UI Implementation

```html
<!-- Active task card -->
@if (task.custom_deadline) {
  <span class="text-blue-300 text-sm">Deadline {{ task.deadline | relativeDate }}</span>
}

<!-- Task card -->
@if (task.custom_deadline) {
  <div>Deadline {{ task.deadline | relativeDate }}</div>
}
```

---

## Example User Flows

### Flow 1: Create High-Priority Task with Auto Deadline

```
User inputs:
Question 1: "Right now" (3 days)
Question 2: "Advances career or business"
Question 3: "Half-day work"

System calculates:
urgency = 5
deadline = today + 3 days (auto-calculated)
custom_deadline = false
impact = 5
relevance = 5
effort = 3

Priority calculation:
base = (5 × 0.35) + (5 × 0.25) + (5 × 0.25) + (3 × 0.15) = 4.45
urgency_bonus = 2.0 × e^(-0.10 × 3) ≈ 1.48
priority = 4.45 + 1.48 = 5.93

Display:
- Priority badge: "High" (orange)
- Deadline: NOT shown (auto-calculated)
- Position: Near top of queue
```

### Flow 2: Create Task with Custom Deadline

```
User inputs:
Question 1: "Custom deadline" → selects May 15, 2026 (30 days from now)
Question 2: "Produces or ships something new"
Question 3: "Full-day project"

System calculates:
custom_deadline = true
deadline = 2026-05-15T00:00:00.000Z
urgency = 2 (auto-calculated from 30 days)
impact = 5
relevance = 4
effort = 4

Priority calculation:
base = (5 × 0.35) + (2 × 0.25) + (4 × 0.25) + (2 × 0.15) = 3.55
urgency_bonus = 2.0 × e^(-0.10 × 30) ≈ 0.10
priority = 3.55 + 0.10 = 3.65

Display:
- Priority badge: "Normal" (blue)
- Deadline: "Deadline in 30 days" (shown because custom)
- Position: Middle of queue

After 23 days (7 days remaining):
urgency_bonus = 2.0 × e^(-0.10 × 7) ≈ 1.01
priority = 3.55 + 1.01 = 4.56
- Priority badge: "High" (orange)
- Deadline: "Deadline in 7 days"
- Position: Moves higher in queue
```

### Flow 3: Edit Task and Change to Custom Deadline

```
Existing task:
Question 1: "In the coming weeks" (auto: today + 21 days)
Question 2: "Routine or administrative"
Question 3: "Small task"

User edits:
Question 1: Change to "Custom deadline" → selects tomorrow
(Questions 2 & 3 unchanged)

System updates:
custom_deadline = true (was false)
deadline = tomorrow (was today + 21 days)
urgency = 5 (recalculated from 1 day)
impact = 2 (unchanged)
relevance = 2 (unchanged)
effort = 2 (unchanged)

New priority:
base = (2 × 0.35) + (5 × 0.25) + (2 × 0.25) + (4 × 0.15) = 3.15
urgency_bonus = 2.0 × e^(-0.10 × 1) ≈ 1.81
priority = 3.15 + 1.81 = 4.96

Result:
- Task jumps from low priority (2.80) to high priority (4.96)
- Deadline now displayed: "Deadline tomorrow"
- Task may become active if priority exceeds current active task
```

---

## Form Validation

### Required Fields

All three questions are required:

```typescript
this.taskForm = this.fb.group({
  title: ['', [Validators.required, Validators.maxLength(200)]],
  description: ['', [Validators.maxLength(2000)]],
  urgencyOption: [null, [Validators.required]],           // Q1
  accomplishmentOption: [null, [Validators.required]],    // Q2
  effortOption: [null, [Validators.required]],            // Q3
  customDeadline: ['']  // Optional, but required if urgencyOption === 'custom'
});
```

### Custom Deadline Validation

```typescript
onSubmit(): void {
  const formValue = this.taskForm.value;

  if (formValue.urgencyOption === 'custom') {
    if (!formValue.customDeadline) {
      // Show error: "Please select a deadline date"
      this.customDeadline?.setErrors({ required: true });
      return;
    }
  }
  // ... continue with submission
}
```

---

## Mobile Responsiveness

The form adapts to mobile screens (360px width):

- **Modal**: Fullscreen on mobile, centered dialog on desktop
- **Input fields**: Full width with appropriate spacing
- **Date picker**: Native date input for better mobile UX
- **Labels**: Shorter on mobile, full on desktop

---

## Accessibility

- All form controls have associated labels
- Dropdown options have descriptive subtitles
- Error messages appear below invalid fields
- Priority badges use semantic colors with text labels
- Keyboard navigation supported throughout

---

## Technical Implementation

### Form Component

Located in `ui/src/app/features/queue/components/task-form/task-form.component.ts`

Key methods:
- `initForm()`: Initializes form with existing task data or defaults
- `onSubmit()`: Maps form values to API request format
- `calculateUrgencyFromDeadline()`: Derives urgency from custom deadline
- `toLocalDatetime()`: Converts ISO datetime to date input format

### Priority Service

Located in `ui/src/app/features/queue/services/priority.service.ts`

Provides:
- `getPriorityLabel(priority: number): string`
- `getPriorityColor(priority: number): string`
- Client-side priority utilities (actual calculation is server-side)

---

## Summary

The UI simplifies the complex priority calculation into 3 intuitive questions:
1. **When?** → Urgency + Deadline
2. **What?** → Impact + Relevance
3. **How much work?** → Effort

This design:
- Hides complexity from users
- Maps naturally to how people think about tasks
- Allows both auto-calculated and custom deadlines
- Provides immediate visual feedback through priority badges
- Automatically updates priorities as deadlines approach
