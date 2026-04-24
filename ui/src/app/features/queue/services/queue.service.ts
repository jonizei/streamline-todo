import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Queue, CreateQueueRequest, UpdateQueueRequest } from '../models/queue.model';

@Injectable({
  providedIn: 'root'
})
export class QueueService {
  private http = inject(HttpClient);
  private readonly API_URL = '/api/queues';

  /**
   * Get all queues for the current user
   */
  getQueues(): Observable<Queue[]> {
    return this.http.get<Queue[]>(this.API_URL);
  }

  /**
   * Get a specific queue by ID
   */
  getQueue(queueId: string): Observable<Queue> {
    return this.http.get<Queue>(`${this.API_URL}/${queueId}`);
  }

  /**
   * Create a new queue
   */
  createQueue(request: CreateQueueRequest): Observable<Queue> {
    return this.http.post<Queue>(this.API_URL, request);
  }

  /**
   * Update an existing queue
   */
  updateQueue(queueId: string, request: UpdateQueueRequest): Observable<Queue> {
    return this.http.patch<Queue>(`${this.API_URL}/${queueId}`, request);
  }

  /**
   * Delete a queue and all its tasks
   */
  deleteQueue(queueId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${queueId}`);
  }
}
