import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      })
    });

    TestBed.configureTestingModule({
      providers: [TokenService]
    });

    service = TestBed.inject(TokenService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setToken', () => {
    it('should store token in localStorage', () => {
      const token = 'test-token';
      service.setToken(token);

      expect(localStorage.setItem).toHaveBeenCalledWith('jwt_token', token);
      expect(mockLocalStorage['jwt_token']).toBe(token);
    });
  });

  describe('getToken', () => {
    it('should retrieve token from localStorage', () => {
      mockLocalStorage['jwt_token'] = 'stored-token';

      const token = service.getToken();

      expect(token).toBe('stored-token');
      expect(localStorage.getItem).toHaveBeenCalledWith('jwt_token');
    });

    it('should return null when no token exists', () => {
      const token = service.getToken();

      expect(token).toBeNull();
    });
  });

  describe('removeToken', () => {
    it('should remove token from localStorage', () => {
      mockLocalStorage['jwt_token'] = 'test-token';

      service.removeToken();

      expect(localStorage.removeItem).toHaveBeenCalledWith('jwt_token');
      expect(mockLocalStorage['jwt_token']).toBeUndefined();
    });
  });

  describe('isTokenExpired', () => {
    it('should return true when no token exists', () => {
      expect(service.isTokenExpired()).toBe(true);
    });

    it('should return true when token is expired', () => {
      // Create a token that expired 1 hour ago
      const expiredTime = Math.floor(Date.now() / 1000) - 3600;
      const token = createMockJWT({ exp: expiredTime });
      mockLocalStorage['jwt_token'] = token;

      expect(service.isTokenExpired()).toBe(true);
    });

    it('should return false when token is valid', () => {
      // Create a token that expires 1 hour from now
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const token = createMockJWT({ exp: futureTime });
      mockLocalStorage['jwt_token'] = token;

      expect(service.isTokenExpired()).toBe(false);
    });

    it('should return true when token has no expiry', () => {
      const token = createMockJWT({ userId: 'test' });
      mockLocalStorage['jwt_token'] = token;

      expect(service.isTokenExpired()).toBe(true);
    });

    it('should return true when token is malformed', () => {
      mockLocalStorage['jwt_token'] = 'invalid-token';

      expect(service.isTokenExpired()).toBe(true);
    });
  });

  describe('getTokenExpiryDate', () => {
    it('should return null when no token exists', () => {
      expect(service.getTokenExpiryDate()).toBeNull();
    });

    it('should return correct expiry date', () => {
      const expTime = Math.floor(Date.now() / 1000) + 3600;
      const token = createMockJWT({ exp: expTime });
      mockLocalStorage['jwt_token'] = token;

      const expiryDate = service.getTokenExpiryDate();

      expect(expiryDate).toBeInstanceOf(Date);
      expect(expiryDate?.getTime()).toBe(expTime * 1000);
    });

    it('should return null when token has no expiry', () => {
      const token = createMockJWT({ userId: 'test' });
      mockLocalStorage['jwt_token'] = token;

      expect(service.getTokenExpiryDate()).toBeNull();
    });

    it('should return null when token is malformed', () => {
      mockLocalStorage['jwt_token'] = 'invalid-token';

      expect(service.getTokenExpiryDate()).toBeNull();
    });
  });
});

// Helper function to create a mock JWT token
function createMockJWT(payload: any): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';
  return `${header}.${body}.${signature}`;
}
