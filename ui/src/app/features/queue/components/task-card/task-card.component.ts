import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../models/task.model';
import { PriorityBadgeComponent } from '../../../../shared/components/priority-badge/priority-badge.component';
import { RelativeDatePipe } from '../../../../shared/pipes/relative-date.pipe';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, PriorityBadgeComponent, RelativeDatePipe],
  templateUrl: './task-card.component.html',
  host: { class: 'block' }
})
export class TaskCardComponent {
  @Input({ required: true }) task!: Task;
  @Output() edit = new EventEmitter<Task>();

  onEdit(): void {
    this.edit.emit(this.task);
  }

  getPriorityColor(): string {
    const priority = this.task.priority;
    if (priority >= 4.0) return 'bg-red-600 border-red-500';
    if (priority >= 3.0) return 'bg-orange-600 border-orange-500';
    if (priority >= 2.0) return 'bg-yellow-600 border-yellow-500';
    if (priority >= 1.0) return 'bg-green-600 border-green-500';
    return 'bg-blue-600 border-blue-500';
  }

  getStatusColor(): string {
    switch (this.task.status) {
      case 'Done':
        return 'text-green-400';
      case 'Blocked':
        return 'text-yellow-400';
      case 'Removed':
        return 'text-red-400';
      case 'Queued':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  }
}
