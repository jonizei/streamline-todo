import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task, CreateTaskRequest, UpdateTaskRequest, UpdateTaskStatusRequest } from '../models/task.model';
import { SKIP_ERROR_TOAST } from '../../../core/interceptors/error.interceptor';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private http = inject(HttpClient);
  private readonly API_URL = '/api/queues';

  /**
   * Get the active task for a queue
   * Returns 204 No Content if no active task exists
   */
  getActiveTask(queueId: string): Observable<Task | null> {
    return this.http.get<Task | null>(`${this.API_URL}/${queueId}/tasks/next`, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true)
    });
  }

  /**
   * Get all tasks for a queue
   */
  getTasks(queueId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.API_URL}/${queueId}/tasks`);
  }

  /**
   * Get a specific task by ID
   */
  getTask(queueId: string, taskId: string): Observable<Task> {
    return this.http.get<Task>(`${this.API_URL}/${queueId}/tasks/${taskId}`);
  }

  /**
   * Create a new task in a queue
   */
  createTask(queueId: string, request: CreateTaskRequest): Observable<Task> {
    return this.http.post<Task>(`${this.API_URL}/${queueId}/tasks`, request);
  }

  /**
   * Update a task
   */
  updateTask(queueId: string, taskId: string, request: UpdateTaskRequest): Observable<Task> {
    return this.http.patch<Task>(`${this.API_URL}/${queueId}/tasks/${taskId}`, request);
  }

  /**
   * Update task status (Done, Blocked, or Removed)
   */
  updateTaskStatus(queueId: string, taskId: string, request: UpdateTaskStatusRequest): Observable<Task> {
    return this.http.patch<Task>(`${this.API_URL}/${queueId}/tasks/${taskId}/status`, request);
  }
}
