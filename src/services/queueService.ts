import { randomUUID } from 'crypto';
import { Queue, CreateQueueInput, UpdateQueueInput } from '../models/queue.js';
import { queueRepository } from '../repositories/queueRepository.js';
import { AppError } from '../middleware/errorHandler.js';

export class QueueService {
  async createQueue(userId: string, input: CreateQueueInput): Promise<Queue> {
    const now = new Date().toISOString();
    const queue: Queue = {
      id: randomUUID(),
      user_id: userId,
      name: input.name,
      description: input.description,
      created_at: now,
      updated_at: now,
    };

    return await queueRepository.save(queue);
  }

  async getQueue(userId: string, id: string): Promise<Queue | null> {
    return await queueRepository.findByIdAndUserId(id, userId);
  }

  async getAllQueues(userId: string): Promise<Queue[]> {
    return await queueRepository.findByUserId(userId);
  }

  async updateQueue(userId: string, id: string, input: UpdateQueueInput): Promise<Queue | null> {
    const existingQueue = await queueRepository.findByIdAndUserId(id, userId);
    if (!existingQueue) {
      return null;
    }

    return await queueRepository.update(id, input);
  }

  async deleteQueue(userId: string, id: string): Promise<boolean> {
    const queue = await queueRepository.findByIdAndUserId(id, userId);
    if (!queue) {
      return false;
    }

    return await queueRepository.remove(id);
  }

  /**
   * Verify that a queue exists and belongs to the user
   * @throws AppError if queue not found or doesn't belong to user
   */
  async verifyQueueOwnership(userId: string, queueId: string): Promise<Queue> {
    const queue = await queueRepository.findByIdAndUserId(queueId, userId);
    if (!queue) {
      throw new AppError(404, 'Queue not found');
    }
    return queue;
  }
}

export const queueService = new QueueService();
