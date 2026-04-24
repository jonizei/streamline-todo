import { Routes } from '@angular/router';

export const QUEUE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./queue-detail/queue-detail.component').then(m => m.QueueDetailComponent)
  }
];
