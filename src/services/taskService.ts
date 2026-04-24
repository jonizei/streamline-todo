import { randomUUID } from 'crypto';
import { Task, CreateTaskInput, UpdateTaskInput, UpdateStatusInput } from '../models/task.js';
import { taskRepository } from '../repositories/taskRepository.js';
import { calculatePriority, calculateDeadlineFromUrgency } from './priorityCalc.js';
import { queueService } from './queueService.js';

export class TaskService {
  async createTask(userId: string, queueId: string, input: CreateTaskInput): Promise<Task> {
    // Verify queue ownership
    await queueService.verifyQueueOwnership(userId, queueId);

    // Auto-calculate deadline if not provided
    const customDeadline = !!input.deadline;
    const deadline = input.deadline ?? calculateDeadlineFromUrgency(input.urgency);

    const now = new Date().toISOString();
    const priority = calculatePriority({
      impact: input.impact,
      urgency: input.urgency,
      relevance: input.relevance,
      effort: input.effort,
      deadline: deadline,
    });

    const task: Task = {
      id: randomUUID(),
      queue_id: queueId,
      title: input.title,
      description: input.description,
      impact: input.impact,
      urgency: input.urgency,
      relevance: input.relevance,
      effort: input.effort,
      deadline: deadline,
      custom_deadline: customDeadline,
      priority,
      status: 'Queued',
      created_at: now,
      updated_at: now,
    };

    const savedTask = await taskRepository.save(task);

    // Check active task
    const activeTask = await taskRepository.findActive(queueId);
    if (!activeTask) {
      // No active task exists - promote this task
      const promotedTask = await this.promoteNextTask(queueId);
      return promotedTask || savedTask;
    }

    // If new task has higher priority than active, swap them
    if (savedTask.priority > activeTask.priority) {
      await taskRepository.update(activeTask.id, { status: 'Queued' });
      await taskRepository.update(savedTask.id, { status: 'Active' });
      return (await taskRepository.findById(savedTask.id))!;
    }

    return savedTask;
  }

  async getNextTask(userId: string, queueId: string): Promise<Task | null> {
    // Verify queue ownership
    await queueService.verifyQueueOwnership(userId, queueId);
    return await taskRepository.findActive(queueId);
  }

  async getAllTasks(userId: string, queueId: string): Promise<Task[]> {
    // Verify queue ownership
    await queueService.verifyQueueOwnership(userId, queueId);
    return await taskRepository.findAll(queueId);
  }

  async getTask(userId: string, taskId: string): Promise<Task | null> {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      return null;
    }
    // Verify queue ownership
    await queueService.verifyQueueOwnership(userId, task.queue_id);
    return task;
  }

  async updateTask(userId: string, taskId: string, input: UpdateTaskInput): Promise<Task | null> {
    const existingTask = await taskRepository.findById(taskId);
    if (!existingTask) {
      return null;
    }

    // Verify queue ownership
    await queueService.verifyQueueOwnership(userId, existingTask.queue_id);

    console.log('updateTask - input:', JSON.stringify(input, null, 2));
    console.log('updateTask - existingTask.custom_deadline:', existingTask.custom_deadline);
    console.log('updateTask - existingTask.deadline:', existingTask.deadline);

    // Recalculate priority if any priority parameters changed
    let newPriority = existingTask.priority;
    let newDeadline = existingTask.deadline;
    let newCustomDeadline = existingTask.custom_deadline;

    // Check if urgency actually changed
    const urgencyChanged = input.urgency !== undefined && input.urgency !== existingTask.urgency;
    console.log('updateTask - urgencyChanged:', urgencyChanged);

    if (
      input.impact !== undefined ||
      input.urgency !== undefined ||
      input.relevance !== undefined ||
      input.effort !== undefined ||
      input.deadline !== undefined
    ) {
      // Handle deadline updates
      if (input.deadline !== undefined) {
        // User explicitly provided a deadline
        newDeadline = input.deadline;
        newCustomDeadline = true;
      } else if (urgencyChanged) {
        // Urgency changed - recalculate deadline from new urgency
        newDeadline = calculateDeadlineFromUrgency(input.urgency!);
        newCustomDeadline = false;
      }
      // Otherwise keep existing deadline and custom_deadline flag

      newPriority = calculatePriority({
        impact: input.impact ?? existingTask.impact,
        urgency: input.urgency ?? existingTask.urgency,
        relevance: input.relevance ?? existingTask.relevance,
        effort: input.effort ?? existingTask.effort,
        deadline: newDeadline,
      });
    }

    console.log('updateTask - final values - newDeadline:', newDeadline);
    console.log('updateTask - final values - newCustomDeadline:', newCustomDeadline);

    const updatedTask = await taskRepository.update(taskId, {
      ...input,
      deadline: newDeadline,
      custom_deadline: newCustomDeadline,
      priority: newPriority,
    });

    if (!updatedTask) {
      return null;
    }

    // Check if active task should be demoted due to priority change
    if (updatedTask.status === 'Active') {
      const topQueued = await taskRepository.findTopQueued(updatedTask.queue_id);
      if (topQueued && topQueued.priority > updatedTask.priority) {
        // Demote current active task
        await taskRepository.update(updatedTask.id, { status: 'Queued' });
        // Promote highest priority queued task
        await taskRepository.update(topQueued.id, { status: 'Active' });
        return await taskRepository.findById(updatedTask.id);
      }
    }

    return updatedTask;
  }

  async updateTaskStatus(userId: string, taskId: string, input: UpdateStatusInput): Promise<Task | null> {
    const existingTask = await taskRepository.findById(taskId);
    if (!existingTask) {
      return null;
    }

    // Verify queue ownership
    await queueService.verifyQueueOwnership(userId, existingTask.queue_id);

    // Validate status transition
    if (existingTask.status !== 'Active' && existingTask.status !== 'Queued') {
      throw new Error('Cannot change status of a task that is already Done, Blocked, or Removed');
    }

    const wasActive = existingTask.status === 'Active';

    const updatedTask = await taskRepository.update(taskId, {
      status: input.status,
    });

    if (!updatedTask) {
      return null;
    }

    // If the active task was removed, promote the next task
    if (wasActive) {
      await this.promoteNextTask(existingTask.queue_id);
    }

    return await taskRepository.findById(taskId);
  }

  private async promoteNextTask(queueId: string): Promise<Task | null> {
    const topQueued = await taskRepository.findTopQueued(queueId);
    if (topQueued) {
      await taskRepository.update(topQueued.id, { status: 'Active' });
      return (await taskRepository.findById(topQueued.id))!;
    }

    // No tasks to promote - empty queue is a valid state
    return null;
  }
}

export const taskService = new TaskService();
