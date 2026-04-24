import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'relativeDate',
  standalone: true
})
export class RelativeDatePipe implements PipeTransform {
  transform(value: string | Date): string {
    if (!value) {
      return '';
    }

    const date = typeof value === 'string' ? new Date(value) : value;
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 0) {
      return 'Just now';
    }

    const intervals: { [key: string]: number } = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);

      if (interval >= 1) {
        if (unit === 'day' && interval === 1) {
          return 'Yesterday';
        }
        return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
      }
    }

    return 'Just now';
  }
}
