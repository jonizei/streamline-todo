import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../models/task.model';
import { PriorityBadgeComponent } from '../../../../shared/components/priority-badge/priority-badge.component';
import { RelativeDatePipe } from '../../../../shared/pipes/relative-date.pipe';

@Component({
  selector: 'app-active-task-card',
  standalone: true,
  imports: [CommonModule, PriorityBadgeComponent, RelativeDatePipe],
  templateUrl: './active-task-card.component.html'
})
export class ActiveTaskCardComponent {
  @Input({ required: true }) task!: Task;
  @Output() markDone = new EventEmitter<Task>();
  @Output() markBlocked = new EventEmitter<Task>();
  @Output() markRemoved = new EventEmitter<Task>();
  @Output() edit = new EventEmitter<Task>();

  onMarkDone(): void {
    this.markDone.emit(this.task);
  }

  onMarkBlocked(): void {
    this.markBlocked.emit(this.task);
  }

  onMarkRemoved(): void {
    this.markRemoved.emit(this.task);
  }

  onEdit(): void {
    this.edit.emit(this.task);
  }

  getFormattedDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
