import { describe, it, expect } from 'vitest';
import {
  UserSchema,
  CreateUserSchema,
  LoginSchema,
  UpdateUserSchema,
  toUserResponse,
  type User,
} from '../src/models/user.js';

describe('User Model Validation', () => {
  describe('UserSchema', () => {
    it('should validate a valid user object', () => {
      const validUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: '2026-04-01T10:00:00.000Z',
        updated_at: '2026-04-01T10:00:00.000Z',
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should reject user with invalid email', () => {
      const invalidUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'invalid-email',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: '2026-04-01T10:00:00.000Z',
        updated_at: '2026-04-01T10:00:00.000Z',
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject user with invalid UUID', () => {
      const invalidUser = {
        id: 'not-a-uuid',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: '2026-04-01T10:00:00.000Z',
        updated_at: '2026-04-01T10:00:00.000Z',
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should convert email to lowercase', () => {
      const user = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'TEST@EXAMPLE.COM',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: '2026-04-01T10:00:00.000Z',
        updated_at: '2026-04-01T10:00:00.000Z',
      };

      const result = UserSchema.parse(user);
      expect(result.email).toBe('test@example.com');
    });

    it('should reject user with missing required fields', () => {
      const invalidUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateUserSchema', () => {
    it('should validate a valid user creation request', () => {
      const validInput = {
        email: 'test@example.com',
        password: 'securepassword123',
        name: 'Test User',
      };

      const result = CreateUserSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject password shorter than 8 characters', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'short',
        name: 'Test User',
      };

      const result = CreateUserSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject password longer than 100 characters', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'a'.repeat(101),
        name: 'Test User',
      };

      const result = CreateUserSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const invalidInput = {
        email: 'not-an-email',
        password: 'securepassword123',
        name: 'Test User',
      };

      const result = CreateUserSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'securepassword123',
        name: '',
      };

      const result = CreateUserSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert email to lowercase', () => {
      const input = {
        email: 'TEST@EXAMPLE.COM',
        password: 'securepassword123',
        name: 'Test User',
      };

      const result = CreateUserSchema.parse(input);
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('LoginSchema', () => {
    it('should validate a valid login request', () => {
      const validInput = {
        email: 'test@example.com',
        password: 'anypassword',
      };

      const result = LoginSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidInput = {
        email: 'not-an-email',
        password: 'anypassword',
      };

      const result = LoginSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: '',
      };

      const result = LoginSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert email to lowercase', () => {
      const input = {
        email: 'TEST@EXAMPLE.COM',
        password: 'anypassword',
      };

      const result = LoginSchema.parse(input);
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('UpdateUserSchema', () => {
    it('should validate update with single field', () => {
      const validInput = {
        name: 'New Name',
      };

      const result = UpdateUserSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate update with multiple fields', () => {
      const validInput = {
        email: 'newemail@example.com',
        name: 'New Name',
      };

      const result = UpdateUserSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject empty update object', () => {
      const invalidInput = {};

      const result = UpdateUserSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject password shorter than 8 characters', () => {
      const invalidInput = {
        password: 'short',
      };

      const result = UpdateUserSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert email to lowercase', () => {
      const input = {
        email: 'NEW@EXAMPLE.COM',
      };

      const result = UpdateUserSchema.parse(input);
      expect(result.email).toBe('new@example.com');
    });
  });

  describe('toUserResponse', () => {
    it('should remove password_hash from user object', () => {
      const user: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        created_at: '2026-04-01T10:00:00.000Z',
        updated_at: '2026-04-01T10:00:00.000Z',
      };

      const response = toUserResponse(user);

      expect(response).not.toHaveProperty('password_hash');
      expect(response.id).toBe(user.id);
      expect(response.email).toBe(user.email);
      expect(response.name).toBe(user.name);
      expect(response.created_at).toBe(user.created_at);
      expect(response.updated_at).toBe(user.updated_at);
    });
  });
});
