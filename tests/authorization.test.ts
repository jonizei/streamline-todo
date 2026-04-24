import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { queueRepository } from '../src/repositories/queueRepository.js';
import { taskRepository } from '../src/repositories/taskRepository.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { promises as fs } from 'fs';
import type { Express } from 'express';

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
async function createTestUser(
  app: Express,
  email: string,
  password: string = 'password123'
): Promise<string> {
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      email,
      password,
      name: `User ${email}`,
    });

  return response.body.token;
}

describe('Multi-User Authorization Tests', () => {
  let app: Express;
  let user1Token: string;
  let user2Token: string;
  let user1QueueId: string;
  let user1TaskId: string;

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

    // Create two test users
    user1Token = await createTestUser(app, 'user1@example.com');
    user2Token = await createTestUser(app, 'user2@example.com');

    // Create a queue for user 1
    const queueResponse = await request(app)
      .post('/api/queues')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'User 1 Queue',
        description: 'Queue owned by user 1',
      });

    user1QueueId = queueResponse.body.id;

    // Create a task in user 1's queue
    const taskResponse = await request(app)
      .post(`/api/queues/${user1QueueId}/tasks`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'User 1 Task',
        impact: 3,
        urgency: 3,
        relevance: 3,
        effort: 3,
      });

    user1TaskId = taskResponse.body.id;
  });

  describe('Queue Access Control', () => {
    it('should return 404 when user 2 tries to access user 1 queue', async () => {
      const response = await request(app)
        .get(`/api/queues/${user1QueueId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/queue not found/i);
    });

    it('should return 404 when user 2 tries to update user 1 queue', async () => {
      const response = await request(app)
        .patch(`/api/queues/${user1QueueId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          name: 'Hacked Queue Name',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/queue not found/i);
    });

    it('should return 404 when user 2 tries to delete user 1 queue', async () => {
      const response = await request(app)
        .delete(`/api/queues/${user1QueueId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/queue not found/i);

      // Verify queue still exists for user 1
      const checkResponse = await request(app)
        .get(`/api/queues/${user1QueueId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(checkResponse.status).toBe(200);
    });

    it('should only return queues owned by the authenticated user', async () => {
      // Create queue for user 2
      await request(app)
        .post('/api/queues')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          name: 'User 2 Queue',
        });

      // User 1 should only see their queue
      const user1Response = await request(app)
        .get('/api/queues')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(user1Response.status).toBe(200);
      expect(user1Response.body).toHaveLength(1);
      expect(user1Response.body[0].id).toBe(user1QueueId);

      // User 2 should only see their queue
      const user2Response = await request(app)
        .get('/api/queues')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(user2Response.status).toBe(200);
      expect(user2Response.body).toHaveLength(1);
      expect(user2Response.body[0].name).toBe('User 2 Queue');
    });
  });

  describe('Task Access Control', () => {
    it('should return 404 when user 2 tries to access user 1 task', async () => {
      const response = await request(app)
        .get(`/api/queues/${user1QueueId}/tasks/${user1TaskId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(404);
      // Should return queue not found, not task not found (fail fast)
      expect(response.body.error).toMatch(/queue not found/i);
    });

    it('should return 404 when user 2 tries to update user 1 task', async () => {
      const response = await request(app)
        .patch(`/api/queues/${user1QueueId}/tasks/${user1TaskId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          title: 'Hacked Task',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/queue not found/i);
    });

    it('should return 404 when user 2 tries to update user 1 task status', async () => {
      const response = await request(app)
        .patch(`/api/queues/${user1QueueId}/tasks/${user1TaskId}/status`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          status: 'Done',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/queue not found/i);
    });

    it('should return 404 when user 2 tries to list tasks in user 1 queue', async () => {
      const response = await request(app)
        .get(`/api/queues/${user1QueueId}/tasks`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/queue not found/i);
    });

    it('should return 404 when user 2 tries to get next task from user 1 queue', async () => {
      const response = await request(app)
        .get(`/api/queues/${user1QueueId}/tasks/next`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/queue not found/i);
    });

    it('should return 404 when user 2 tries to create task in user 1 queue', async () => {
      const response = await request(app)
        .post(`/api/queues/${user1QueueId}/tasks`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          title: 'Unauthorized Task',
          impact: 3,
          urgency: 3,
          relevance: 3,
          effort: 3,
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/queue not found/i);

      // Verify task was not created
      const tasksResponse = await request(app)
        .get(`/api/queues/${user1QueueId}/tasks`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(tasksResponse.body).toHaveLength(1); // Only the original task
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 when accessing queues without token', async () => {
      const response = await request(app).get('/api/queues');

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/no authorization token provided/i);
    });

    it('should return 401 when accessing tasks without token', async () => {
      const response = await request(app).get(`/api/queues/${user1QueueId}/tasks`);

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/no authorization token provided/i);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/queues')
        .set('Authorization', 'Bearer invalid-token-12345');

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/invalid or expired token/i);
    });

    it('should return 401 with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/queues')
        .set('Authorization', 'InvalidFormat token123');

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/invalid authorization format/i);
    });
  });

  describe('Data Isolation', () => {
    it('should maintain complete data isolation between users', async () => {
      // User 2 creates their own queue and tasks
      const user2QueueResponse = await request(app)
        .post('/api/queues')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          name: 'User 2 Queue',
        });

      const user2QueueId = user2QueueResponse.body.id;

      const user2TaskResponse = await request(app)
        .post(`/api/queues/${user2QueueId}/tasks`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          title: 'User 2 Task',
          impact: 5,
          urgency: 5,
          relevance: 5,
          effort: 1,
        });

      const user2TaskId = user2TaskResponse.body.id;

      // Verify user 1 can access their data
      const user1Queues = await request(app)
        .get('/api/queues')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(user1Queues.body).toHaveLength(1);
      expect(user1Queues.body[0].id).toBe(user1QueueId);

      const user1Tasks = await request(app)
        .get(`/api/queues/${user1QueueId}/tasks`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(user1Tasks.body).toHaveLength(1);
      expect(user1Tasks.body[0].id).toBe(user1TaskId);

      // Verify user 2 can access their data
      const user2Queues = await request(app)
        .get('/api/queues')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(user2Queues.body).toHaveLength(1);
      expect(user2Queues.body[0].id).toBe(user2QueueId);

      const user2Tasks = await request(app)
        .get(`/api/queues/${user2QueueId}/tasks`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(user2Tasks.body).toHaveLength(1);
      expect(user2Tasks.body[0].id).toBe(user2TaskId);

      // Verify no cross-access
      const user1CannotAccessUser2Queue = await request(app)
        .get(`/api/queues/${user2QueueId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(user1CannotAccessUser2Queue.status).toBe(404);

      const user2CannotAccessUser1Queue = await request(app)
        .get(`/api/queues/${user1QueueId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(user2CannotAccessUser1Queue.status).toBe(404);
    });
  });
});
