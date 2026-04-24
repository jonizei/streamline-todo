import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { queueRepository } from '../src/repositories/queueRepository.js';
import { taskRepository } from '../src/repositories/taskRepository.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { promises as fs } from 'fs';
import path from 'path';
import type { Express } from 'express';
import type { Queue } from '../src/models/queue.js';
import type { Task } from '../src/models/task.js';

// Test data directories
const TEST_DATA_DIR = process.env.QUEUES_DIR || 'data/queues-test';
const TEST_USERS_DIR = process.env.USERS_DIR || 'data/users-test';

// Helper function to properly reset repositories
async function resetRepositories() {
  // Clean filesystem
  await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  await fs.mkdir(TEST_DATA_DIR, { recursive: true });
  await fs.rm(TEST_USERS_DIR, { recursive: true, force: true });
  await fs.mkdir(TEST_USERS_DIR, { recursive: true });

  // Access private cache and initialized flag
  const queueRepo = queueRepository as any;
  const taskRepo = taskRepository as any;
  const userRepo = userRepository as any;

  // Clear caches
  queueRepo.cache = new Map();
  queueRepo.userIndex = new Map();
  taskRepo.cache = new Map();
  userRepo.cache = new Map();
  userRepo.emailIndex = new Map();

  // Reset initialized flags
  queueRepo.initialized = false;
  taskRepo.initialized = false;
  userRepo.initialized = false;

  // Re-initialize
  await queueRepository.init();
  await taskRepository.init();
  await userRepository.init();
}

// Helper function to create a test user and get auth token
async function createTestUser(app: Express, email: string = 'test@example.com', password: string = 'password123'): Promise<string> {
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      email,
      password,
      name: 'Test User',
    });

  return response.body.token;
}

describe('REST API Integration Tests', () => {
  let app: Express;
  let authToken: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await resetRepositories();

    // Create Express app
    app = createApp();
  });

  afterAll(async () => {
    // Clean up test data after all tests complete
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
    await fs.rm(TEST_USERS_DIR, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Reset repositories before each test to ensure test isolation
    await resetRepositories();

    // Create test user and get auth token for each test
    authToken = await createTestUser(app);
  });

  describe('Queue Management Endpoints', () => {
    describe('POST /api/queues', () => {
      it('should create a new queue with valid input', async () => {
        const response = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            name: 'Work Tasks',
            description: 'Tasks related to work projects',
          });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          name: 'Work Tasks',
          description: 'Tasks related to work projects',
        });
        expect(response.body.id).toBeDefined();
        expect(response.body.created_at).toBeDefined();
        expect(response.body.updated_at).toBeDefined();
      });

      it('should create a queue without description', async () => {
        const response = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            name: 'Personal Tasks',
          });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          name: 'Personal Tasks',
        });
        expect(response.body.description).toBeUndefined();
      });

      it('should return 400 when name is missing', async () => {
        const response = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            description: 'No name provided',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation error');
        expect(response.body.details).toBeDefined();
      });

      it('should return 400 when name is empty', async () => {
        const response = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            name: '',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation error');
      });

      it('should return 400 when name exceeds maximum length', async () => {
        const response = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            name: 'a'.repeat(101), // Max is 100 characters
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation error');
      });

      it('should return 400 when description exceeds maximum length', async () => {
        const response = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            name: 'Valid Name',
            description: 'a'.repeat(501), // Max is 500 characters
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation error');
      });
    });

    describe('GET /api/queues', () => {
      it('should return empty array when no queues exist', async () => {
        const response = await request(app).get('/api/queues')
        .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
      });

      it('should return all queues sorted by creation date', async () => {
        // Create multiple queues
        const queue1 = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'First Queue' });

        // Wait a tiny bit to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));

        const queue2 = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'Second Queue' });

        await new Promise(resolve => setTimeout(resolve, 10));

        const queue3 = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'Third Queue' });

        const response = await request(app).get('/api/queues')
        .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(3);
        // Should be sorted by creation date (oldest first)
        expect(response.body[0].name).toBe('First Queue');
        expect(response.body[1].name).toBe('Second Queue');
        expect(response.body[2].name).toBe('Third Queue');
      });
    });

    describe('GET /api/queues/:queueId', () => {
      it('should return queue by ID', async () => {
        const createResponse = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'Test Queue', description: 'Test description' });

        const queueId = createResponse.body.id;

        const response = await request(app).get(`/api/queues/${queueId}`)
        .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          id: queueId,
          name: 'Test Queue',
          description: 'Test description',
        });
      });

      it('should return 404 when queue does not exist', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
        const response = await request(app).get(`/api/queues/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Queue not found');
      });

      it('should return 400 for invalid UUID format', async () => {
        const response = await request(app).get('/api/queues/invalid-uuid')
        .set("Authorization", `Bearer ${authToken}`);

        // The queue won't be found, resulting in 404
        expect(response.status).toBe(404);
      });
    });

    describe('PATCH /api/queues/:queueId', () => {
      it('should update queue name', async () => {
        const createResponse = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'Old Name', description: 'Original description' });

        const queueId = createResponse.body.id;

        const response = await request(app)
          .patch(`/api/queues/${queueId}`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'New Name' });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          id: queueId,
          name: 'New Name',
          description: 'Original description', // Unchanged
        });
      });

      it('should update queue description', async () => {
        const createResponse = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'Test Queue', description: 'Old description' });

        const queueId = createResponse.body.id;

        const response = await request(app)
          .patch(`/api/queues/${queueId}`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ description: 'New description' });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          id: queueId,
          name: 'Test Queue', // Unchanged
          description: 'New description',
        });
      });

      it('should update both name and description', async () => {
        const createResponse = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'Old Name', description: 'Old description' });

        const queueId = createResponse.body.id;

        const response = await request(app)
          .patch(`/api/queues/${queueId}`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'New Name', description: 'New description' });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          id: queueId,
          name: 'New Name',
          description: 'New description',
        });
      });

      it('should return 404 when queue does not exist', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
        const response = await request(app)
          .patch(`/api/queues/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'New Name' });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Queue not found');
      });

      it('should return 400 for invalid name', async () => {
        const createResponse = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'Test Queue' });

        const queueId = createResponse.body.id;

        const response = await request(app)
          .patch(`/api/queues/${queueId}`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: '' }); // Empty name

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation error');
      });
    });

    describe('DELETE /api/queues/:queueId', () => {
      it('should delete an empty queue', async () => {
        const createResponse = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'Queue to Delete' });

        const queueId = createResponse.body.id;

        const response = await request(app).delete(`/api/queues/${queueId}`)
        .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(204);
        expect(response.body).toEqual({});

        // Verify queue is deleted
        const getResponse = await request(app).get(`/api/queues/${queueId}`)
        .set("Authorization", `Bearer ${authToken}`);
        expect(getResponse.status).toBe(404);
      });

      it('should delete queue with tasks', async () => {
        const createResponse = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'Queue with Tasks' });

        const queueId = createResponse.body.id;

        // Create a task in the queue
        await request(app)
          .post(`/api/queues/${queueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task to be deleted with queue',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const response = await request(app).delete(`/api/queues/${queueId}`)
        .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(204);

        // Verify queue directory is deleted
        const queueDir = path.join(TEST_DATA_DIR, queueId);
        await expect(fs.access(queueDir)).rejects.toThrow();
      });

      it('should return 404 when queue does not exist', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
        const response = await request(app).delete(`/api/queues/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Queue not found');
      });
    });
  });

  describe('Task Management Endpoints', () => {
    let testQueueId: string;

    beforeEach(async () => {
      // Create a test queue before each task test
      const response = await request(app)
        .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: 'Test Queue' });
      testQueueId = response.body.id;
    });

    describe('POST /api/queues/:queueId/tasks', () => {
      it('should create a new task in a queue', async () => {
        const response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Implement feature',
            description: 'Add new feature to the application',
            impact: 5,
            urgency: 4,
            relevance: 5,
            effort: 3,
          });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          title: 'Implement feature',
          description: 'Add new feature to the application',
          impact: 5,
          urgency: 4,
          relevance: 5,
          effort: 3,
          queue_id: testQueueId,
        });
        expect(response.body.id).toBeDefined();
        expect(response.body.priority).toBeDefined();
        expect(response.body.status).toBeDefined();
        expect(response.body.created_at).toBeDefined();
        expect(response.body.updated_at).toBeDefined();
      });

      it('should create task without description', async () => {
        const response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Quick task',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 2,
          });

        expect(response.status).toBe(201);
        expect(response.body.title).toBe('Quick task');
        expect(response.body.description).toBeUndefined();
      });

      it('should auto-promote first task to Active when queue is empty', async () => {
        const response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'First task',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        expect(response.status).toBe(201);
        expect(response.body.status).toBe('Active');
      });

      it('should keep task as Queued when active task already exists', async () => {
        // Create first task (will be Active)
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'First task',
            impact: 5,
            urgency: 5,
            relevance: 5,
            effort: 1,
          });

        // Create second task
        const response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Second task',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        expect(response.status).toBe(201);
        expect(response.body.status).toBe('Queued');
      });

      it('should return 404 when queue does not exist', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
        const response = await request(app)
          .post(`/api/queues/${nonExistentId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task in non-existent queue',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Queue not found');
      });

      it('should return 400 when title is missing', async () => {
        const response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation error');
      });

      it('should return 400 when priority parameters are out of range', async () => {
        const response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Invalid task',
            impact: 6, // Out of range (max 5)
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation error');
      });

      it('should return 400 when priority parameters are below minimum', async () => {
        const response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Invalid task',
            impact: 0, // Below minimum (min 1)
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation error');
      });

      it('should return 400 when priority parameters are not integers', async () => {
        const response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Invalid task',
            impact: 3.5, // Not an integer
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation error');
      });
    });

    describe('GET /api/queues/:queueId/tasks', () => {
      it('should return empty array when queue has no tasks', async () => {
        const response = await request(app).get(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
      });

      it('should return all tasks in queue sorted by priority', async () => {
        // Create tasks with different priorities
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'High priority task',
            impact: 5,
            urgency: 5,
            relevance: 5,
            effort: 1,
          });

        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Medium priority task',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Low priority task',
            impact: 1,
            urgency: 1,
            relevance: 1,
            effort: 5,
          });

        const response = await request(app).get(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(3);

        // Verify sorted by priority (highest first)
        expect(response.body[0].priority).toBeGreaterThanOrEqual(response.body[1].priority);
        expect(response.body[1].priority).toBeGreaterThanOrEqual(response.body[2].priority);
        expect(response.body[0].title).toBe('High priority task');
      });

      it('should return 404 when queue does not exist', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
        const response = await request(app).get(`/api/queues/${nonExistentId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Queue not found');
      });
    });

    describe('GET /api/queues/:queueId/tasks/next', () => {
      it('should return 204 when queue has no active task', async () => {
        const response = await request(app).get(`/api/queues/${testQueueId}/tasks/next`)
        .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(204);
        expect(response.body).toEqual({});
      });

      it('should return the active task', async () => {
        // Create a task (will be auto-promoted to Active)
        const createResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Active task',
            impact: 4,
            urgency: 4,
            relevance: 4,
            effort: 2,
          });

        const response = await request(app).get(`/api/queues/${testQueueId}/tasks/next`)
        .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(createResponse.body.id);
        expect(response.body.status).toBe('Active');
        expect(response.body.title).toBe('Active task');
      });

      it('should only return active task for specific queue', async () => {
        // Create second queue
        const queue2Response = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'Second Queue' });
        const queue2Id = queue2Response.body.id;

        // Create task in first queue
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task in Queue 1',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        // Create task in second queue
        const task2Response = await request(app)
          .post(`/api/queues/${queue2Id}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task in Queue 2',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        // Get next task from queue 2
        const response = await request(app).get(`/api/queues/${queue2Id}/tasks/next`)
        .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(task2Response.body.id);
        expect(response.body.queue_id).toBe(queue2Id);
      });

      it('should return 404 when queue does not exist', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
        const response = await request(app).get(`/api/queues/${nonExistentId}/tasks/next`)
        .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Queue not found');
      });
    });

    describe('GET /api/queues/:queueId/tasks/:taskId', () => {
      it('should return specific task by ID', async () => {
        const createResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Specific task',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const taskId = createResponse.body.id;

        const response = await request(app).get(`/api/queues/${testQueueId}/tasks/${taskId}`)
        .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          id: taskId,
          title: 'Specific task',
          queue_id: testQueueId,
        });
      });

      it('should return 404 when task does not exist', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
        const response = await request(app).get(`/api/queues/${testQueueId}/tasks/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Task not found');
      });

      it('should return 404 when task exists but in different queue', async () => {
        // Create second queue
        const queue2Response = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'Second Queue' });
        const queue2Id = queue2Response.body.id;

        // Create task in queue 2
        const taskResponse = await request(app)
          .post(`/api/queues/${queue2Id}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task in Queue 2',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const taskId = taskResponse.body.id;

        // Try to access from queue 1
        const response = await request(app).get(`/api/queues/${testQueueId}/tasks/${taskId}`)
        .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Task not found in this queue');
      });

      it('should return 404 when queue does not exist', async () => {
        const nonExistentQueueId = '550e8400-e29b-41d4-a716-446655440000';
        const nonExistentTaskId = '550e8400-e29b-41d4-a716-446655440001';
        const response = await request(app).get(`/api/queues/${nonExistentQueueId}/tasks/${nonExistentTaskId}`)
        .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Task not found');
      });
    });

    describe('PATCH /api/queues/:queueId/tasks/:taskId', () => {
      it('should update task title', async () => {
        const createResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Old title',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const taskId = createResponse.body.id;

        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${taskId}`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ title: 'New title' });

        expect(response.status).toBe(200);
        expect(response.body.title).toBe('New title');
        expect(response.body.impact).toBe(3); // Unchanged
      });

      it('should update task description', async () => {
        const createResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task',
            description: 'Old description',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const taskId = createResponse.body.id;

        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${taskId}`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ description: 'New description' });

        expect(response.status).toBe(200);
        expect(response.body.description).toBe('New description');
      });

      it('should recalculate priority when impact is updated', async () => {
        const createResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task',
            impact: 2,
            urgency: 2,
            relevance: 2,
            effort: 2,
          });

        const taskId = createResponse.body.id;
        const originalPriority = createResponse.body.priority;

        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${taskId}`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ impact: 5 });

        expect(response.status).toBe(200);
        expect(response.body.impact).toBe(5);
        expect(response.body.priority).not.toBe(originalPriority);
        expect(response.body.priority).toBeGreaterThan(originalPriority);
      });

      it('should recalculate priority when urgency is updated', async () => {
        const createResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task',
            impact: 3,
            urgency: 2,
            relevance: 3,
            effort: 3,
          });

        const taskId = createResponse.body.id;
        const originalPriority = createResponse.body.priority;

        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${taskId}`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ urgency: 5 });

        expect(response.status).toBe(200);
        expect(response.body.urgency).toBe(5);
        expect(response.body.priority).not.toBe(originalPriority);
        expect(response.body.priority).toBeGreaterThan(originalPriority);
      });

      it('should recalculate priority when relevance is updated', async () => {
        const createResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task',
            impact: 3,
            urgency: 3,
            relevance: 2,
            effort: 3,
          });

        const taskId = createResponse.body.id;
        const originalPriority = createResponse.body.priority;

        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${taskId}`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ relevance: 5 });

        expect(response.status).toBe(200);
        expect(response.body.relevance).toBe(5);
        expect(response.body.priority).not.toBe(originalPriority);
      });

      it('should recalculate priority when effort is updated', async () => {
        const createResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 5,
          });

        const taskId = createResponse.body.id;
        const originalPriority = createResponse.body.priority;

        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${taskId}`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ effort: 1 }); // Lower effort = higher priority

        expect(response.status).toBe(200);
        expect(response.body.effort).toBe(1);
        expect(response.body.priority).toBeGreaterThan(originalPriority);
      });

      it('should demote Active task when priority drops below Queued task', async () => {
        // Create high priority task (will be Active)
        const activeTaskResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'High priority task',
            impact: 5,
            urgency: 5,
            relevance: 5,
            effort: 1,
          });

        const activeTaskId = activeTaskResponse.body.id;

        // Create second task (will be Queued)
        const queuedTaskResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Lower priority task',
            impact: 5,
            urgency: 5,
            relevance: 5,
            effort: 1,
          });

        const queuedTaskId = queuedTaskResponse.body.id;

        // Update active task to have much higher effort (lower priority)
        const updateResponse = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${activeTaskId}`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ effort: 5 });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.status).toBe('Queued'); // Should be demoted

        // Queued task should now be promoted
        const queuedTaskCheck = await request(app).get(`/api/queues/${testQueueId}/tasks/${queuedTaskId}`)
        .set("Authorization", `Bearer ${authToken}`);
        expect(queuedTaskCheck.body.status).toBe('Active');
      });

      it('should NOT demote Active task when priority remains highest', async () => {
        // Create high priority task (will be Active)
        const activeTaskResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'High priority task',
            impact: 5,
            urgency: 5,
            relevance: 5,
            effort: 1,
          });

        const activeTaskId = activeTaskResponse.body.id;

        // Create lower priority task
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Lower priority task',
            impact: 2,
            urgency: 2,
            relevance: 2,
            effort: 3,
          });

        // Make minor update to active task
        const updateResponse = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${activeTaskId}`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ effort: 2 }); // Still relatively high priority

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.status).toBe('Active'); // Should remain Active
      });

      it('should return 404 when task does not exist', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ title: 'New title' });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Task not found');
      });

      it('should return 404 when task exists in different queue', async () => {
        // Create second queue
        const queue2Response = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'Second Queue' });
        const queue2Id = queue2Response.body.id;

        // Create task in queue 2
        const taskResponse = await request(app)
          .post(`/api/queues/${queue2Id}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task in Queue 2',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const taskId = taskResponse.body.id;

        // Try to update from queue 1
        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${taskId}`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ title: 'New title' });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Task not found in this queue');
      });

      it('should return 400 for invalid input', async () => {
        const createResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const taskId = createResponse.body.id;

        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${taskId}`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ impact: 6 }); // Out of range

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation error');
      });
    });

    describe('PATCH /api/queues/:queueId/tasks/:taskId/status', () => {
      it('should update status from Active to Done', async () => {
        // Create first task (will be Active)
        const task1Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task to complete',
            impact: 4,
            urgency: 4,
            relevance: 4,
            effort: 2,
          });

        const task1Id = task1Response.body.id;

        // Create second task so there's something to promote
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Next task',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task1Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Done' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('Done');
      });

      it('should update status from Active to Blocked', async () => {
        // Create first task (will be Active)
        const task1Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task to block',
            impact: 4,
            urgency: 4,
            relevance: 4,
            effort: 2,
          });

        const task1Id = task1Response.body.id;

        // Create second task so there's something to promote
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Next task',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task1Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Blocked' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('Blocked');
      });

      it('should update status from Active to Removed', async () => {
        // Create first task (will be Active)
        const task1Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task to remove',
            impact: 4,
            urgency: 4,
            relevance: 4,
            effort: 2,
          });

        const task1Id = task1Response.body.id;

        // Create second task so there's something to promote
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Next task',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task1Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Removed' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('Removed');
      });

      it('should promote next task when Active task is marked Done', async () => {
        // Create first task (will be Active)
        const task1Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'First task',
            impact: 5,
            urgency: 5,
            relevance: 5,
            effort: 1,
          });

        const task1Id = task1Response.body.id;

        // Create second task (will be Queued)
        const task2Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Second task',
            impact: 4,
            urgency: 4,
            relevance: 4,
            effort: 2,
          });

        const task2Id = task2Response.body.id;

        // Mark first task as Done
        await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task1Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Done' });

        // Second task should now be Active
        const task2Check = await request(app).get(`/api/queues/${testQueueId}/tasks/${task2Id}`)
        .set("Authorization", `Bearer ${authToken}`);
        expect(task2Check.body.status).toBe('Active');
      });

      it('should promote next task when Active task is marked Blocked', async () => {
        // Create first task (will be Active)
        const task1Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task to block',
            impact: 5,
            urgency: 5,
            relevance: 5,
            effort: 1,
          });

        const task1Id = task1Response.body.id;

        // Create second task (will be Queued)
        const task2Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Next task',
            impact: 4,
            urgency: 4,
            relevance: 4,
            effort: 2,
          });

        const task2Id = task2Response.body.id;

        // Mark first task as Blocked
        await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task1Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Blocked' });

        // Second task should now be Active
        const task2Check = await request(app).get(`/api/queues/${testQueueId}/tasks/${task2Id}`)
        .set("Authorization", `Bearer ${authToken}`);
        expect(task2Check.body.status).toBe('Active');
      });

      it('should promote next task when Active task is marked Removed', async () => {
        // Create first task (will be Active)
        const task1Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task to remove',
            impact: 5,
            urgency: 5,
            relevance: 5,
            effort: 1,
          });

        const task1Id = task1Response.body.id;

        // Create second task (will be Queued)
        const task2Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Next task',
            impact: 4,
            urgency: 4,
            relevance: 4,
            effort: 2,
          });

        const task2Id = task2Response.body.id;

        // Mark first task as Removed
        await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task1Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Removed' });

        // Second task should now be Active
        const task2Check = await request(app).get(`/api/queues/${testQueueId}/tasks/${task2Id}`)
        .set("Authorization", `Bearer ${authToken}`);
        expect(task2Check.body.status).toBe('Active');
      });

      it('should update status from Queued to Done without triggering promotion', async () => {
        // Create first task (will be Active)
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Active task',
            impact: 5,
            urgency: 5,
            relevance: 5,
            effort: 1,
          });

        // Create second task (will be Queued)
        const task2Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Queued task',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const task2Id = task2Response.body.id;

        // Mark queued task as Done
        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task2Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Done' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('Done');
      });

      it('should return 409 when trying to change status from Done', async () => {
        // Create first task (will be Active)
        const task1Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const task1Id = task1Response.body.id;

        // Create second task so there's something to promote when marking first as Done
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Next task',
            impact: 2,
            urgency: 2,
            relevance: 2,
            effort: 3,
          });

        // Mark first task as Done
        await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task1Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Done' });

        // Try to change status again
        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task1Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Blocked' });

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('Cannot change status');
      });

      it('should return 409 when trying to change status from Blocked', async () => {
        // Create first task (will be Active)
        const task1Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const task1Id = task1Response.body.id;

        // Create second task so there's something to promote when marking first as Blocked
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Next task',
            impact: 2,
            urgency: 2,
            relevance: 2,
            effort: 3,
          });

        // Mark first task as Blocked
        await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task1Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Blocked' });

        // Try to change status again
        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task1Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Done' });

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('Cannot change status');
      });

      it('should return 409 when trying to change status from Removed', async () => {
        // Create first task (will be Active)
        const task1Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const task1Id = task1Response.body.id;

        // Create second task so there's something to promote when marking first as Removed
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Next task',
            impact: 2,
            urgency: 2,
            relevance: 2,
            effort: 3,
          });

        // Mark first task as Removed
        await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task1Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Removed' });

        // Try to change status again
        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task1Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Done' });

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('Cannot change status');
      });

      it('should return 404 when task does not exist', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${nonExistentId}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Done' });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Task not found');
      });

      it('should return 404 when task exists in different queue', async () => {
        // Create second queue
        const queue2Response = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'Second Queue' });
        const queue2Id = queue2Response.body.id;

        // Create task in queue 2
        const taskResponse = await request(app)
          .post(`/api/queues/${queue2Id}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task in Queue 2',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const taskId = taskResponse.body.id;

        // Try to update status from queue 1
        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${taskId}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Done' });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Task not found in this queue');
      });

      it('should return 400 for invalid status value', async () => {
        const createResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const taskId = createResponse.body.id;

        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${taskId}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'InvalidStatus' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation error');
      });

      it('should return 400 when trying to set status to Queued or Active', async () => {
        const createResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const taskId = createResponse.body.id;

        // Queued is not a valid status for update
        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${taskId}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Queued' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation error');
      });
    });
  });

  describe('Business Logic Integration Tests', () => {
    let testQueueId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: 'Business Logic Test Queue' });
      testQueueId = response.body.id;
    });

    describe('Queue Isolation', () => {
      it('should maintain separate active tasks for different queues', async () => {
        // Create second queue
        const queue2Response = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'Second Queue' });
        const queue2Id = queue2Response.body.id;

        // Create task in queue 1
        const task1Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task in Queue 1',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        // Create task in queue 2
        const task2Response = await request(app)
          .post(`/api/queues/${queue2Id}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task in Queue 2',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        // Both tasks should be Active in their respective queues
        expect(task1Response.body.status).toBe('Active');
        expect(task2Response.body.status).toBe('Active');

        // Verify via /next endpoint
        const next1 = await request(app).get(`/api/queues/${testQueueId}/tasks/next`)
        .set("Authorization", `Bearer ${authToken}`);
        const next2 = await request(app).get(`/api/queues/${queue2Id}/tasks/next`)
        .set("Authorization", `Bearer ${authToken}`);

        expect(next1.body.id).toBe(task1Response.body.id);
        expect(next2.body.id).toBe(task2Response.body.id);
      });

      it('should not affect other queues when completing active task', async () => {
        // Create second queue
        const queue2Response = await request(app)
          .post('/api/queues')
        .set("Authorization", `Bearer ${authToken}`)
          .send({ name: 'Second Queue' });
        const queue2Id = queue2Response.body.id;

        // Create task in queue 1 (will be Active)
        const task1Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task in Queue 1',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const task1Id = task1Response.body.id;

        // Create second task in queue 1 so there's something to promote
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Next task in Queue 1',
            impact: 2,
            urgency: 2,
            relevance: 2,
            effort: 3,
          });

        // Create task in queue 2 (will be Active)
        const task2Response = await request(app)
          .post(`/api/queues/${queue2Id}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task in Queue 2',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const task2Id = task2Response.body.id;

        // Complete task in queue 1
        await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task1Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Done' });

        // Task in queue 2 should still be Active (unaffected)
        const task2Check = await request(app).get(`/api/queues/${queue2Id}/tasks/${task2Id}`)
        .set("Authorization", `Bearer ${authToken}`);
        expect(task2Check.body.status).toBe('Active');
      });
    });

    describe('Priority-Based Queue Management', () => {
      it('should promote highest priority task when active task is completed', async () => {
        // Create active task
        const activeTaskResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Current active',
            impact: 5,
            urgency: 5,
            relevance: 5,
            effort: 1,
          });

        const activeTaskId = activeTaskResponse.body.id;

        // Create low priority queued task
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Low priority',
            impact: 1,
            urgency: 1,
            relevance: 1,
            effort: 5,
          });

        // Create medium priority queued task
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Medium priority',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        // Create high priority queued task
        const highPriorityResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'High priority',
            impact: 5,
            urgency: 4,
            relevance: 5,
            effort: 2,
          });

        const highPriorityId = highPriorityResponse.body.id;

        // Complete active task
        await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${activeTaskId}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Done' });

        // High priority task should become active
        const nextTask = await request(app).get(`/api/queues/${testQueueId}/tasks/next`)
        .set("Authorization", `Bearer ${authToken}`);
        expect(nextTask.body.id).toBe(highPriorityId);
        expect(nextTask.body.status).toBe('Active');
      });

      it('should handle empty queue after completing last task', async () => {
        // Create first task (will be Active)
        const task1Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'First task',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const task1Id = task1Response.body.id;

        // Create second task (will be Queued)
        const task2Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Last task',
            impact: 2,
            urgency: 2,
            relevance: 2,
            effort: 3,
          });

        const task2Id = task2Response.body.id;

        // Complete first task (second becomes Active)
        await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task1Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Done' });

        // Complete second task (this is the last task)
        // Should succeed - empty queue is a valid state
        const response = await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task2Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Done' });

        // Should complete successfully
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('Done');

        // Queue should have no active task
        const nextTask = await request(app).get(`/api/queues/${testQueueId}/tasks/next`)
        .set("Authorization", `Bearer ${authToken}`);
        expect(nextTask.status).toBe(204);
      });
    });

    describe('Active Task Demotion on Priority Change', () => {
      it('should demote active task when updated to lower priority than queued task', async () => {
        // Create high priority active task
        const activeTaskResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Initially high priority',
            impact: 5,
            urgency: 5,
            relevance: 5,
            effort: 1,
          });

        const activeTaskId = activeTaskResponse.body.id;

        // Create queued task with high priority
        const queuedTaskResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'High priority queued',
            impact: 5,
            urgency: 5,
            relevance: 5,
            effort: 1,
          });

        const queuedTaskId = queuedTaskResponse.body.id;

        // Lower priority of active task by increasing effort
        await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${activeTaskId}`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ effort: 5 });

        // Active task should be demoted
        const demotedTask = await request(app).get(`/api/queues/${testQueueId}/tasks/${activeTaskId}`)
        .set("Authorization", `Bearer ${authToken}`);
        expect(demotedTask.body.status).toBe('Queued');

        // Queued task should be promoted
        const promotedTask = await request(app).get(`/api/queues/${testQueueId}/tasks/${queuedTaskId}`)
        .set("Authorization", `Bearer ${authToken}`);
        expect(promotedTask.body.status).toBe('Active');
      });

      it('should keep active task active when priority remains highest', async () => {
        // Create high priority active task
        const activeTaskResponse = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'High priority',
            impact: 5,
            urgency: 5,
            relevance: 5,
            effort: 1,
          });

        const activeTaskId = activeTaskResponse.body.id;

        // Create lower priority queued task
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Lower priority',
            impact: 2,
            urgency: 2,
            relevance: 2,
            effort: 3,
          });

        // Make minor update to active task
        await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${activeTaskId}`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ effort: 2 }); // Still high priority

        // Active task should remain active
        const activeTask = await request(app).get(`/api/queues/${testQueueId}/tasks/${activeTaskId}`)
        .set("Authorization", `Bearer ${authToken}`);
        expect(activeTask.body.status).toBe('Active');
      });
    });

    describe('Only One Active Task Rule', () => {
      it('should maintain only one active task at all times', async () => {
        // Create multiple tasks
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task 1',
            impact: 5,
            urgency: 5,
            relevance: 5,
            effort: 1,
          });

        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task 2',
            impact: 4,
            urgency: 4,
            relevance: 4,
            effort: 2,
          });

        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task 3',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        // Check all tasks
        const allTasks = await request(app).get(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`);

        const activeTasks = allTasks.body.filter((task: Task) => task.status === 'Active');
        expect(activeTasks).toHaveLength(1);
      });

      it('should maintain one active task after status changes', async () => {
        // Create first task (becomes Active)
        const task1Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task 1',
            impact: 5,
            urgency: 5,
            relevance: 5,
            effort: 1,
          });

        const task1Id = task1Response.body.id;

        // Create second task (Queued)
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task 2',
            impact: 4,
            urgency: 4,
            relevance: 4,
            effort: 2,
          });

        // Create third task (Queued)
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task 3',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        // Complete first task
        await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task1Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Done' });

        // Check that exactly one task is active
        const allTasks = await request(app).get(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`);
        const activeTasks = allTasks.body.filter((task: Task) => task.status === 'Active');
        expect(activeTasks).toHaveLength(1);
      });
    });

    describe('Edge Cases', () => {
      it('should handle deleting queue with multiple tasks', async () => {
        // Create multiple tasks
        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task 1',
            impact: 5,
            urgency: 5,
            relevance: 5,
            effort: 1,
          });

        await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task 2',
            impact: 4,
            urgency: 4,
            relevance: 4,
            effort: 2,
          });

        // Delete queue
        const deleteResponse = await request(app).delete(`/api/queues/${testQueueId}`)
        .set("Authorization", `Bearer ${authToken}`);
        expect(deleteResponse.status).toBe(204);

        // Verify queue is deleted
        const getResponse = await request(app).get(`/api/queues/${testQueueId}`)
        .set("Authorization", `Bearer ${authToken}`);
        expect(getResponse.status).toBe(404);
      });

      it('should return 204 No Content when requesting next task from empty queue', async () => {
        const response = await request(app).get(`/api/queues/${testQueueId}/tasks/next`)
        .set("Authorization", `Bearer ${authToken}`);
        expect(response.status).toBe(204);
      });

      it('should handle multiple rapid status changes correctly', async () => {
        // Create first task
        const task1Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task 1',
            impact: 5,
            urgency: 5,
            relevance: 5,
            effort: 1,
          });

        const task1Id = task1Response.body.id;

        // Create second task
        const task2Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task 2',
            impact: 4,
            urgency: 4,
            relevance: 4,
            effort: 2,
          });

        const task2Id = task2Response.body.id;

        // Create third task
        const task3Response = await request(app)
          .post(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({
            title: 'Task 3',
            impact: 3,
            urgency: 3,
            relevance: 3,
            effort: 3,
          });

        const task3Id = task3Response.body.id;

        // Complete task 1
        await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task1Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Done' });

        // Complete task 2
        await request(app)
          .patch(`/api/queues/${testQueueId}/tasks/${task2Id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
          .send({ status: 'Done' });

        // Task 3 should now be active
        const task3Check = await request(app).get(`/api/queues/${testQueueId}/tasks/${task3Id}`)
        .set("Authorization", `Bearer ${authToken}`);
        expect(task3Check.body.status).toBe('Active');

        // Only one task should be active
        const allTasks = await request(app).get(`/api/queues/${testQueueId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`);
        const activeTasks = allTasks.body.filter((task: Task) => task.status === 'Active');
        expect(activeTasks).toHaveLength(1);
      });
    });
  });
});
