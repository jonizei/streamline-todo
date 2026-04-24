import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QueueService } from '../services/queue.service';
import { TaskService } from '../services/task.service';
import { ToastService } from '../../../core/services/toast.service';
import { PriorityService } from '../services/priority.service';
import { Queue } from '../models/queue.model';
import { Task, CreateTaskRequest, UpdateTaskRequest, UpdateTaskStatusRequest } from '../models/task.model';
import { ActiveTaskCardComponent } from '../components/active-task-card/active-task-card.component';
import { TaskListComponent } from '../components/task-list/task-list.component';
import { TaskFormComponent } from '../components/task-form/task-form.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-queue-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ActiveTaskCardComponent,
    TaskListComponent,
    TaskFormComponent,
    ModalComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    ConfirmationDialogComponent
  ],
  templateUrl: './queue-detail.component.html'
})
export class QueueDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private queueService = inject(QueueService);
  private taskService = inject(TaskService);
  private toastService = inject(ToastService);
  private priorityService = inject(PriorityService);
  private cdr = inject(ChangeDetectorRef);

  queueId: string = '';
  queue: Queue | null = null;
  activeTask: Task | null = null;
  tasks: Task[] = [];

  isLoading = false;
  isFormLoading = false;
  showTaskForm = false;
  selectedTask?: Task;
  errorMessage = '';
  showRemoveConfirmation = false;
  taskToRemove?: Task;

  ngOnInit(): void {
    this.queueId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.queueId) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.loadQueueData();
  }

  loadQueueData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.queueService.getQueue(this.queueId).subscribe({
      next: (queue) => {
        this.queue = queue;
        this.loadTasks();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load queue. Please try again.';
        console.error('Error loading queue:', error);
      }
    });
  }

  private loadTasks(): void {
    this.taskService.getTasks(this.queueId).subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.activeTask = tasks.find(t => t.status === 'Active') || null;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load tasks. Please try again.';
        this.cdr.detectChanges();
        console.error('Error loading tasks:', error);
      }
    });
  }

  onCreateTask(): void {
    this.selectedTask = undefined;
    this.showTaskForm = true;
  }

  onEditTask(task: Task): void {
    this.selectedTask = task;
    this.showTaskForm = true;
  }

  onSaveTask(request: CreateTaskRequest | UpdateTaskRequest): void {
    this.isFormLoading = true;

    const operation = this.selectedTask
      ? this.taskService.updateTask(this.queueId, this.selectedTask.id, request as UpdateTaskRequest)
      : this.taskService.createTask(this.queueId, request as CreateTaskRequest);

    operation.subscribe({
      next: (task) => {
        this.isFormLoading = false;
        this.showTaskForm = false;
        const action = this.selectedTask ? 'updated' : 'created';
        this.toastService.success(`Task "${task.title}" ${action} successfully`);

        this.selectedTask = undefined;

        // Reload tasks to reflect any backend state changes (promotions/demotions)
        this.loadTasks();
      },
      error: (error) => {
        this.isFormLoading = false;
        console.error('Error saving task:', error);
      }
    });
  }

  onCancelForm(): void {
    this.showTaskForm = false;
    this.selectedTask = undefined;
  }

  onMarkDone(task: Task): void {
    this.updateTaskStatus(task, 'Done');
  }

  onMarkBlocked(task: Task): void {
    this.updateTaskStatus(task, 'Blocked');
  }

  onMarkRemoved(task: Task): void {
    this.taskToRemove = task;
    this.showRemoveConfirmation = true;
  }

  confirmRemove(): void {
    if (!this.taskToRemove) {
      return;
    }

    this.updateTaskStatus(this.taskToRemove, 'Removed');
    this.showRemoveConfirmation = false;
    this.taskToRemove = undefined;
  }

  cancelRemove(): void {
    this.showRemoveConfirmation = false;
    this.taskToRemove = undefined;
  }

  private updateTaskStatus(task: Task, status: 'Done' | 'Blocked' | 'Removed'): void {
    const request: UpdateTaskStatusRequest = { status };

    this.taskService.updateTaskStatus(this.queueId, task.id, request).subscribe({
      next: (updatedTask) => {
        this.toastService.success(`Task "${task.title}" marked as ${status}`);

        // Update local state
        const index = this.tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
          this.tasks[index] = updatedTask;
        }

        // If active task was removed, reload tasks to get the promoted task
        if (task.status === 'Active') {
          this.loadTasks();
        } else {
          // Check if this task became active
          if (updatedTask.status === 'Active') {
            this.activeTask = updatedTask;
          }
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error updating task status:', error);
      }
    });
  }

  private sortTasks(tasks: Task[]): Task[] {
    return tasks.sort((a, b) => {
      // Active tasks first
      if (a.status === 'Active' && b.status !== 'Active') return -1;
      if (b.status === 'Active' && a.status !== 'Active') return 1;
      // Then sort by priority (high to low)
      return b.priority - a.priority;
    });
  }

  get nonActiveTasks(): Task[] {
    return this.tasks.filter(t => t.status !== 'Active');
  }
}
