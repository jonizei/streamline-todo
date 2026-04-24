import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

@Component({
  selector: 'app-priority-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './priority-badge.component.html',
  styleUrls: ['./priority-badge.component.css']
})
export class PriorityBadgeComponent implements OnInit {
  @Input() priority!: number;

  priorityLevel: PriorityLevel = 'low';
  priorityLabel = '';

  ngOnInit(): void {
    this.setPriorityLevel();
  }

  private setPriorityLevel(): void {
    if (this.priority >= 5.0) {
      this.priorityLevel = 'critical';
      this.priorityLabel = 'Critical';
    } else if (this.priority >= 3.5) {
      this.priorityLevel = 'high';
      this.priorityLabel = 'High';
    } else if (this.priority >= 2.0) {
      this.priorityLevel = 'medium';
      this.priorityLabel = 'Medium';
    } else {
      this.priorityLevel = 'low';
      this.priorityLabel = 'Low';
    }
  }
}
