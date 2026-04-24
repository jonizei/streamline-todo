import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskService } from '../src/services/taskService';
import { taskRepository } from '../src/repositories/taskRepository';
import { Task, CreateTaskInput, UpdateTaskInput, UpdateStatusInput } from '../src/models/task';

// Mock the taskRepository module
vi.mock('../src/repositories/taskRepository', () => ({
  taskRepository: {
    save: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    findActive: vi.fn(),
    findTopQueued: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

// Mock the priority calculation functions
vi.mock('../src/services/priorityCalc', () => ({
  calculatePriority: vi.fn((params) => {
    // Simple mock calculation for testing
    const { impact, urgency, relevance, effort, deadline } = params;
    const effortInv = 6 - effort;
    let priority = (impact * 0.35) + (urgency * 0.25) + (relevance * 0.25) + (effortInv * 0.15);
    // Add simplified urgency bonus based on deadline
    if (deadline) {
      const daysRemaining = Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000));
      priority += 2.0 * Math.exp(-0.10 * daysRemaining);
    }
    return Math.round(priority * 100) / 100;
  }),
  calculateDeadlineFromUrgency: vi.fn((urgency) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let daysOffset;
    switch (urgency) {
      case 5: daysOffset = 3; break;
      case 4: daysOffset = 7; break;
      case 3: daysOffset = 21; break;
      case 2: daysOffset = 42; break;
      case 1: daysOffset = 60; break;
      default: daysOffset = 60;
    }
    return new Date(today.getTime() + daysOffset * 86_400_000).toISOString();
  }),
}));

// Mock the queueService module
vi.mock('../src/services/queueService', () => ({
  queueService: {
    verifyQueueOwnership: vi.fn(),
  },
}));

describe('TaskService', () => {
  let taskService: TaskService;
  const userId = '550e8400-e29b-41d4-a716-446655440099';
  const queueId = '550e8400-e29b-41d4-a716-446655440000';
  const taskId1 = '550e8400-e29b-41d4-a716-446655440001';
  const taskId2 = '550e8400-e29b-41d4-a716-446655440002';
  const taskId3 = '550e8400-e29b-41d4-a716-446655440003';

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Create a fresh instance of TaskService
    taskService = new TaskService();
  });

  describe('createTask', () => {
    it('should create a new task with calculated priority and Queued status', async () => {
      const input: CreateTaskInput = {
        title: 'Test Task',
        description: 'Test description',
        impact: 4,
        urgency: 3,
        relevance: 5,
        effort: 2,
      };

      const savedTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: input.title,
        description: input.description,
        impact: input.impact,
        urgency: input.urgency,
        relevance: input.relevance,
        effort: input.effort,
        priority: 4.0,
        status: 'Queued',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      // Mock repository calls
      vi.mocked(taskRepository.save).mockResolvedValue(savedTask);
      vi.mocked(taskRepository.findActive).mockResolvedValue({
        ...savedTask,
        id: taskId2,
        status: 'Active',
      });

      const result = await taskService.createTask(userId, queueId, input);

      expect(taskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          queue_id: queueId,
          title: input.title,
          description: input.description,
          impact: input.impact,
          urgency: input.urgency,
          relevance: input.relevance,
          effort: input.effort,
          deadline: expect.any(String),
          priority: expect.any(Number),
          status: 'Queued',
        })
      );
      expect(taskRepository.findActive).toHaveBeenCalledWith(queueId);
      expect(result).toEqual(savedTask);
    });

    it('should auto-promote task to Active when no active task exists in queue', async () => {
      const input: CreateTaskInput = {
        title: 'First Task',
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 3,
      };

      const savedTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: input.title,
        impact: input.impact,
        urgency: input.urgency,
        relevance: input.relevance,
        effort: input.effort,
        priority: 3.0,
        status: 'Queued',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const promotedTask: Task = {
        ...savedTask,
        status: 'Active',
      };

      // Mock: no active task exists, task gets promoted
      vi.mocked(taskRepository.save).mockResolvedValue(savedTask);
      vi.mocked(taskRepository.findActive).mockResolvedValue(null);
      vi.mocked(taskRepository.findTopQueued).mockResolvedValue(savedTask);
      vi.mocked(taskRepository.update).mockResolvedValue(promotedTask);
      vi.mocked(taskRepository.findById).mockResolvedValue(promotedTask);

      const result = await taskService.createTask(userId, queueId, input);

      // Should check for active task
      expect(taskRepository.findActive).toHaveBeenCalledWith(queueId);

      // Should find top queued and promote it
      expect(taskRepository.findTopQueued).toHaveBeenCalledWith(queueId);
      expect(taskRepository.update).toHaveBeenCalledWith(taskId1, { status: 'Active' });

      // Result should be the promoted task
      expect(result.status).toBe('Active');
    });

    it('should keep task as Queued when active task already exists', async () => {
      const input: CreateTaskInput = {
        title: 'Second Task',
        impact: 2,
        urgency: 2,
        relevance: 2,
        effort: 2,
      };

      const existingActiveTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Active Task',
        impact: 5,
        urgency: 5,
        relevance: 5,
        effort: 1,
        priority: 7.0,
        status: 'Active',
        created_at: '2026-04-05T09:00:00.000Z',
        updated_at: '2026-04-05T09:00:00.000Z',
      };

      const newQueuedTask: Task = {
        id: taskId2,
        queue_id: queueId,
        title: input.title,
        impact: input.impact,
        urgency: input.urgency,
        relevance: input.relevance,
        effort: input.effort,
        priority: 2.9,
        status: 'Queued',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      vi.mocked(taskRepository.save).mockResolvedValue(newQueuedTask);
      vi.mocked(taskRepository.findActive).mockResolvedValue(existingActiveTask);

      const result = await taskService.createTask(userId, queueId, input);

      expect(result.status).toBe('Queued');
      expect(result).toEqual(newQueuedTask);
    });

    it('should demote active task when creating new task with higher priority', async () => {
      // Step 1: Create first task (becomes active since queue is empty)
      const firstTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'First Task',
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 3,
        priority: 3.0,
        status: 'Queued',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const firstTaskPromoted: Task = {
        ...firstTask,
        status: 'Active',
      };

      // Mock first task creation - no active task exists
      vi.mocked(taskRepository.save).mockResolvedValueOnce(firstTask);
      vi.mocked(taskRepository.findActive).mockResolvedValueOnce(null);
      vi.mocked(taskRepository.findTopQueued).mockResolvedValueOnce(firstTask);
      vi.mocked(taskRepository.update).mockResolvedValueOnce(firstTaskPromoted);
      vi.mocked(taskRepository.findById).mockResolvedValueOnce(firstTaskPromoted);

      const result1 = await taskService.createTask(userId, queueId, {
        title: 'First Task',
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 3,
      });

      expect(result1.status).toBe('Active');
      expect(result1.priority).toBe(3.0);

      // Step 2: Create second task with LOWER priority (should stay Queued)
      const secondTask: Task = {
        id: taskId2,
        queue_id: queueId,
        title: 'Second Task - Lower Priority',
        impact: 2,
        urgency: 2,
        relevance: 2,
        effort: 4,
        priority: 2.25,
        status: 'Queued',
        created_at: '2026-04-05T10:01:00.000Z',
        updated_at: '2026-04-05T10:01:00.000Z',
      };

      // Mock second task creation - first task is active with higher priority
      vi.mocked(taskRepository.save).mockResolvedValueOnce(secondTask);
      vi.mocked(taskRepository.findActive).mockResolvedValueOnce(firstTaskPromoted);

      const result2 = await taskService.createTask(userId, queueId, {
        title: 'Second Task - Lower Priority',
        impact: 2,
        urgency: 2,
        relevance: 2,
        effort: 4,
      });

      expect(result2.status).toBe('Queued');
      expect(result2.priority).toBe(2.25);
      // First task should remain Active (no updates should be called for status swapping)
      expect(taskRepository.update).toHaveBeenCalledTimes(1); // Only the first promotion

      // Step 3: Create third task with HIGHER priority (should become Active, demoting first task)
      vi.clearAllMocks(); // Clear previous mock calls for clean assertion

      const thirdTask: Task = {
        id: taskId3,
        queue_id: queueId,
        title: 'Third Task - Highest Priority',
        impact: 5,
        urgency: 5,
        relevance: 5,
        effort: 1,
        priority: 7.0,
        status: 'Queued',
        created_at: '2026-04-05T10:02:00.000Z',
        updated_at: '2026-04-05T10:02:00.000Z',
      };

      const thirdTaskPromoted: Task = {
        ...thirdTask,
        status: 'Active',
      };

      const firstTaskDemoted: Task = {
        ...firstTaskPromoted,
        status: 'Queued',
      };

      // Mock third task creation - first task is active but has lower priority
      vi.mocked(taskRepository.save).mockResolvedValueOnce(thirdTask);
      vi.mocked(taskRepository.findActive).mockResolvedValueOnce(firstTaskPromoted);
      vi.mocked(taskRepository.update)
        .mockResolvedValueOnce(firstTaskDemoted) // Demote first task
        .mockResolvedValueOnce(thirdTaskPromoted); // Promote third task
      vi.mocked(taskRepository.findById).mockResolvedValueOnce(thirdTaskPromoted);

      const result3 = await taskService.createTask(userId, queueId, {
        title: 'Third Task - Highest Priority',
        impact: 5,
        urgency: 5,
        relevance: 5,
        effort: 1,
      });

      // Verify third task becomes Active
      expect(result3.status).toBe('Active');
      expect(result3.priority).toBe(7.0);

      // Verify the active task (first task) was demoted to Queued
      expect(taskRepository.update).toHaveBeenCalledWith(taskId1, { status: 'Queued' });

      // Verify the new task (third task) was promoted to Active
      expect(taskRepository.update).toHaveBeenCalledWith(taskId3, { status: 'Active' });

      // Verify both updates occurred
      expect(taskRepository.update).toHaveBeenCalledTimes(2);
    });

    it('should isolate tasks between different queues', async () => {
      const queueId2 = '550e8400-e29b-41d4-a716-446655440010';

      const input: CreateTaskInput = {
        title: 'Task in Queue 2',
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 3,
      };

      const newTask: Task = {
        id: taskId1,
        queue_id: queueId2,
        title: input.title,
        impact: input.impact,
        urgency: input.urgency,
        relevance: input.relevance,
        effort: input.effort,
        priority: 3.0,
        status: 'Queued',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const promotedTask: Task = { ...newTask, status: 'Active' };

      vi.mocked(taskRepository.save).mockResolvedValue(newTask);
      // No active task in queue 2
      vi.mocked(taskRepository.findActive).mockResolvedValue(null);
      vi.mocked(taskRepository.findTopQueued).mockResolvedValue(newTask);
      vi.mocked(taskRepository.update).mockResolvedValue(promotedTask);
      vi.mocked(taskRepository.findById).mockResolvedValue(promotedTask);

      await taskService.createTask(userId, queueId2, input);

      // Should only check for active tasks in the specific queue
      expect(taskRepository.findActive).toHaveBeenCalledWith(queueId2);
      expect(taskRepository.findTopQueued).toHaveBeenCalledWith(queueId2);
    });
  });

  describe('getNextTask', () => {
    it('should return the active task for a queue', async () => {
      const activeTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Active Task',
        impact: 5,
        urgency: 5,
        relevance: 5,
        effort: 1,
        priority: 7.0,
        status: 'Active',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      vi.mocked(taskRepository.findActive).mockResolvedValue(activeTask);

      const result = await taskService.getNextTask(userId, queueId);

      expect(taskRepository.findActive).toHaveBeenCalledWith(queueId);
      expect(result).toEqual(activeTask);
    });

    it('should return null when no active task exists', async () => {
      vi.mocked(taskRepository.findActive).mockResolvedValue(null);

      const result = await taskService.getNextTask(userId, queueId);

      expect(result).toBeNull();
    });
  });

  describe('getAllTasks', () => {
    it('should return all tasks in a queue sorted by priority', async () => {
      const tasks: Task[] = [
        {
          id: taskId1,
          queue_id: queueId,
          title: 'High Priority',
          impact: 5,
          urgency: 5,
          relevance: 5,
          effort: 1,
          priority: 7.0,
          status: 'Active',
          created_at: '2026-04-05T10:00:00.000Z',
          updated_at: '2026-04-05T10:00:00.000Z',
        },
        {
          id: taskId2,
          queue_id: queueId,
          title: 'Medium Priority',
          impact: 3,
          urgency: 3,
          relevance: 3,
          effort: 3,
          priority: 3.0,
          status: 'Queued',
          created_at: '2026-04-05T10:01:00.000Z',
          updated_at: '2026-04-05T10:01:00.000Z',
        },
        {
          id: taskId3,
          queue_id: queueId,
          title: 'Low Priority',
          impact: 1,
          urgency: 1,
          relevance: 1,
          effort: 5,
          priority: 1.0,
          status: 'Queued',
          created_at: '2026-04-05T10:02:00.000Z',
          updated_at: '2026-04-05T10:02:00.000Z',
        },
      ];

      vi.mocked(taskRepository.findAll).mockResolvedValue(tasks);

      const result = await taskService.getAllTasks(userId, queueId);

      expect(taskRepository.findAll).toHaveBeenCalledWith(queueId);
      expect(result).toEqual(tasks);
      // Verify order (highest priority first)
      expect(result[0].priority).toBeGreaterThanOrEqual(result[1].priority);
      expect(result[1].priority).toBeGreaterThanOrEqual(result[2].priority);
    });

    it('should return empty array when queue has no tasks', async () => {
      vi.mocked(taskRepository.findAll).mockResolvedValue([]);

      const result = await taskService.getAllTasks(userId, queueId);

      expect(result).toEqual([]);
    });
  });

  describe('getTask', () => {
    it('should return a specific task by ID', async () => {
      const task: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Test Task',
        impact: 4,
        urgency: 3,
        relevance: 5,
        effort: 2,
        priority: 4.0,
        status: 'Queued',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      vi.mocked(taskRepository.findById).mockResolvedValue(task);

      const result = await taskService.getTask(userId, taskId1);

      expect(taskRepository.findById).toHaveBeenCalledWith(taskId1);
      expect(result).toEqual(task);
    });

    it('should return null when task does not exist', async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(null);

      const result = await taskService.getTask('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateTask', () => {
    it('should update task fields without changing priority when priority params unchanged', async () => {
      const existingTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Old Title',
        description: 'Old description',
        impact: 4,
        urgency: 3,
        relevance: 5,
        effort: 2,
        priority: 4.0,
        status: 'Queued',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const input: UpdateTaskInput = {
        title: 'New Title',
        description: 'New description',
      };

      const updatedTask: Task = {
        ...existingTask,
        title: input.title,
        description: input.description,
        updated_at: '2026-04-05T11:00:00.000Z',
      };

      vi.mocked(taskRepository.findById).mockResolvedValue(existingTask);
      vi.mocked(taskRepository.update).mockResolvedValue(updatedTask);

      const result = await taskService.updateTask(userId, taskId1, input);

      expect(taskRepository.update).toHaveBeenCalledWith(taskId1, {
        title: 'New Title',
        description: 'New description',
        priority: 4.0, // Priority unchanged
      });
      expect(result).toEqual(updatedTask);
    });

    it('should recalculate priority when impact is updated', async () => {
      const existingTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Test Task',
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 3,
        priority: 3.0,
        status: 'Queued',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const input: UpdateTaskInput = {
        impact: 5, // Update impact
      };

      const updatedTask: Task = {
        ...existingTask,
        impact: 5,
        priority: 3.7, // Recalculated
        updated_at: '2026-04-05T11:00:00.000Z',
      };

      vi.mocked(taskRepository.findById).mockResolvedValue(existingTask);
      vi.mocked(taskRepository.update).mockResolvedValue(updatedTask);

      const result = await taskService.updateTask(userId, taskId1, input);

      expect(taskRepository.update).toHaveBeenCalledWith(taskId1, {
        impact: 5,
        priority: 3.7,
      });
      expect(result?.priority).toBe(3.7);
    });

    it('should recalculate priority when urgency is updated', async () => {
      const existingTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Test Task',
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 3,
        priority: 3.0,
        status: 'Queued',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const input: UpdateTaskInput = {
        urgency: 5, // Update urgency (should trigger urgency boost)
      };

      const updatedTask: Task = {
        ...existingTask,
        urgency: 5,
        priority: 5.35, // Recalculated with urgency boost
        updated_at: '2026-04-05T11:00:00.000Z',
      };

      vi.mocked(taskRepository.findById).mockResolvedValue(existingTask);
      vi.mocked(taskRepository.update).mockResolvedValue(updatedTask);

      const result = await taskService.updateTask(userId, taskId1, input);

      expect(result?.priority).toBe(5.35);
    });

    it('should recalculate priority when relevance is updated', async () => {
      const existingTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Test Task',
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 3,
        priority: 3.0,
        status: 'Queued',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const input: UpdateTaskInput = {
        relevance: 5,
      };

      const updatedTask: Task = {
        ...existingTask,
        relevance: 5,
        priority: 3.5,
        updated_at: '2026-04-05T11:00:00.000Z',
      };

      vi.mocked(taskRepository.findById).mockResolvedValue(existingTask);
      vi.mocked(taskRepository.update).mockResolvedValue(updatedTask);

      const result = await taskService.updateTask(userId, taskId1, input);

      expect(result?.priority).toBe(3.5);
    });

    it('should recalculate priority when effort is updated', async () => {
      const existingTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Test Task',
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 3,
        priority: 3.0,
        status: 'Queued',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const input: UpdateTaskInput = {
        effort: 1, // Lower effort = higher priority
      };

      const updatedTask: Task = {
        ...existingTask,
        effort: 1,
        priority: 3.3,
        updated_at: '2026-04-05T11:00:00.000Z',
      };

      vi.mocked(taskRepository.findById).mockResolvedValue(existingTask);
      vi.mocked(taskRepository.update).mockResolvedValue(updatedTask);

      const result = await taskService.updateTask(userId, taskId1, input);

      expect(result?.priority).toBe(3.3);
    });

    it('should demote Active task when a Queued task has higher priority after update', async () => {
      const activeTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Current Active',
        impact: 5,
        urgency: 5,
        relevance: 5,
        effort: 1,
        priority: 7.0,
        status: 'Active',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const queuedTask: Task = {
        id: taskId2,
        queue_id: queueId,
        title: 'High Priority Queued',
        impact: 5,
        urgency: 5,
        relevance: 5,
        effort: 1,
        priority: 7.5, // Higher than active task after update
        status: 'Queued',
        created_at: '2026-04-05T10:01:00.000Z',
        updated_at: '2026-04-05T10:01:00.000Z',
      };

      const input: UpdateTaskInput = {
        effort: 3, // Increase effort to lower priority
      };

      const updatedActiveTask: Task = {
        ...activeTask,
        effort: 3,
        priority: 5.75, // Now lower than queued task
        status: 'Active',
        updated_at: '2026-04-05T11:00:00.000Z',
      };

      const demotedTask: Task = {
        ...updatedActiveTask,
        status: 'Queued',
      };

      const promotedQueuedTask: Task = {
        ...queuedTask,
        status: 'Active',
      };

      vi.mocked(taskRepository.findById)
        .mockResolvedValueOnce(activeTask) // Initial findById
        .mockResolvedValueOnce(demotedTask); // Final findById after demotion

      vi.mocked(taskRepository.update)
        .mockResolvedValueOnce(updatedActiveTask) // First update with new values
        .mockResolvedValueOnce(demotedTask) // Demote active task
        .mockResolvedValueOnce(promotedQueuedTask); // Promote queued task

      vi.mocked(taskRepository.findTopQueued).mockResolvedValue(queuedTask);

      const result = await taskService.updateTask(userId, taskId1, input);

      // Should find top queued task
      expect(taskRepository.findTopQueued).toHaveBeenCalledWith(queueId);

      // Should demote current active task
      expect(taskRepository.update).toHaveBeenCalledWith(taskId1, { status: 'Queued' });

      // Should promote queued task
      expect(taskRepository.update).toHaveBeenCalledWith(taskId2, { status: 'Active' });

      // Result should be the demoted task
      expect(result?.status).toBe('Queued');
    });

    it('should NOT demote Active task when no Queued task has higher priority', async () => {
      const activeTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Current Active',
        impact: 5,
        urgency: 5,
        relevance: 5,
        effort: 1,
        priority: 7.0,
        status: 'Active',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const queuedTask: Task = {
        id: taskId2,
        queue_id: queueId,
        title: 'Lower Priority Queued',
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 3,
        priority: 3.0,
        status: 'Queued',
        created_at: '2026-04-05T10:01:00.000Z',
        updated_at: '2026-04-05T10:01:00.000Z',
      };

      const input: UpdateTaskInput = {
        effort: 2, // Minor change
      };

      const updatedActiveTask: Task = {
        ...activeTask,
        effort: 2,
        priority: 6.85,
        updated_at: '2026-04-05T11:00:00.000Z',
      };

      vi.mocked(taskRepository.findById).mockResolvedValue(activeTask);
      vi.mocked(taskRepository.update).mockResolvedValue(updatedActiveTask);
      vi.mocked(taskRepository.findTopQueued).mockResolvedValue(queuedTask);

      const result = await taskService.updateTask(userId, taskId1, input);

      // Should check for top queued
      expect(taskRepository.findTopQueued).toHaveBeenCalledWith(queueId);

      // Should NOT demote or promote any tasks (only 1 update call - the initial one)
      expect(taskRepository.update).toHaveBeenCalledTimes(1);

      // Result should still be Active
      expect(result?.status).toBe('Active');
    });

    it('should NOT trigger demotion logic for non-Active tasks', async () => {
      const queuedTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Queued Task',
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 3,
        priority: 3.0,
        status: 'Queued',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const input: UpdateTaskInput = {
        impact: 5,
      };

      const updatedTask: Task = {
        ...queuedTask,
        impact: 5,
        priority: 3.7,
        updated_at: '2026-04-05T11:00:00.000Z',
      };

      vi.mocked(taskRepository.findById).mockResolvedValue(queuedTask);
      vi.mocked(taskRepository.update).mockResolvedValue(updatedTask);

      await taskService.updateTask(userId, taskId1, input);

      // Should NOT check for top queued task since this is not Active
      expect(taskRepository.findTopQueued).not.toHaveBeenCalled();

      // Only the initial update should be called
      expect(taskRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should return null when task does not exist', async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(null);

      const result = await taskService.updateTask('non-existent-id', {
        title: 'New Title',
      });

      expect(result).toBeNull();
      expect(taskRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('updateTaskStatus', () => {
    it('should update status from Active to Done', async () => {
      const activeTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Active Task',
        impact: 5,
        urgency: 5,
        relevance: 5,
        effort: 1,
        priority: 7.0,
        status: 'Active',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const queuedTask: Task = {
        id: taskId2,
        queue_id: queueId,
        title: 'Next Task',
        impact: 4,
        urgency: 4,
        relevance: 4,
        effort: 2,
        priority: 4.75,
        status: 'Queued',
        created_at: '2026-04-05T10:01:00.000Z',
        updated_at: '2026-04-05T10:01:00.000Z',
      };

      const doneTask: Task = {
        ...activeTask,
        status: 'Done',
        updated_at: '2026-04-05T11:00:00.000Z',
      };

      const promotedTask: Task = {
        ...queuedTask,
        status: 'Active',
      };

      const input: UpdateStatusInput = { status: 'Done' };

      vi.mocked(taskRepository.findById)
        .mockResolvedValueOnce(activeTask) // Initial check in updateTaskStatus
        .mockResolvedValueOnce(promotedTask) // Called in promoteNextTask
        .mockResolvedValueOnce(doneTask); // Final return in updateTaskStatus

      vi.mocked(taskRepository.update)
        .mockResolvedValueOnce(doneTask) // Set to Done
        .mockResolvedValueOnce(promotedTask); // Promote next task

      vi.mocked(taskRepository.findTopQueued).mockResolvedValue(queuedTask);

      const result = await taskService.updateTaskStatus(userId, taskId1, input);

      // Should update status to Done
      expect(taskRepository.update).toHaveBeenCalledWith(taskId1, { status: 'Done' });

      // Should promote next task
      expect(taskRepository.findTopQueued).toHaveBeenCalledWith(queueId);
      expect(taskRepository.update).toHaveBeenCalledWith(taskId2, { status: 'Active' });

      expect(result?.status).toBe('Done');
    });

    it('should update status from Active to Blocked and promote next task', async () => {
      const activeTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Active Task',
        impact: 5,
        urgency: 5,
        relevance: 5,
        effort: 1,
        priority: 7.0,
        status: 'Active',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const queuedTask: Task = {
        id: taskId2,
        queue_id: queueId,
        title: 'Next Task',
        impact: 4,
        urgency: 4,
        relevance: 4,
        effort: 2,
        priority: 4.75,
        status: 'Queued',
        created_at: '2026-04-05T10:01:00.000Z',
        updated_at: '2026-04-05T10:01:00.000Z',
      };

      const blockedTask: Task = {
        ...activeTask,
        status: 'Blocked',
        updated_at: '2026-04-05T11:00:00.000Z',
      };

      const promotedTask: Task = {
        ...queuedTask,
        status: 'Active',
      };

      const input: UpdateStatusInput = { status: 'Blocked' };

      vi.mocked(taskRepository.findById)
        .mockResolvedValueOnce(activeTask) // Initial check in updateTaskStatus
        .mockResolvedValueOnce(promotedTask) // Called in promoteNextTask
        .mockResolvedValueOnce(blockedTask); // Final return in updateTaskStatus

      vi.mocked(taskRepository.update)
        .mockResolvedValueOnce(blockedTask)
        .mockResolvedValueOnce(promotedTask);

      vi.mocked(taskRepository.findTopQueued).mockResolvedValue(queuedTask);

      const result = await taskService.updateTaskStatus(userId, taskId1, input);

      expect(result?.status).toBe('Blocked');
      expect(taskRepository.update).toHaveBeenCalledWith(taskId2, { status: 'Active' });
    });

    it('should update status from Active to Removed and promote next task', async () => {
      const activeTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Active Task',
        impact: 5,
        urgency: 5,
        relevance: 5,
        effort: 1,
        priority: 7.0,
        status: 'Active',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const queuedTask: Task = {
        id: taskId2,
        queue_id: queueId,
        title: 'Next Task',
        impact: 4,
        urgency: 4,
        relevance: 4,
        effort: 2,
        priority: 4.75,
        status: 'Queued',
        created_at: '2026-04-05T10:01:00.000Z',
        updated_at: '2026-04-05T10:01:00.000Z',
      };

      const removedTask: Task = {
        ...activeTask,
        status: 'Removed',
        updated_at: '2026-04-05T11:00:00.000Z',
      };

      const promotedTask: Task = {
        ...queuedTask,
        status: 'Active',
      };

      const input: UpdateStatusInput = { status: 'Removed' };

      vi.mocked(taskRepository.findById)
        .mockResolvedValueOnce(activeTask) // Initial check in updateTaskStatus
        .mockResolvedValueOnce(promotedTask) // Called in promoteNextTask
        .mockResolvedValueOnce(removedTask); // Final return in updateTaskStatus

      vi.mocked(taskRepository.update)
        .mockResolvedValueOnce(removedTask)
        .mockResolvedValueOnce(promotedTask);

      vi.mocked(taskRepository.findTopQueued).mockResolvedValue(queuedTask);

      const result = await taskService.updateTaskStatus(userId, taskId1, input);

      expect(result?.status).toBe('Removed');
      expect(taskRepository.update).toHaveBeenCalledWith(taskId2, { status: 'Active' });
    });

    it('should update status from Queued to Done without triggering promotion', async () => {
      const queuedTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Queued Task',
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 3,
        priority: 3.0,
        status: 'Queued',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const doneTask: Task = {
        ...queuedTask,
        status: 'Done',
        updated_at: '2026-04-05T11:00:00.000Z',
      };

      const input: UpdateStatusInput = { status: 'Done' };

      vi.mocked(taskRepository.findById)
        .mockResolvedValueOnce(queuedTask)
        .mockResolvedValueOnce(doneTask);

      vi.mocked(taskRepository.update).mockResolvedValue(doneTask);

      const result = await taskService.updateTaskStatus(userId, taskId1, input);

      // Should NOT trigger promotion logic
      expect(taskRepository.findTopQueued).not.toHaveBeenCalled();

      // Only one update call (the status change)
      expect(taskRepository.update).toHaveBeenCalledTimes(1);
      expect(result?.status).toBe('Done');
    });

    it('should throw error when trying to change status from Done', async () => {
      const doneTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Done Task',
        impact: 5,
        urgency: 5,
        relevance: 5,
        effort: 1,
        priority: 7.0,
        status: 'Done',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const input: UpdateStatusInput = { status: 'Removed' };

      vi.mocked(taskRepository.findById).mockResolvedValue(doneTask);

      await expect(
        taskService.updateTaskStatus(taskId1, input)
      ).rejects.toThrow('Cannot change status of a task that is already Done, Blocked, or Removed');

      expect(taskRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when trying to change status from Blocked', async () => {
      const blockedTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Blocked Task',
        impact: 5,
        urgency: 5,
        relevance: 5,
        effort: 1,
        priority: 7.0,
        status: 'Blocked',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const input: UpdateStatusInput = { status: 'Done' };

      vi.mocked(taskRepository.findById).mockResolvedValue(blockedTask);

      await expect(
        taskService.updateTaskStatus(taskId1, input)
      ).rejects.toThrow('Cannot change status of a task that is already Done, Blocked, or Removed');
    });

    it('should throw error when trying to change status from Removed', async () => {
      const removedTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Removed Task',
        impact: 5,
        urgency: 5,
        relevance: 5,
        effort: 1,
        priority: 7.0,
        status: 'Removed',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const input: UpdateStatusInput = { status: 'Done' };

      vi.mocked(taskRepository.findById).mockResolvedValue(removedTask);

      await expect(
        taskService.updateTaskStatus(taskId1, input)
      ).rejects.toThrow('Cannot change status of a task that is already Done, Blocked, or Removed');
    });

    it('should return null when task does not exist', async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(null);

      const result = await taskService.updateTaskStatus('non-existent-id', {
        status: 'Done',
      });

      expect(result).toBeNull();
      expect(taskRepository.update).not.toHaveBeenCalled();
    });

    it('should handle case when no tasks available to promote', async () => {
      const activeTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Last Active Task',
        impact: 5,
        urgency: 5,
        relevance: 5,
        effort: 1,
        priority: 7.0,
        status: 'Active',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const doneTask: Task = {
        ...activeTask,
        status: 'Done',
        updated_at: '2026-04-05T11:00:00.000Z',
      };

      const input: UpdateStatusInput = { status: 'Done' };

      vi.mocked(taskRepository.findById)
        .mockResolvedValueOnce(activeTask)
        .mockResolvedValueOnce(doneTask);

      vi.mocked(taskRepository.update).mockResolvedValue(doneTask);
      vi.mocked(taskRepository.findTopQueued).mockResolvedValue(null); // No queued tasks

      // Should succeed - empty queue is a valid state
      const result = await taskService.updateTaskStatus(userId, taskId1, input);

      expect(result).toMatchObject({
        id: taskId1,
        status: 'Done',
      });
      expect(vi.mocked(taskRepository.update)).toHaveBeenCalledWith(taskId1, { status: 'Done' });
    });
  });

  describe('Edge Cases and Queue Isolation', () => {
    it('should handle multiple queues independently', async () => {
      const queueId1 = '550e8400-e29b-41d4-a716-446655440001';
      const queueId2 = '550e8400-e29b-41d4-a716-446655440002';

      const activeInQueue1: Task = {
        id: taskId1,
        queue_id: queueId1,
        title: 'Active in Queue 1',
        impact: 5,
        urgency: 5,
        relevance: 5,
        effort: 1,
        priority: 7.0,
        status: 'Active',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const activeInQueue2: Task = {
        id: taskId2,
        queue_id: queueId2,
        title: 'Active in Queue 2',
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 3,
        priority: 3.0,
        status: 'Active',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      vi.mocked(taskRepository.findActive)
        .mockImplementation(async (qId) => {
          if (qId === queueId1) return activeInQueue1;
          if (qId === queueId2) return activeInQueue2;
          return null;
        });

      const result1 = await taskService.getNextTask(userId, queueId1);
      const result2 = await taskService.getNextTask(userId, queueId2);

      expect(result1?.id).toBe(taskId1);
      expect(result2?.id).toBe(taskId2);
      expect(result1?.queue_id).toBe(queueId1);
      expect(result2?.queue_id).toBe(queueId2);
    });

    it('should handle priority ties correctly (implementation-specific behavior)', async () => {
      // When two tasks have the same priority, the repository's findTopQueued
      // will return the first one in the sorted array
      const queuedTask1: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'First Task',
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 3,
        priority: 3.0,
        status: 'Queued',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const queuedTask2: Task = {
        id: taskId2,
        queue_id: queueId,
        title: 'Second Task',
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 3,
        priority: 3.0, // Same priority
        status: 'Queued',
        created_at: '2026-04-05T10:01:00.000Z',
        updated_at: '2026-04-05T10:01:00.000Z',
      };

      // Repository will return the first task
      vi.mocked(taskRepository.findTopQueued).mockResolvedValue(queuedTask1);

      const promotedTask: Task = { ...queuedTask1, status: 'Active' };

      vi.mocked(taskRepository.update).mockResolvedValue(promotedTask);
      vi.mocked(taskRepository.findById).mockResolvedValue(promotedTask);

      // This would be called by promoteNextTask internally
      vi.mocked(taskRepository.findActive).mockResolvedValue(null);

      const input: CreateTaskInput = {
        title: 'New Task',
        impact: 2,
        urgency: 2,
        relevance: 2,
        effort: 2,
      };

      const newTask: Task = {
        id: taskId3,
        queue_id: queueId,
        title: input.title,
        impact: input.impact,
        urgency: input.urgency,
        relevance: input.relevance,
        effort: input.effort,
        priority: 2.9,
        status: 'Queued',
        created_at: '2026-04-05T10:02:00.000Z',
        updated_at: '2026-04-05T10:02:00.000Z',
      };

      vi.mocked(taskRepository.save).mockResolvedValue(newTask);

      await taskService.createTask(userId, queueId, input);

      // First task should be promoted (not second)
      expect(taskRepository.findTopQueued).toHaveBeenCalledWith(queueId);
      expect(taskRepository.update).toHaveBeenCalledWith(taskId1, { status: 'Active' });
    });
  });

  describe('Deadline Handling', () => {
    it('should auto-calculate deadline from urgency when not provided', async () => {
      const input: CreateTaskInput = {
        title: 'Test Task',
        impact: 3,
        urgency: 1, // Someday - should get 60 days
        relevance: 3,
        effort: 2,
      };

      const savedTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: input.title,
        impact: input.impact,
        urgency: input.urgency,
        relevance: input.relevance,
        effort: input.effort,
        deadline: '', // Will be set by the service
        priority: 2.0,
        status: 'Queued',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      vi.mocked(taskRepository.save).mockImplementation(async (task) => {
        // Verify deadline was calculated
        expect(task.deadline).toBeDefined();
        const deadline = new Date(task.deadline);
        const today = new Date();
        const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000);
        expect(diffDays).toBeGreaterThanOrEqual(59);
        expect(diffDays).toBeLessThanOrEqual(61); // ~60 days for urgency 1
        return { ...task, id: taskId1 };
      });

      vi.mocked(taskRepository.findActive).mockResolvedValue(null);
      vi.mocked(taskRepository.findTopQueued).mockResolvedValue({ ...savedTask, status: 'Queued' });
      vi.mocked(taskRepository.update).mockImplementation(async (id, update) => ({
        ...savedTask,
        ...update,
      }));
      vi.mocked(taskRepository.findById).mockResolvedValue({ ...savedTask, status: 'Active' });

      await taskService.createTask(userId, queueId, input);

      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should use provided deadline when specified', async () => {
      const customDeadline = new Date();
      customDeadline.setDate(customDeadline.getDate() + 14);

      const input: CreateTaskInput = {
        title: 'Test Task',
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 2,
        deadline: customDeadline.toISOString(),
      };

      vi.mocked(taskRepository.save).mockImplementation(async (task) => {
        // Verify custom deadline was used
        expect(new Date(task.deadline).toDateString()).toBe(customDeadline.toDateString());
        return { ...task, id: taskId1 };
      });

      vi.mocked(taskRepository.findActive).mockResolvedValue(null);
      vi.mocked(taskRepository.findTopQueued).mockResolvedValue(null);

      await taskService.createTask(userId, queueId, input);

      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should recalculate deadline when urgency changes without custom deadline', async () => {
      const existingTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Test Task',
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 3,
        deadline: new Date(Date.now() + 21 * 86_400_000).toISOString(), // 21 days for urgency 3
        priority: 3.0,
        status: 'Queued',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const input: UpdateTaskInput = {
        urgency: 5, // Change to urgent - should get 3 days
      };

      vi.mocked(taskRepository.findById).mockResolvedValue(existingTask);
      vi.mocked(taskRepository.update).mockImplementation(async (id, update) => {
        // Verify new deadline was calculated for urgency 5
        if (update.deadline) {
          const deadline = new Date(update.deadline);
          const today = new Date();
          const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000);
          expect(diffDays).toBeGreaterThanOrEqual(2);
          expect(diffDays).toBeLessThanOrEqual(4); // ~3 days for urgency 5
        }
        return { ...existingTask, ...update };
      });

      await taskService.updateTask(userId, taskId1, input);

      expect(taskRepository.update).toHaveBeenCalled();
    });

    it('should use custom deadline when both urgency and deadline are updated', async () => {
      const existingTask: Task = {
        id: taskId1,
        queue_id: queueId,
        title: 'Test Task',
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 3,
        deadline: new Date(Date.now() + 21 * 86_400_000).toISOString(),
        priority: 3.0,
        status: 'Queued',
        created_at: '2026-04-05T10:00:00.000Z',
        updated_at: '2026-04-05T10:00:00.000Z',
      };

      const customDeadline = new Date();
      customDeadline.setDate(customDeadline.getDate() + 10);

      const input: UpdateTaskInput = {
        urgency: 5,
        deadline: customDeadline.toISOString(),
      };

      vi.mocked(taskRepository.findById).mockResolvedValue(existingTask);
      vi.mocked(taskRepository.update).mockImplementation(async (id, update) => {
        // Verify custom deadline was used, not auto-calculated
        if (update.deadline) {
          expect(new Date(update.deadline).toDateString()).toBe(customDeadline.toDateString());
        }
        return { ...existingTask, ...update };
      });

      await taskService.updateTask(userId, taskId1, input);

      expect(taskRepository.update).toHaveBeenCalled();
    });
  });
});
