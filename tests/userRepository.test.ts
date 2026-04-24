import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { userRepository } from '../src/repositories/userRepository.js';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { User } from '../src/models/user.js';

// Use separate test directory for user data
const TEST_USERS_DIR = path.join(process.cwd(), 'data/users-test');

// Helper function to properly reset repository (clears filesystem and cache)
async function resetRepository() {
  // Clean filesystem
  await fs.rm(TEST_USERS_DIR, { recursive: true, force: true });
  await fs.mkdir(TEST_USERS_DIR, { recursive: true });

  // Access private cache and initialized flag
  const repo = userRepository as any;

  // Clear caches
  repo.cache = new Map();
  repo.emailIndex = new Map();

  // Reset initialized flag
  repo.initialized = false;

  // Re-initialize with test directory
  await userRepository.init();
}

// Helper function to reinitialize repository without clearing filesystem
async function reinitRepository() {
  // Access private cache and initialized flag
  const repo = userRepository as any;

  // Clear caches
  repo.cache = new Map();
  repo.emailIndex = new Map();

  // Reset initialized flag
  repo.initialized = false;

  // Re-initialize with test directory (will load from filesystem)
  await userRepository.init();
}

describe('UserRepository', () => {
  beforeEach(async () => {
    // Set test directory
    process.env.USERS_DIR = TEST_USERS_DIR;
    await resetRepository();
  });

  afterAll(async () => {
    // Clean up test data
    await fs.rm(TEST_USERS_DIR, { recursive: true, force: true });
  });

  describe('init', () => {
    it('should create users directory if it does not exist', async () => {
      await fs.rm(TEST_USERS_DIR, { recursive: true, force: true });
      await resetRepository();

      const stats = await fs.stat(TEST_USERS_DIR);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should load existing users from filesystem', async () => {
      const user: User = {
        id: randomUUID(),
        email: 'existing@example.com',
        password_hash: 'hashed_password',
        name: 'Existing User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await userRepository.save(user);
      await reinitRepository();

      const found = await userRepository.findById(user.id);
      expect(found).toBeDefined();
      expect(found?.email).toBe(user.email);
    });
  });

  describe('save', () => {
    it('should save a user to filesystem', async () => {
      const user: User = {
        id: randomUUID(),
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const saved = await userRepository.save(user);

      expect(saved).toEqual(user);

      // Verify file exists
      const filePath = path.join(TEST_USERS_DIR, `${user.id}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.email).toBe(user.email);
    });

    it('should update cache when saving', async () => {
      const user: User = {
        id: randomUUID(),
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await userRepository.save(user);

      const found = await userRepository.findById(user.id);
      expect(found).toEqual(user);
    });

    it('should update email index when saving', async () => {
      const user: User = {
        id: randomUUID(),
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await userRepository.save(user);

      const found = await userRepository.findByEmail('test@example.com');
      expect(found).toEqual(user);
    });
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      const user: User = {
        id: randomUUID(),
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await userRepository.save(user);

      const found = await userRepository.findById(user.id);
      expect(found).toEqual(user);
    });

    it('should return null if user not found', async () => {
      const found = await userRepository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user if found', async () => {
      const user: User = {
        id: randomUUID(),
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await userRepository.save(user);

      const found = await userRepository.findByEmail('test@example.com');
      expect(found).toEqual(user);
    });

    it('should be case-insensitive', async () => {
      const user: User = {
        id: randomUUID(),
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await userRepository.save(user);

      const found1 = await userRepository.findByEmail('TEST@EXAMPLE.COM');
      const found2 = await userRepository.findByEmail('TeSt@ExAmPlE.cOm');

      expect(found1).toEqual(user);
      expect(found2).toEqual(user);
    });

    it('should return null if user not found', async () => {
      const found = await userRepository.findByEmail('nonexistent@example.com');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return empty array if no users exist', async () => {
      const users = await userRepository.findAll();
      expect(users).toEqual([]);
    });

    it('should return all users', async () => {
      const user1: User = {
        id: randomUUID(),
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        name: 'User 1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const user2: User = {
        id: randomUUID(),
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        name: 'User 2',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await userRepository.save(user1);
      await userRepository.save(user2);

      const users = await userRepository.findAll();
      expect(users).toHaveLength(2);
      expect(users.some(u => u.id === user1.id)).toBe(true);
      expect(users.some(u => u.id === user2.id)).toBe(true);
    });

    it('should return users sorted by created_at', async () => {
      const user1: User = {
        id: randomUUID(),
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        name: 'User 1',
        created_at: '2026-04-01T10:00:00.000Z',
        updated_at: '2026-04-01T10:00:00.000Z',
      };

      const user2: User = {
        id: randomUUID(),
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        name: 'User 2',
        created_at: '2026-04-02T10:00:00.000Z',
        updated_at: '2026-04-02T10:00:00.000Z',
      };

      await userRepository.save(user2);
      await userRepository.save(user1);

      const users = await userRepository.findAll();
      expect(users[0].id).toBe(user1.id);
      expect(users[1].id).toBe(user2.id);
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const user: User = {
        id: randomUUID(),
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await userRepository.save(user);

      const updated = await userRepository.update(user.id, {
        name: 'Updated Name',
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.email).toBe(user.email);
    });

    it('should update email and email index', async () => {
      const user: User = {
        id: randomUUID(),
        email: 'old@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await userRepository.save(user);

      const updated = await userRepository.update(user.id, {
        email: 'new@example.com',
      });

      expect(updated?.email).toBe('new@example.com');

      // Old email should not find user
      const foundOld = await userRepository.findByEmail('old@example.com');
      expect(foundOld).toBeNull();

      // New email should find user
      const foundNew = await userRepository.findByEmail('new@example.com');
      expect(foundNew?.id).toBe(user.id);
    });

    it('should update updated_at timestamp', async () => {
      const user: User = {
        id: randomUUID(),
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: '2026-04-01T10:00:00.000Z',
        updated_at: '2026-04-01T10:00:00.000Z',
      };

      await userRepository.save(user);

      const updated = await userRepository.update(user.id, {
        name: 'Updated Name',
      });

      expect(updated?.updated_at).not.toBe(user.updated_at);
    });

    it('should preserve created_at timestamp', async () => {
      const user: User = {
        id: randomUUID(),
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: '2026-04-01T10:00:00.000Z',
        updated_at: '2026-04-01T10:00:00.000Z',
      };

      await userRepository.save(user);

      const updated = await userRepository.update(user.id, {
        name: 'Updated Name',
      });

      expect(updated?.created_at).toBe(user.created_at);
    });

    it('should return null if user not found', async () => {
      const updated = await userRepository.update('non-existent-id', {
        name: 'Updated Name',
      });

      expect(updated).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove user from filesystem', async () => {
      const user: User = {
        id: randomUUID(),
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await userRepository.save(user);

      const removed = await userRepository.remove(user.id);
      expect(removed).toBe(true);

      // Verify file is deleted
      const filePath = path.join(TEST_USERS_DIR, `${user.id}.json`);
      await expect(fs.access(filePath)).rejects.toThrow();
    });

    it('should remove user from cache', async () => {
      const user: User = {
        id: randomUUID(),
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await userRepository.save(user);
      await userRepository.remove(user.id);

      const found = await userRepository.findById(user.id);
      expect(found).toBeNull();
    });

    it('should remove user from email index', async () => {
      const user: User = {
        id: randomUUID(),
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await userRepository.save(user);
      await userRepository.remove(user.id);

      const found = await userRepository.findByEmail('test@example.com');
      expect(found).toBeNull();
    });

    it('should return false if user not found', async () => {
      const removed = await userRepository.remove('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('emailExists', () => {
    it('should return true if email exists', async () => {
      const user: User = {
        id: randomUUID(),
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await userRepository.save(user);

      const exists = await userRepository.emailExists('test@example.com');
      expect(exists).toBe(true);
    });

    it('should be case-insensitive', async () => {
      const user: User = {
        id: randomUUID(),
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await userRepository.save(user);

      const exists1 = await userRepository.emailExists('TEST@EXAMPLE.COM');
      const exists2 = await userRepository.emailExists('TeSt@ExAmPlE.cOm');

      expect(exists1).toBe(true);
      expect(exists2).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      const exists = await userRepository.emailExists('nonexistent@example.com');
      expect(exists).toBe(false);
    });
  });
});
