import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { QueueWithActiveTask } from '../../../queue/models/queue.model';
import { PriorityBadgeComponent } from '../../../../shared/components/priority-badge/priority-badge.component';

@Component({
  selector: 'app-queue-card',
  standalone: true,
  imports: [CommonModule, RouterLink, PriorityBadgeComponent],
  templateUrl: './queue-card.component.html'
})
export class QueueCardComponent {
  @Input({ required: true }) queue!: QueueWithActiveTask;
  @Output() edit = new EventEmitter<QueueWithActiveTask>();
  @Output() delete = new EventEmitter<QueueWithActiveTask>();

  onEdit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.edit.emit(this.queue);
  }

  onDelete(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.delete.emit(this.queue);
  }
}
