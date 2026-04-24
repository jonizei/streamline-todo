import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, TaskStatus } from '../../models/task.model';
import { TaskCardComponent } from '../task-card/task-card.component';

interface TaskGroup {
  status: TaskStatus;
  tasks: Task[];
  count: number;
  isExpanded: boolean;
}

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, TaskCardComponent],
  templateUrl: './task-list.component.html'
})
export class TaskListComponent implements OnChanges {
  @Input({ required: true }) tasks: Task[] = [];
  @Output() editTask = new EventEmitter<Task>();

  taskGroups: TaskGroup[] = [];

  ngOnChanges(): void {
    this.groupTasks();
  }

  private groupTasks(): void {
    const queuedTasks = this.tasks
      .filter(t => t.status === 'Queued')
      .sort((a, b) => b.priority - a.priority);

    const doneTasks = this.tasks
      .filter(t => t.status === 'Done')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    const blockedTasks = this.tasks
      .filter(t => t.status === 'Blocked')
      .sort((a, b) => b.priority - a.priority);

    const removedTasks = this.tasks
      .filter(t => t.status === 'Removed')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    // Preserve existing isExpanded state
    const previousExpandedState = new Map<TaskStatus, boolean>();
    this.taskGroups.forEach(group => {
      previousExpandedState.set(group.status, group.isExpanded);
    });

    this.taskGroups = [
      {
        status: 'Queued' as TaskStatus,
        tasks: queuedTasks,
        count: queuedTasks.length,
        isExpanded: previousExpandedState.get('Queued') ?? true
      },
      {
        status: 'Blocked' as TaskStatus,
        tasks: blockedTasks,
        count: blockedTasks.length,
        isExpanded: previousExpandedState.get('Blocked') ?? false
      },
      {
        status: 'Done' as TaskStatus,
        tasks: doneTasks,
        count: doneTasks.length,
        isExpanded: previousExpandedState.get('Done') ?? false
      },
      {
        status: 'Removed' as TaskStatus,
        tasks: removedTasks,
        count: removedTasks.length,
        isExpanded: previousExpandedState.get('Removed') ?? false
      }
    ].filter(group => group.count > 0);
  }

  toggleGroup(group: TaskGroup): void {
    group.isExpanded = !group.isExpanded;
  }

  onEditTask(task: Task): void {
    this.editTask.emit(task);
  }

  getStatusIcon(status: TaskStatus): string {
    switch (status) {
      case 'Queued':
        return 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2';
      case 'Done':
        return 'M5 13l4 4L19 7';
      case 'Blocked':
        return 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636';
      case 'Removed':
        return 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16';
      default:
        return '';
    }
  }

  getStatusColor(status: TaskStatus): string {
    switch (status) {
      case 'Queued':
        return 'text-blue-400';
      case 'Done':
        return 'text-green-400';
      case 'Blocked':
        return 'text-yellow-400';
      case 'Removed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  }
}
