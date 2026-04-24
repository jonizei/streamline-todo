import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DashboardComponent } from './dashboard.component';
import { QueueService } from '../queue/services/queue.service';
import { TaskService } from '../queue/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { Queue, QueueWithActiveTask } from '../queue/models/queue.model';
import { Task } from '../queue/models/task.model';
import { User } from '../../core/models/user.model';
import { Router } from '@angular/router';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockQueueService: any;
  let mockTaskService: any;
  let mockAuthService: any;
  let router: Router;
  let currentUserSubject: BehaviorSubject<User | null>;

  const mockUser: User = {
    id: 'u1',
    email: 'test@example.com',
    name: 'Test User',
    created_at: '2026-04-10',
    updated_at: '2026-04-10'
  };

  const mockQueues: Queue[] = [
    { id: 'q1', user_id: 'u1', name: 'Work', description: 'Work Desc', created_at: '2026-04-10', updated_at: '2026-04-10' },
    { id: 'q2', user_id: 'u1', name: 'Personal', description: 'Personal Desc', created_at: '2026-04-10', updated_at: '2026-04-10' }
  ];

  const mockTask: Task = {
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
  };

  beforeEach(async () => {
    currentUserSubject = new BehaviorSubject<User | null>(mockUser);

    mockQueueService = {
      getQueues: vi.fn(),
      createQueue: vi.fn(),
      updateQueue: vi.fn(),
      deleteQueue: vi.fn()
    };
    mockTaskService = {
      getActiveTask: vi.fn()
    };
    mockAuthService = {
      currentUser$: currentUserSubject.asObservable(),
      getCurrentUser: vi.fn().mockReturnValue(of(mockUser)),
      getCurrentUserValue: vi.fn().mockReturnValue(mockUser),
      isAuthenticated: vi.fn().mockReturnValue(true)
    };

    // Default return values
    mockQueueService.getQueues.mockReturnValue(of(mockQueues));
    mockTaskService.getActiveTask.mockReturnValue(of(mockTask));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: QueueService, useValue: mockQueueService },
        { provide: TaskService, useValue: mockTaskService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: HttpClient, useValue: {} }, // Just to satisfy any direct injection
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load queues and active tasks on init', async () => {
    fixture.detectChanges(); // Trigger ngOnInit

    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(mockQueueService.getQueues).toHaveBeenCalled();
    expect(mockTaskService.getActiveTask).toHaveBeenCalledTimes(mockQueues.length);
    expect(component.queues.length).toBe(mockQueues.length);
    expect(component.queues[0].activeTask).toEqual(mockTask);
  });

  it('should handle empty queue list', async () => {
    mockQueueService.getQueues.mockReturnValue(of([]));
    fixture.detectChanges();

    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(component.queues.length).toBe(0);
    expect(component.isLoading).toBe(false);
  });

  it('should handle error when loading queues', async () => {
    mockQueueService.getQueues.mockReturnValue(throwError(() => new Error('API Error')));
    fixture.detectChanges();

    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toContain('Failed to load queues');
  });

  it('should show queue form on onCreateQueue', () => {
    component.onCreateQueue();
    expect(component.showQueueForm).toBe(true);
    expect(component.selectedQueue).toBeUndefined();
  });

  it('should show queue form with data on onEditQueue', () => {
    const queue = { ...mockQueues[0], activeTask: undefined };
    component.onEditQueue(queue);
    expect(component.showQueueForm).toBe(true);
    expect(component.selectedQueue).toEqual(queue);
  });

  it('should delete queue after confirmation', () => {
    mockQueueService.deleteQueue.mockReturnValue(of(undefined));
    component.queues = mockQueues.map(q => ({ ...q, activeTask: undefined }));

    component.onDeleteQueue(component.queues[0]);
    component.confirmDelete();

    expect(mockQueueService.deleteQueue).toHaveBeenCalledWith('q1');
    expect(component.queues.length).toBe(1);
  });

  it('should not delete queue if confirmation is cancelled', () => {
    component.queues = mockQueues.map(q => ({ ...q, activeTask: undefined }));

    component.onDeleteQueue(component.queues[0]);
    component.cancelDelete();

    expect(mockQueueService.deleteQueue).not.toHaveBeenCalled();
    expect(component.queues.length).toBe(2);
  });

  it('should create a new queue on onSaveQueue', () => {
    const newRequest = { name: 'New' };
    const newQueue = { ...mockQueues[0], id: 'q3', name: 'New' };
    mockQueueService.createQueue.mockReturnValue(of(newQueue));
    component.showQueueForm = true;

    component.onSaveQueue(newRequest);

    expect(mockQueueService.createQueue).toHaveBeenCalledWith(newRequest);
    expect(component.showQueueForm).toBe(false);
    expect(component.queues.find(q => q.id === 'q3')).toBeTruthy();
  });

  it('should update existing queue on onSaveQueue', () => {
    const updateRequest = { name: 'Updated' };
    const updatedQueue = { ...mockQueues[0], name: 'Updated' };
    mockQueueService.updateQueue.mockReturnValue(of(updatedQueue));
    component.selectedQueue = mockQueues[0];
    component.queues = mockQueues.map(q => ({ ...q, activeTask: undefined }));

    component.onSaveQueue(updateRequest);

    expect(mockQueueService.updateQueue).toHaveBeenCalledWith('q1', updateRequest);
    expect(component.queues[0].name).toBe('Updated');
  });
});
