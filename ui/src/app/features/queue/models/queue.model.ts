import { Task } from './task.model';

export interface Queue {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQueueRequest {
  name: string;
  description?: string;
}

export interface UpdateQueueRequest {
  name?: string;
  description?: string;
}

export interface QueueWithActiveTask extends Queue {
  activeTask?: Task;
}
