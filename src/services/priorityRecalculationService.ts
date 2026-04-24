import { taskRepository } from '../repositories/taskRepository.js';
import { calculatePriority } from './priorityCalc.js';

export class PriorityRecalculationService {
  /**
   * Recalculates priorities for all tasks based on current date.
   * This ensures tasks gain urgency as their deadlines approach.
   */
  async recalculateAllPriorities(): Promise<{
    totalTasks: number;
    updatedTasks: number;
    activeTaskChanges: number;
  }> {
    const allTasks = await taskRepository.findAllTasks();
    let updatedTasks = 0;
    let activeTaskChanges = 0;
    const priorityChanges = new Map<string, { oldPriority: number; newPriority: number }>();

    // Step 1: Recalculate all task priorities
    for (const task of allTasks) {
      const newPriority = calculatePriority({
        impact: task.impact,
        urgency: task.urgency,
        relevance: task.relevance,
        effort: task.effort,
        deadline: task.deadline,
      });

      // Only update if priority changed significantly (> 0.01 difference)
      if (Math.abs(newPriority - task.priority) > 0.01) {
        priorityChanges.set(task.id, {
          oldPriority: task.priority,
          newPriority: newPriority,
        });

        await taskRepository.update(task.id, { priority: newPriority });
        updatedTasks++;
      }
    }

    // Step 2: Check if active tasks need to be swapped in each queue
    const queues = new Set(allTasks.map(t => t.queue_id));

    for (const queueId of queues) {
      const activeTask = await taskRepository.findActive(queueId);
      if (!activeTask) continue;

      const topQueued = await taskRepository.findTopQueued(queueId);
      if (!topQueued) continue;

      // Get updated priorities if they changed
      const activeNewPriority = priorityChanges.get(activeTask.id)?.newPriority ?? activeTask.priority;
      const queuedNewPriority = priorityChanges.get(topQueued.id)?.newPriority ?? topQueued.priority;

      // If highest queued task now has higher priority than active, swap them
      if (queuedNewPriority > activeNewPriority) {
        await taskRepository.update(activeTask.id, { status: 'Queued' });
        await taskRepository.update(topQueued.id, { status: 'Active' });
        activeTaskChanges++;
      }
    }

    return {
      totalTasks: allTasks.length,
      updatedTasks,
      activeTaskChanges,
    };
  }

  /**
   * Recalculates priorities for tasks in a specific queue.
   */
  async recalculateQueuePriorities(queueId: string): Promise<{
    totalTasks: number;
    updatedTasks: number;
    activeTaskChanged: boolean;
  }> {
    const tasks = await taskRepository.findAll(queueId);
    let updatedTasks = 0;
    const priorityChanges = new Map<string, { oldPriority: number; newPriority: number }>();

    // Recalculate priorities
    for (const task of tasks) {
      const newPriority = calculatePriority({
        impact: task.impact,
        urgency: task.urgency,
        relevance: task.relevance,
        effort: task.effort,
        deadline: task.deadline,
      });

      if (Math.abs(newPriority - task.priority) > 0.01) {
        priorityChanges.set(task.id, {
          oldPriority: task.priority,
          newPriority: newPriority,
        });

        await taskRepository.update(task.id, { priority: newPriority });
        updatedTasks++;
      }
    }

    // Check active task swap
    let activeTaskChanged = false;
    const activeTask = await taskRepository.findActive(queueId);
    if (activeTask) {
      const topQueued = await taskRepository.findTopQueued(queueId);
      if (topQueued) {
        const activeNewPriority = priorityChanges.get(activeTask.id)?.newPriority ?? activeTask.priority;
        const queuedNewPriority = priorityChanges.get(topQueued.id)?.newPriority ?? topQueued.priority;

        if (queuedNewPriority > activeNewPriority) {
          await taskRepository.update(activeTask.id, { status: 'Queued' });
          await taskRepository.update(topQueued.id, { status: 'Active' });
          activeTaskChanged = true;
        }
      }
    }

    return {
      totalTasks: tasks.length,
      updatedTasks,
      activeTaskChanged,
    };
  }
}

export const priorityRecalculationService = new PriorityRecalculationService();
