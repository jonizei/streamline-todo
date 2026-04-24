import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.css']
})
export class LoadingSpinnerComponent {
  @Input() mode: 'overlay' | 'inline' = 'inline';
  @Input() message = 'Loading...';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
}
