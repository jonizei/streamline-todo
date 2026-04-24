import { describe, it, expect, beforeAll } from 'vitest';
import { hashPassword, comparePassword } from '../src/utils/password.js';
import { generateToken, verifyToken } from '../src/utils/jwt.js';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'mySecurePassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate bcrypt hash format', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);

      // Bcrypt hashes start with $2a$, $2b$, or $2y$
      expect(hash).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);

      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'mySecurePassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await hashPassword(password);

      const result = await comparePassword(wrongPassword, hash);
      expect(result).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);

      const result = await comparePassword('MYSECUREPASSWORD123', hash);
      expect(result).toBe(false);
    });

    it('should return false for empty password', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);

      const result = await comparePassword('', hash);
      expect(result).toBe(false);
    });
  });
});

describe('JWT Utilities', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
      };

      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate tokens that can be verified independently', () => {
      const payload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
      };

      const token1 = generateToken(payload);
      const token2 = generateToken(payload);

      // Both tokens should be valid and decode to the same payload
      const decoded1 = verifyToken(token1);
      const decoded2 = verifyToken(token2);

      expect(decoded1.userId).toBe(payload.userId);
      expect(decoded1.email).toBe(payload.email);
      expect(decoded2.userId).toBe(payload.userId);
      expect(decoded2.email).toBe(payload.email);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const payload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
      };

      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyToken(invalidToken)).toThrow('Invalid token');
    });

    it('should throw error for malformed token', () => {
      const malformedToken = 'notajwt';

      expect(() => verifyToken(malformedToken)).toThrow();
    });

    it('should throw error for empty token', () => {
      expect(() => verifyToken('')).toThrow();
    });

    it('should throw error for tampered token', () => {
      const payload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
      };

      const token = generateToken(payload);
      // Tamper with the token by changing one character
      const tamperedToken = token.slice(0, -5) + 'XXXXX';

      expect(() => verifyToken(tamperedToken)).toThrow();
    });
  });

  describe('Token round-trip', () => {
    it('should successfully encode and decode user data', () => {
      const originalPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
      };

      const token = generateToken(originalPayload);
      const decodedPayload = verifyToken(token);

      expect(decodedPayload.userId).toBe(originalPayload.userId);
      expect(decodedPayload.email).toBe(originalPayload.email);
    });

    it('should preserve email case in token', () => {
      const payload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'Test@Example.COM',
      };

      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.email).toBe(payload.email);
    });
  });
});
