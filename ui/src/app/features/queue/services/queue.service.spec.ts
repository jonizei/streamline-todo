import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueueService } from './queue.service';
import { Queue, CreateQueueRequest, UpdateQueueRequest } from '../models/queue.model';

describe('QueueService', () => {
  let service: QueueService;
  let httpClient: any;

  const mockQueues: Queue[] = [
    { id: '1', user_id: 'u1', name: 'Queue 1', description: 'Desc 1', created_at: '2026-04-10', updated_at: '2026-04-10' },
    { id: '2', user_id: 'u1', name: 'Queue 2', description: 'Desc 2', created_at: '2026-04-10', updated_at: '2026-04-10' }
  ];

  beforeEach(() => {
    httpClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        QueueService,
        { provide: HttpClient, useValue: httpClient }
      ]
    });

    service = TestBed.inject(QueueService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all queues', () => {
    httpClient.get.mockReturnValue(of(mockQueues));

    service.getQueues().subscribe(queues => {
      expect(queues).toEqual(mockQueues);
      expect(httpClient.get).toHaveBeenCalledWith('/api/queues');
    });
  });

  it('should get a specific queue', () => {
    httpClient.get.mockReturnValue(of(mockQueues[0]));

    service.getQueue('1').subscribe(queue => {
      expect(queue).toEqual(mockQueues[0]);
      expect(httpClient.get).toHaveBeenCalledWith('/api/queues/1');
    });
  });

  it('should create a new queue', () => {
    const request: CreateQueueRequest = { name: 'New Queue', description: 'New Desc' };
    const response: Queue = { ...mockQueues[0], name: request.name, description: request.description };
    httpClient.post.mockReturnValue(of(response));

    service.createQueue(request).subscribe(queue => {
      expect(queue).toEqual(response);
      expect(httpClient.post).toHaveBeenCalledWith('/api/queues', request);
    });
  });

  it('should update an existing queue', () => {
    const request: UpdateQueueRequest = { name: 'Updated Queue' };
    const response: Queue = { ...mockQueues[0], name: 'Updated Queue' };
    httpClient.patch.mockReturnValue(of(response));

    service.updateQueue('1', request).subscribe(queue => {
      expect(queue).toEqual(response);
      expect(httpClient.patch).toHaveBeenCalledWith('/api/queues/1', request);
    });
  });

  it('should delete a queue', () => {
    httpClient.delete.mockReturnValue(of(undefined));

    service.deleteQueue('1').subscribe(() => {
      expect(httpClient.delete).toHaveBeenCalledWith('/api/queues/1');
    });
  });
});
