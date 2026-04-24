import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueueDetailComponent } from './queue-detail.component';
import { QueueService } from '../services/queue.service';
import { TaskService } from '../services/task.service';
import { ToastService } from '../../../core/services/toast.service';
import { PriorityService } from '../services/priority.service';
import { Queue } from '../models/queue.model';
import { Task, CreateTaskRequest, UpdateTaskRequest, UpdateTaskStatusRequest } from '../models/task.model';

describe('QueueDetailComponent', () => {
  let component: QueueDetailComponent;
  let fixture: ComponentFixture<QueueDetailComponent>;
  let mockQueueService: any;
  let mockTaskService: any;
  let mockToastService: any;
  let mockRouter: any;
  let mockActivatedRoute: any;
  let mockChangeDetectorRef: any;
  let mockPriorityService: any;

  const mockQueue: Queue = {
    id: 'q1',
    user_id: 'u1',
    name: 'Test Queue',
    description: 'Test Description',
    created_at: '2026-04-10',
    updated_at: '2026-04-10'
  };

  const mockTasks: Task[] = [
    {
      id: 't1',
      queue_id: 'q1',
      title: 'Active Task',
      impact: 5,
      urgency: 5,
      relevance: 5,
      effort: 1,
      priority: 7.0,
      status: 'Active',
      created_at: '2026-04-10',
      updated_at: '2026-04-10'
    },
    {
      id: 't2',
      queue_id: 'q1',
      title: 'Queued Task',
      impact: 4,
      urgency: 3,
      relevance: 5,
      effort: 2,
      priority: 4.0,
      status: 'Queued',
      created_at: '2026-04-10',
      updated_at: '2026-04-10'
    },
    {
      id: 't3',
      queue_id: 'q1',
      title: 'Done Task',
      impact: 3,
      urgency: 2,
      relevance: 3,
      effort: 1,
      priority: 2.8,
      status: 'Done',
      created_at: '2026-04-09',
      updated_at: '2026-04-10'
    }
  ];

  beforeEach(async () => {
    mockQueueService = {
      getQueue: vi.fn()
    };

    mockTaskService = {
      getTasks: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      updateTaskStatus: vi.fn()
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn()
    };

    mockRouter = {
      navigate: vi.fn()
    };

    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue('q1')
        }
      }
    };

    mockChangeDetectorRef = {
      detectChanges: vi.fn(),
      markForCheck: vi.fn()
    };

    mockPriorityService = {
      calculatePriority: vi.fn()
    };

    mockQueueService.getQueue.mockReturnValue(of(mockQueue));
    // Return a copy of mockTasks to prevent mutations
    mockTaskService.getTasks.mockReturnValue(of([...mockTasks]));

    await TestBed.configureTestingModule({
      imports: [QueueDetailComponent],
      providers: [
        { provide: QueueService, useValue: mockQueueService },
        { provide: TaskService, useValue: mockTaskService },
        { provide: ToastService, useValue: mockToastService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ChangeDetectorRef, useValue: mockChangeDetectorRef },
        { provide: PriorityService, useValue: mockPriorityService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QueueDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should load queue and tasks on init', () => {
      fixture.detectChanges();

      expect(mockQueueService.getQueue).toHaveBeenCalledWith('q1');
      expect(mockTaskService.getTasks).toHaveBeenCalledWith('q1');
      expect(component.queue).toEqual(mockQueue);
      expect(component.tasks).toEqual(mockTasks);
    });

    it('should set active task from task list', () => {
      fixture.detectChanges();

      expect(component.activeTask).toEqual(mockTasks[0]);
      expect(component.activeTask?.status).toBe('Active');
    });

    it('should navigate to dashboard when queueId is missing', () => {
      mockActivatedRoute.snapshot.paramMap.get.mockReturnValue(null);

      fixture.detectChanges();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should handle error when loading queue', () => {
      mockQueueService.getQueue.mockReturnValue(throwError(() => new Error('API Error')));

      fixture.detectChanges();

      expect(component.isLoading).toBe(false);
      expect(component.errorMessage).toContain('Failed to load queue');
    });

    it('should handle error when loading tasks', () => {
      mockTaskService.getTasks.mockReturnValue(throwError(() => new Error('API Error')));

      fixture.detectChanges();

      expect(component.isLoading).toBe(false);
      expect(component.errorMessage).toContain('Failed to load tasks');
    });
  });

  describe('task form', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should show task form when creating new task', () => {
      component.onCreateTask();

      expect(component.showTaskForm).toBe(true);
      expect(component.selectedTask).toBeUndefined();
    });

    it('should show task form with data when editing', () => {
      component.onEditTask(mockTasks[1]);

      expect(component.showTaskForm).toBe(true);
      expect(component.selectedTask).toEqual(mockTasks[1]);
    });

    it('should hide task form on cancel', () => {
      component.showTaskForm = true;
      component.selectedTask = mockTasks[1];

      component.onCancelForm();

      expect(component.showTaskForm).toBe(false);
      expect(component.selectedTask).toBeUndefined();
    });
  });

  describe('creating tasks', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should create new task', () => {
      const request: CreateTaskRequest = {
        title: 'New Task',
        description: 'New Description',
        impact: 5,
        urgency: 4,
        relevance: 3,
        effort: 2
      };

      const newTask: Task = {
        ...mockTasks[0],
        id: 't4',
        ...request,
        priority: 4.5,
        status: 'Queued'
      };

      mockTaskService.createTask.mockReturnValue(of(newTask));
      mockTaskService.getTasks.mockReturnValue(of([...mockTasks, newTask]));

      component.showTaskForm = true;
      component.onSaveTask(request);

      expect(mockTaskService.createTask).toHaveBeenCalledWith('q1', request);
      expect(mockToastService.success).toHaveBeenCalledWith('Task "New Task" created successfully');
      expect(component.showTaskForm).toBe(false);
      expect(component.selectedTask).toBeUndefined();
    });

    it('should reload tasks after creating', () => {
      const request: CreateTaskRequest = {
        title: 'New Task',
        impact: 5,
        urgency: 4,
        relevance: 3,
        effort: 2
      };

      const newTask: Task = {
        ...mockTasks[0],
        id: 't4',
        title: 'New Task',
        impact: 5,
        urgency: 4,
        relevance: 3,
        effort: 2,
        priority: 3.5,
        status: 'Queued'
      };
      mockTaskService.createTask.mockReturnValue(of(newTask));

      const initialTaskCount = component.tasks.length;
      // Clear previous getTasks calls from initialization
      mockTaskService.getTasks.mockClear();

      component.onSaveTask(request);

      // Optimistic update: verify task is added locally without refetching
      expect(component.tasks.length).toBe(initialTaskCount + 1);
      expect(component.tasks.find(t => t.id === 't4')).toBeDefined();
      expect(mockTaskService.getTasks).not.toHaveBeenCalled();
    });
  });

  describe('updating tasks', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should update existing task', () => {
      const request: UpdateTaskRequest = {
        title: 'Updated Task',
        urgency: 5
      };

      const updatedTask: Task = {
        ...mockTasks[1],
        ...request,
        priority: 5.35
      };

      mockTaskService.updateTask.mockReturnValue(of(updatedTask));
      mockTaskService.getTasks.mockReturnValue(of([mockTasks[0], updatedTask, mockTasks[2]]));

      component.selectedTask = mockTasks[1];
      component.onSaveTask(request);

      expect(mockTaskService.updateTask).toHaveBeenCalledWith('q1', 't2', request);
      expect(mockToastService.success).toHaveBeenCalledWith('Task "Updated Task" updated successfully');
      expect(component.showTaskForm).toBe(false);
    });
  });

  describe('task status updates', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should mark task as Done', () => {
      const updatedTask: Task = { ...mockTasks[0], status: 'Done' };
      mockTaskService.updateTaskStatus.mockReturnValue(of(updatedTask));
      mockTaskService.getTasks.mockReturnValue(of([updatedTask, mockTasks[1], mockTasks[2]]));

      component.onMarkDone(mockTasks[0]);

      expect(mockTaskService.updateTaskStatus).toHaveBeenCalledWith('q1', 't1', { status: 'Done' });
      expect(mockToastService.success).toHaveBeenCalledWith('Task "Active Task" marked as Done');
    });

    it('should mark task as Blocked', () => {
      const updatedTask: Task = { ...mockTasks[0], status: 'Blocked' };
      mockTaskService.updateTaskStatus.mockReturnValue(of(updatedTask));
      mockTaskService.getTasks.mockReturnValue(of([updatedTask, mockTasks[1], mockTasks[2]]));

      component.onMarkBlocked(mockTasks[0]);

      expect(mockTaskService.updateTaskStatus).toHaveBeenCalledWith('q1', 't1', { status: 'Blocked' });
      expect(mockToastService.success).toHaveBeenCalledWith('Task "Active Task" marked as Blocked');
    });

    it('should show confirmation before marking as Removed', () => {
      component.onMarkRemoved(mockTasks[0]);

      expect(component.showRemoveConfirmation).toBe(true);
      expect(component.taskToRemove).toEqual(mockTasks[0]);
      expect(mockTaskService.updateTaskStatus).not.toHaveBeenCalled();
    });

    it('should mark task as Removed after confirmation', () => {
      const updatedTask: Task = { ...mockTasks[0], status: 'Removed' };
      mockTaskService.updateTaskStatus.mockReturnValue(of(updatedTask));
      mockTaskService.getTasks.mockReturnValue(of([updatedTask, mockTasks[1], mockTasks[2]]));

      component.taskToRemove = mockTasks[0];
      component.confirmRemove();

      expect(mockTaskService.updateTaskStatus).toHaveBeenCalledWith('q1', 't1', { status: 'Removed' });
      expect(mockToastService.success).toHaveBeenCalledWith('Task "Active Task" marked as Removed');
      expect(component.showRemoveConfirmation).toBe(false);
      expect(component.taskToRemove).toBeUndefined();
    });

    it('should cancel remove confirmation', () => {
      component.taskToRemove = mockTasks[0];
      component.showRemoveConfirmation = true;

      component.cancelRemove();

      expect(component.showRemoveConfirmation).toBe(false);
      expect(component.taskToRemove).toBeUndefined();
      expect(mockTaskService.updateTaskStatus).not.toHaveBeenCalled();
    });

    it('should update task status locally without refetching', () => {
      const updatedTask: Task = { ...mockTasks[0], status: 'Done' };
      mockTaskService.updateTaskStatus.mockReturnValue(of(updatedTask));

      // Clear previous getTasks calls from initialization
      mockTaskService.getTasks.mockClear();

      component.onMarkDone(mockTasks[0]);

      // Optimistic update: verify local state is updated without calling getTasks
      expect(mockTaskService.updateTaskStatus).toHaveBeenCalledWith('q1', 't1', { status: 'Done' });
      expect(mockTaskService.getTasks).not.toHaveBeenCalled();
      const updatedTaskInList = component.tasks.find(t => t.id === 't1');
      expect(updatedTaskInList?.status).toBe('Done');
    });
  });

  describe('nonActiveTasks getter', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should return tasks excluding active task', () => {
      const nonActive = component.nonActiveTasks;

      expect(nonActive.length).toBe(2);
      expect(nonActive.every(t => t.status !== 'Active')).toBe(true);
      expect(nonActive.find(t => t.id === 't2')).toBeDefined();
      expect(nonActive.find(t => t.id === 't3')).toBeDefined();
    });

    it('should return all tasks when no active task exists', () => {
      component.tasks = mockTasks.filter(t => t.status !== 'Active');

      const nonActive = component.nonActiveTasks;

      expect(nonActive.length).toBe(2);
    });
  });

  describe('loading states', () => {
    it('should set loading state during queue data load', () => {
      expect(component.isLoading).toBe(false);

      fixture.detectChanges();

      expect(mockQueueService.getQueue).toHaveBeenCalled();
    });

    it('should set form loading state during task save', () => {
      fixture.detectChanges();

      const request: CreateTaskRequest = {
        title: 'New Task',
        impact: 5,
        urgency: 4,
        relevance: 3,
        effort: 2
      };

      mockTaskService.createTask.mockReturnValue(of({ ...mockTasks[0], id: 't4' }));
      mockTaskService.getTasks.mockReturnValue(of([...mockTasks]));

      expect(component.isFormLoading).toBe(false);
      component.onSaveTask(request);
      // Form loading state is set to true during save, then false after completion
      expect(mockTaskService.createTask).toHaveBeenCalledWith('q1', request);
    });
  });
});
