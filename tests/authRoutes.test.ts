import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { promises as fs } from 'fs';
import type { Express } from 'express';

// Test data directory
const TEST_DATA_DIR = process.env.USERS_DIR || 'data/users-test';

// Helper function to reset user repository
async function resetUserRepository() {
  // Clean filesystem
  await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  await fs.mkdir(TEST_DATA_DIR, { recursive: true });

  // Access private properties
  const repo = userRepository as any;

  // Clear caches
  repo.cache = new Map();
  repo.emailIndex = new Map();

  // Reset initialized flag
  repo.initialized = false;

  // Re-initialize
  await userRepository.init();
}

describe('Auth API Integration Tests', () => {
  let app: Express;

  beforeAll(async () => {
    // Clean up any existing test data
    await resetUserRepository();

    // Create Express app
    app = createApp();
  });

  afterAll(async () => {
    // Clean up test data after all tests complete
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Reset repository before each test to ensure test isolation
    await resetUserRepository();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid input', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body.user).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.created_at).toBeDefined();
      expect(response.body.user.updated_at).toBeDefined();
      expect(response.body.user.password_hash).toBeUndefined();
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
    });

    it('should normalize email to lowercase', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'TEST@EXAMPLE.COM',
          password: 'password123',
          name: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject registration with existing email', async () => {
      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'different123',
          name: 'Another User',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Email already registered');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'password123',
          name: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should reject password shorter than 8 characters', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short',
          name: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should reject missing name field', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should reject empty name', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a test user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(response.body.user.password_hash).toBeUndefined();
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
    });

    it('should login with case-insensitive email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'TEST@EXAMPLE.COM',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;

    beforeEach(async () => {
      // Register and get token
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });
      token = response.body.token;
    });

    it('should get current user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.password_hash).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No authorization token provided');
    });

    it('should reject request with invalid token format', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid authorization format');
    });

    it('should reject request with malformed token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired token');
    });
  });

  describe('PATCH /api/auth/me', () => {
    let token: string;

    beforeEach(async () => {
      // Register and get token
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });
      token = response.body.token;
    });

    it('should update user name', async () => {
      const response = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.password_hash).toBeUndefined();
    });

    it('should update user email', async () => {
      const response = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'newemail@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('newemail@example.com');
    });

    it('should update user password', async () => {
      const response = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          password: 'newpassword123',
        });

      expect(response.status).toBe(200);

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'newpassword123',
        });

      expect(loginResponse.status).toBe(200);
    });

    it('should update multiple fields at once', async () => {
      const response = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Name',
          email: 'newemail@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('New Name');
      expect(response.body.email).toBe('newemail@example.com');
    });

    it('should reject update with email already in use', async () => {
      // Register another user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'other@example.com',
          password: 'password123',
          name: 'Other User',
        });

      // Try to update to existing email
      const response = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'other@example.com',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Email already in use');
    });

    it('should reject update with invalid email format', async () => {
      const response = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'not-an-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should reject update with password shorter than 8 characters', async () => {
      const response = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should reject update without token', async () => {
      const response = await request(app)
        .patch('/api/auth/me')
        .send({
          name: 'New Name',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No authorization token provided');
    });

    it('should reject update with empty body', async () => {
      const response = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('Token Validation', () => {
    it('should accept requests with valid token format', async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });

      const token = registerResponse.body.token;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should reject token without Bearer prefix', async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });

      const token = registerResponse.body.token;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', token);

      expect(response.status).toBe(401);
    });

    it('should reject completely invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer totallywrongtoken');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired token');
    });
  });
});
