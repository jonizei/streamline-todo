import { promises as fs } from 'fs';
import path from 'path';
import { Queue, QueueSchema } from '../models/queue.js';

const QUEUES_BASE_DIR = process.env.QUEUES_DIR || 'data/queues';

class QueueRepository {
  private cache: Map<string, Queue> = new Map();
  private userIndex: Map<string, Set<string>> = new Map(); // user_id -> Set<queue_id>
  private initialized: boolean = false;

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await fs.mkdir(QUEUES_BASE_DIR, { recursive: true });
      const queueDirs = await fs.readdir(QUEUES_BASE_DIR);

      for (const queueDir of queueDirs) {
        const queueFilePath = path.join(QUEUES_BASE_DIR, queueDir, 'queue.json');
        try {
          const content = await fs.readFile(queueFilePath, 'utf-8');
          const queue = QueueSchema.parse(JSON.parse(content));
          this.cache.set(queue.id, queue);
          this.addToUserIndex(queue.user_id, queue.id);
        } catch (error) {
          // Skip if queue.json doesn't exist or is invalid
          continue;
        }
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize queue repository: ${error}`);
    }
  }

  private addToUserIndex(userId: string, queueId: string): void {
    if (!this.userIndex.has(userId)) {
      this.userIndex.set(userId, new Set());
    }
    this.userIndex.get(userId)!.add(queueId);
  }

  private removeFromUserIndex(userId: string, queueId: string): void {
    const userQueues = this.userIndex.get(userId);
    if (userQueues) {
      userQueues.delete(queueId);
      if (userQueues.size === 0) {
        this.userIndex.delete(userId);
      }
    }
  }

  async save(queue: Queue): Promise<Queue> {
    const queueDir = path.join(QUEUES_BASE_DIR, queue.id);
    const tasksDir = path.join(queueDir, 'tasks');
    const queueFilePath = path.join(queueDir, 'queue.json');

    await fs.mkdir(tasksDir, { recursive: true });
    await fs.writeFile(queueFilePath, JSON.stringify(queue, null, 2), 'utf-8');
    this.cache.set(queue.id, queue);
    this.addToUserIndex(queue.user_id, queue.id);
    return queue;
  }

  async findById(id: string): Promise<Queue | null> {
    return this.cache.get(id) || null;
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Queue | null> {
    const queue = this.cache.get(id);
    if (!queue || queue.user_id !== userId) {
      return null;
    }
    return queue;
  }

  async findAll(): Promise<Queue[]> {
    return Array.from(this.cache.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  async findByUserId(userId: string): Promise<Queue[]> {
    const queueIds = this.userIndex.get(userId);
    if (!queueIds) {
      return [];
    }

    const queues: Queue[] = [];
    for (const queueId of queueIds) {
      const queue = this.cache.get(queueId);
      if (queue) {
        queues.push(queue);
      }
    }

    return queues.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  async update(id: string, updates: Partial<Queue>): Promise<Queue | null> {
    const existingQueue = this.cache.get(id);
    if (!existingQueue) {
      return null;
    }

    const updatedQueue: Queue = {
      ...existingQueue,
      ...updates,
      id: existingQueue.id,
      user_id: existingQueue.user_id, // Prevent user_id changes
      created_at: existingQueue.created_at,
      updated_at: new Date().toISOString(),
    };

    const queueFilePath = path.join(QUEUES_BASE_DIR, id, 'queue.json');
    await fs.writeFile(queueFilePath, JSON.stringify(updatedQueue, null, 2), 'utf-8');
    this.cache.set(id, updatedQueue);
    return updatedQueue;
  }

  async remove(id: string): Promise<boolean> {
    const queue = this.cache.get(id);
    if (!queue) {
      return false;
    }

    const queueDir = path.join(QUEUES_BASE_DIR, id);
    try {
      await fs.rm(queueDir, { recursive: true, force: true });
      this.cache.delete(id);
      this.removeFromUserIndex(queue.user_id, id);
      return true;
    } catch (error) {
      return false;
    }
  }

  getQueueDir(queueId: string): string {
    return path.join(QUEUES_BASE_DIR, queueId);
  }

  getTasksDir(queueId: string): string {
    return path.join(QUEUES_BASE_DIR, queueId, 'tasks');
  }
}

export const queueRepository = new QueueRepository();
