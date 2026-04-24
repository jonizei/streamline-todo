import { z } from 'zod';

export const QueueSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Queue = z.infer<typeof QueueSchema>;

export const CreateQueueSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export type CreateQueueInput = z.infer<typeof CreateQueueSchema>;

export const UpdateQueueSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export type UpdateQueueInput = z.infer<typeof UpdateQueueSchema>;
