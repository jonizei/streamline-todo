import { z } from 'zod';

export const TaskStatus = z.enum(['Queued', 'Active', 'Done', 'Blocked', 'Removed']);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  queue_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  impact: z.number().int().min(1).max(5),
  urgency: z.number().int().min(1).max(5),
  relevance: z.number().int().min(1).max(5),
  effort: z.number().int().min(1).max(5),
  deadline: z.string().datetime(),
  custom_deadline: z.boolean().default(false),
  priority: z.number(),
  status: TaskStatus,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  impact: z.number().int().min(1).max(5),
  urgency: z.number().int().min(1).max(5),
  relevance: z.number().int().min(1).max(5),
  effort: z.number().int().min(1).max(5),
  deadline: z.string().datetime().optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  impact: z.number().int().min(1).max(5).optional(),
  urgency: z.number().int().min(1).max(5).optional(),
  relevance: z.number().int().min(1).max(5).optional(),
  effort: z.number().int().min(1).max(5).optional(),
  deadline: z.string().datetime().optional(),
});

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const UpdateStatusSchema = z.object({
  status: z.enum(['Done', 'Blocked', 'Removed']),
});

export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
