import { Component, OnInit, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, filter, take } from 'rxjs/operators';
import { QueueService } from '../queue/services/queue.service';
import { TaskService } from '../queue/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { QueueWithActiveTask, Queue, CreateQueueRequest, UpdateQueueRequest } from '../queue/models/queue.model';
import { QueueCardComponent } from './components/queue-card/queue-card.component';
import { QueueFormComponent } from './components/queue-form/queue-form.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, QueueCardComponent, QueueFormComponent, ModalComponent, LoadingSpinnerComponent, EmptyStateComponent, ConfirmationDialogComponent],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private queueService = inject(QueueService);
  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  queues: QueueWithActiveTask[] = [];
  isLoading = false;
  isFormLoading = false;
  showQueueForm = false;
  selectedQueue?: Queue;
  errorMessage = '';
  showDeleteConfirmation = false;
  queueToDelete?: QueueWithActiveTask;
  private authSubscription?: Subscription;

  ngOnInit(): void {
    // Set loading state immediately to prevent "No queues" flash
    this.isLoading = true;

    // Subscribe to currentUser changes to handle auth state
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      // Load queues when user is authenticated and queues not yet loaded
      if (user && this.queues.length === 0) {
        console.log('Load Queues');
        this.loadQueues();
      } else if (!user) {
        // User logged out or not authenticated
        this.isLoading = false;
      }
    });

    // Ensure we fetch user data if authenticated but not yet loaded
    if (this.authService.isAuthenticated() && !this.authService.getCurrentUserValue()) {
      this.authService.getCurrentUser().subscribe();
    } else if (!this.authService.isAuthenticated()) {
      // Not authenticated, don't keep spinner running
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  loadQueues(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.queueService.getQueues().subscribe({
      next: (queues) => {
        console.log('Load Active tasks');
        this.loadActiveTasks(queues);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load queues. Please try again.';
        console.error('Error loading queues:', error);
      }
    });
  }

  private loadActiveTasks(queues: Queue[]): void {
    console.log('Queues length ' + queues.length);
    if (queues.length === 0) {
      this.queues = [];
      this.isLoading = false;
      return;
    }

    const activeTaskRequests = queues.map(queue =>
      this.taskService.getActiveTask(queue.id).pipe(
        catchError(() => of(null))
      )
    );

    forkJoin(activeTaskRequests).subscribe({
      next: (activeTasks) => {
        console.log('Active tasks', activeTasks);
        this.queues = queues.map((queue, index) => ({
          ...queue,
          activeTask: activeTasks[index] || undefined
        }));
        console.log(this.queues);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.queues = queues.map(queue => ({ ...queue, activeTask: undefined }));
        this.isLoading = false;
        this.cdr.detectChanges();
        console.error('Error loading active tasks:', error);
      }
    });
  }

  onCreateQueue(): void {
    this.selectedQueue = undefined;
    this.showQueueForm = true;
  }

  onEditQueue(queue: QueueWithActiveTask): void {
    this.selectedQueue = queue;
    this.showQueueForm = true;
  }

  onDeleteQueue(queue: QueueWithActiveTask): void {
    this.queueToDelete = queue;
    this.showDeleteConfirmation = true;
  }

  confirmDelete(): void {
    if (!this.queueToDelete) {
      return;
    }

    const queueName = this.queueToDelete.name;
    this.queueService.deleteQueue(this.queueToDelete.id).subscribe({
      next: () => {
        this.queues = this.queues.filter(q => q.id !== this.queueToDelete!.id);
        this.toastService.success(`Queue "${queueName}" deleted successfully`);
        this.showDeleteConfirmation = false;
        this.queueToDelete = undefined;
      },
      error: (error) => {
        console.error('Error deleting queue:', error);
        this.showDeleteConfirmation = false;
        this.queueToDelete = undefined;
      }
    });
  }

  cancelDelete(): void {
    this.showDeleteConfirmation = false;
    this.queueToDelete = undefined;
  }

  onSaveQueue(request: CreateQueueRequest | UpdateQueueRequest): void {
    this.isFormLoading = true;

    const operation = this.selectedQueue
      ? this.queueService.updateQueue(this.selectedQueue.id, request as UpdateQueueRequest)
      : this.queueService.createQueue(request as CreateQueueRequest);

    operation.subscribe({
      next: (queue) => {
        this.isFormLoading = false;
        this.showQueueForm = false;

        if (this.selectedQueue) {
          const index = this.queues.findIndex(q => q.id === queue.id);
          if (index !== -1) {
            this.queues[index] = { ...this.queues[index], ...queue };
          }
          this.toastService.success(`Queue "${queue.name}" updated successfully`);
        } else {
          this.queues.push({ ...queue, activeTask: undefined });
          this.toastService.success(`Queue "${queue.name}" created successfully`);
        }

        this.selectedQueue = undefined;
      },
      error: (error) => {
        this.isFormLoading = false;
        console.error('Error saving queue:', error);
      }
    });
  }

  onCancelForm(): void {
    this.showQueueForm = false;
    this.selectedQueue = undefined;
  }
}
