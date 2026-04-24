import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.css']
})
export class EmptyStateComponent {
  @Input() icon = '📋';
  @Input() title = 'No items found';
  @Input() message = 'Get started by creating your first item.';
  @Input() actionText?: string;
}
