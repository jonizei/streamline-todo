import { promises as fs } from 'fs';
import path from 'path';
import { Task, TaskSchema } from '../models/task.js';

const QUEUES_BASE_DIR = process.env.QUEUES_DIR || 'data/queues';

class TaskRepository {
  private cache: Map<string, Task> = new Map();
  private initialized: boolean = false;

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await fs.mkdir(QUEUES_BASE_DIR, { recursive: true });
      const queueDirs = await fs.readdir(QUEUES_BASE_DIR);

      for (const queueDir of queueDirs) {
        const tasksDir = path.join(QUEUES_BASE_DIR, queueDir, 'tasks');
        try {
          const taskFiles = await fs.readdir(tasksDir);

          for (const file of taskFiles) {
            if (file.endsWith('.json')) {
              const filePath = path.join(tasksDir, file);
              const content = await fs.readFile(filePath, 'utf-8');
              const task = TaskSchema.parse(JSON.parse(content));
              this.cache.set(task.id, task);
            }
          }
        } catch (error) {
          continue;
        }
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize task repository: ${error}`);
    }
  }

  async save(task: Task): Promise<Task> {
    const tasksDir = path.join(QUEUES_BASE_DIR, task.queue_id, 'tasks');
    await fs.mkdir(tasksDir, { recursive: true });

    const filePath = path.join(tasksDir, `${task.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(task, null, 2), 'utf-8');
    this.cache.set(task.id, task);
    return task;
  }

  async findById(id: string): Promise<Task | null> {
    return this.cache.get(id) || null;
  }

  async findAll(queueId: string): Promise<Task[]> {
    const tasks = Array.from(this.cache.values())
      .filter(task => task.queue_id === queueId);
    return tasks.sort((a, b) => b.priority - a.priority);
  }

  async findTopQueued(queueId: string): Promise<Task | null> {
    const queuedTasks = Array.from(this.cache.values())
      .filter(task => task.queue_id === queueId && task.status === 'Queued')
      .sort((a, b) => b.priority - a.priority);

    return queuedTasks[0] || null;
  }

  async findActive(queueId: string): Promise<Task | null> {
    const tasks = Array.from(this.cache.values());
    return tasks.find(task => task.queue_id === queueId && task.status === 'Active') || null;
  }

  async findAllTasks(): Promise<Task[]> {
    return Array.from(this.cache.values());
  }

  async update(id: string, updates: Partial<Task>): Promise<Task | null> {
    const existingTask = this.cache.get(id);
    if (!existingTask) {
      return null;
    }

    const updatedTask: Task = {
      ...existingTask,
      ...updates,
      queue_id: existingTask.queue_id,
      updated_at: new Date().toISOString(),
    };

    const filePath = path.join(QUEUES_BASE_DIR, existingTask.queue_id, 'tasks', `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(updatedTask, null, 2), 'utf-8');
    this.cache.set(id, updatedTask);
    return updatedTask;
  }

  async remove(id: string): Promise<boolean> {
    const task = this.cache.get(id);
    if (!task) {
      return false;
    }

    const filePath = path.join(QUEUES_BASE_DIR, task.queue_id, 'tasks', `${id}.json`);
    try {
      await fs.unlink(filePath);
      this.cache.delete(id);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const taskRepository = new TaskRepository();
