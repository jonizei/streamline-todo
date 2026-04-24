export type TaskStatus = 'Queued' | 'Active' | 'Done' | 'Blocked' | 'Removed';

export interface Task {
  id: string;
  queue_id: string;
  title: string;
  description?: string;
  impact: number;      // 1-5
  urgency: number;     // 1-5
  relevance: number;   // 1-5
  effort: number;      // 1-5
  deadline: string;    // ISO 8601 datetime
  custom_deadline: boolean;
  priority: number;    // Auto-calculated
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  impact: number;
  urgency: number;
  relevance: number;
  effort: number;
  deadline?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  impact?: number;
  urgency?: number;
  relevance?: number;
  effort?: number;
  deadline?: string;
}

export interface UpdateTaskStatusRequest {
  status: 'Done' | 'Blocked' | 'Removed';
}

export interface PriorityFactors {
  impact: number;
  urgency: number;
  relevance: number;
  effort: number;
  deadline: string;
}

export interface PriorityResult {
  priority: number;
  breakdown: {
    impactContribution: number;
    urgencyContribution: number;
    relevanceContribution: number;
    effortContribution: number;
    urgencyBonus: number;
  };
}
