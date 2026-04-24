import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpContext } from '@angular/common/http';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TaskService } from './task.service';
import { Task, CreateTaskRequest, UpdateTaskRequest, UpdateTaskStatusRequest } from '../models/task.model';
import { SKIP_ERROR_TOAST } from '../../../core/interceptors/error.interceptor';

describe('TaskService', () => {
  let service: TaskService;
  let httpClient: any;

  const mockTask: Task = {
    id: 't1',
    queue_id: 'q1',
    title: 'Test Task',
    description: 'Test Description',
    impact: 4,
    urgency: 3,
    relevance: 5,
    effort: 2,
    priority: 4.0,
    status: 'Queued',
    created_at: '2026-04-10',
    updated_at: '2026-04-10'
  };

  const mockTasks: Task[] = [
    mockTask,
    { ...mockTask, id: 't2', title: 'Task 2', status: 'Active' }
  ];

  beforeEach(() => {
    httpClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        { provide: HttpClient, useValue: httpClient }
      ]
    });

    service = TestBed.inject(TaskService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getActiveTask', () => {
    it('should get active task for a queue', () => {
      const activeTask = { ...mockTask, status: 'Active' as const };
      httpClient.get.mockReturnValue(of(activeTask));

      service.getActiveTask('q1').subscribe(task => {
        expect(task).toEqual(activeTask);
        expect(httpClient.get).toHaveBeenCalledWith(
          '/api/queues/q1/tasks/next',
          expect.objectContaining({
            context: expect.any(HttpContext)
          })
        );
      });
    });

    it('should handle null response (no active task)', () => {
      httpClient.get.mockReturnValue(of(null));

      service.getActiveTask('q1').subscribe(task => {
        expect(task).toBeNull();
      });
    });

    it('should use SKIP_ERROR_TOAST context', () => {
      httpClient.get.mockReturnValue(of(null));

      service.getActiveTask('q1').subscribe(() => {
        const callArgs = httpClient.get.mock.calls[0];
        expect(callArgs[1].context).toBeInstanceOf(HttpContext);
        expect(callArgs[1].context.get(SKIP_ERROR_TOAST)).toBe(true);
      });
    });
  });

  describe('getTasks', () => {
    it('should get all tasks for a queue', () => {
      httpClient.get.mockReturnValue(of(mockTasks));

      service.getTasks('q1').subscribe(tasks => {
        expect(tasks).toEqual(mockTasks);
        expect(httpClient.get).toHaveBeenCalledWith('/api/queues/q1/tasks');
      });
    });

    it('should return empty array when no tasks exist', () => {
      httpClient.get.mockReturnValue(of([]));

      service.getTasks('q1').subscribe(tasks => {
        expect(tasks).toEqual([]);
      });
    });
  });

  describe('getTask', () => {
    it('should get a specific task by ID', () => {
      httpClient.get.mockReturnValue(of(mockTask));

      service.getTask('q1', 't1').subscribe(task => {
        expect(task).toEqual(mockTask);
        expect(httpClient.get).toHaveBeenCalledWith('/api/queues/q1/tasks/t1');
      });
    });
  });

  describe('createTask', () => {
    it('should create a new task', () => {
      const request: CreateTaskRequest = {
        title: 'New Task',
        description: 'New Description',
        impact: 5,
        urgency: 4,
        relevance: 3,
        effort: 2
      };
      const response: Task = { ...mockTask, ...request };
      httpClient.post.mockReturnValue(of(response));

      service.createTask('q1', request).subscribe(task => {
        expect(task).toEqual(response);
        expect(httpClient.post).toHaveBeenCalledWith('/api/queues/q1/tasks', request);
      });
    });

    it('should create task without optional description', () => {
      const request: CreateTaskRequest = {
        title: 'New Task',
        impact: 5,
        urgency: 4,
        relevance: 3,
        effort: 2
      };
      const response: Task = { ...mockTask, ...request, description: undefined };
      httpClient.post.mockReturnValue(of(response));

      service.createTask('q1', request).subscribe(task => {
        expect(task.description).toBeUndefined();
      });
    });
  });

  describe('updateTask', () => {
    it('should update an existing task', () => {
      const request: UpdateTaskRequest = {
        title: 'Updated Task',
        impact: 5
      };
      const response: Task = { ...mockTask, ...request };
      httpClient.patch.mockReturnValue(of(response));

      service.updateTask('q1', 't1', request).subscribe(task => {
        expect(task).toEqual(response);
        expect(httpClient.patch).toHaveBeenCalledWith('/api/queues/q1/tasks/t1', request);
      });
    });

    it('should update task with partial data', () => {
      const request: UpdateTaskRequest = {
        urgency: 5
      };
      const response: Task = { ...mockTask, urgency: 5, priority: 5.35 };
      httpClient.patch.mockReturnValue(of(response));

      service.updateTask('q1', 't1', request).subscribe(task => {
        expect(task.urgency).toBe(5);
        expect(task.priority).toBe(5.35);
      });
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status to Done', () => {
      const request: UpdateTaskStatusRequest = { status: 'Done' };
      const response: Task = { ...mockTask, status: 'Done' };
      httpClient.patch.mockReturnValue(of(response));

      service.updateTaskStatus('q1', 't1', request).subscribe(task => {
        expect(task.status).toBe('Done');
        expect(httpClient.patch).toHaveBeenCalledWith('/api/queues/q1/tasks/t1/status', request);
      });
    });

    it('should update task status to Blocked', () => {
      const request: UpdateTaskStatusRequest = { status: 'Blocked' };
      const response: Task = { ...mockTask, status: 'Blocked' };
      httpClient.patch.mockReturnValue(of(response));

      service.updateTaskStatus('q1', 't1', request).subscribe(task => {
        expect(task.status).toBe('Blocked');
      });
    });

    it('should update task status to Removed', () => {
      const request: UpdateTaskStatusRequest = { status: 'Removed' };
      const response: Task = { ...mockTask, status: 'Removed' };
      httpClient.patch.mockReturnValue(of(response));

      service.updateTaskStatus('q1', 't1', request).subscribe(task => {
        expect(task.status).toBe('Removed');
      });
    });

    it('should use correct status endpoint', () => {
      const request: UpdateTaskStatusRequest = { status: 'Done' };
      const response: Task = { ...mockTask, status: 'Done' };
      httpClient.patch.mockReturnValue(of(response));

      service.updateTaskStatus('q1', 't1', request).subscribe(() => {
        expect(httpClient.patch).toHaveBeenCalledWith('/api/queues/q1/tasks/t1/status', request);
      });
    });
  });
});
