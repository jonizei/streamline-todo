import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { User, LoginRequest, LoginResponse } from '../models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let mockHttpClient: any;
  let mockRouter: any;
  let mockTokenService: any;

  const mockUser: User = {
    id: 'u1',
    email: 'test@example.com',
    name: 'Test User',
    created_at: '2026-04-10',
    updated_at: '2026-04-10'
  };

  const mockLoginResponse: LoginResponse = {
    token: 'mock-jwt-token',
    user: mockUser
  };

  beforeEach(() => {
    mockHttpClient = {
      post: vi.fn(),
      get: vi.fn()
    };

    mockRouter = {
      navigate: vi.fn()
    };

    mockTokenService = {
      setToken: vi.fn(),
      getToken: vi.fn(),
      removeToken: vi.fn(),
      isTokenExpired: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: 'HttpClient', useValue: mockHttpClient },
        { provide: Router, useValue: mockRouter },
        { provide: TokenService, useValue: mockTokenService }
      ]
    });

    service = TestBed.inject(AuthService);
    (service as any).http = mockHttpClient;
    (service as any).router = mockRouter;
    (service as any).tokenService = mockTokenService;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should login successfully and store token', () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockHttpClient.post.mockReturnValue(of(mockLoginResponse));

      service.login(credentials).subscribe(response => {
        expect(response).toEqual(mockLoginResponse);
        expect(mockHttpClient.post).toHaveBeenCalledWith('/api/auth/login', credentials);
        expect(mockTokenService.setToken).toHaveBeenCalledWith('mock-jwt-token');
        expect(service.getCurrentUserValue()).toEqual(mockUser);
      });
    });

    it('should update currentUser$ on successful login', () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockHttpClient.post.mockReturnValue(of(mockLoginResponse));
      service.login(credentials).subscribe();

      service.currentUser$.subscribe(user => {
        if (user) {
          expect(user).toEqual(mockUser);
        }
      });
    });

    it('should handle login error', () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      mockHttpClient.post.mockReturnValue(throwError(() => new Error('Unauthorized')));

      service.login(credentials).subscribe({
        error: (error) => {
          expect(error.message).toBe('Unauthorized');
          expect(mockTokenService.setToken).not.toHaveBeenCalled();
        }
      });
    });
  });

  describe('logout', () => {
    it('should clear token and user state', () => {
      service.logout();

      expect(mockTokenService.removeToken).toHaveBeenCalled();
      expect(service.getCurrentUserValue()).toBeNull();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should navigate to login page', () => {
      service.logout();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should update currentUser$ to null', () => {
      mockHttpClient.post.mockReturnValue(of(mockLoginResponse));
      service.login({ email: 'test@example.com', password: 'pass' }).subscribe();

      service.logout();

      service.currentUser$.subscribe(user => {
        expect(user).toBeNull();
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user from API', () => {
      mockTokenService.getToken.mockReturnValue('valid-token');
      mockTokenService.isTokenExpired.mockReturnValue(false);
      mockHttpClient.get.mockReturnValue(of(mockUser));

      service.getCurrentUser().subscribe(user => {
        expect(user).toEqual(mockUser);
        expect(mockHttpClient.get).toHaveBeenCalledWith('/api/auth/me');
        expect(service.getCurrentUserValue()).toEqual(mockUser);
      });
    });

    it('should return null observable when not authenticated', () => {
      mockTokenService.getToken.mockReturnValue(null);

      service.getCurrentUser().subscribe(user => {
        expect(user).toBeNull();
        expect(mockHttpClient.get).not.toHaveBeenCalled();
      });
    });

    it('should update currentUser$ when user is fetched', () => {
      mockTokenService.getToken.mockReturnValue('valid-token');
      mockTokenService.isTokenExpired.mockReturnValue(false);
      mockHttpClient.get.mockReturnValue(of(mockUser));

      service.getCurrentUser().subscribe();

      service.currentUser$.subscribe(user => {
        if (user) {
          expect(user).toEqual(mockUser);
        }
      });
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token is valid', () => {
      mockTokenService.getToken.mockReturnValue('valid-token');
      mockTokenService.isTokenExpired.mockReturnValue(false);

      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false when no token exists', () => {
      mockTokenService.getToken.mockReturnValue(null);

      expect(service.isAuthenticated()).toBe(false);
    });

    it('should return false when token is expired', () => {
      mockTokenService.getToken.mockReturnValue('expired-token');
      mockTokenService.isTokenExpired.mockReturnValue(true);

      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('getCurrentUserValue', () => {
    it('should return current user value synchronously', () => {
      expect(service.getCurrentUserValue()).toBeNull();
    });

    it('should return user after login', () => {
      mockHttpClient.post.mockReturnValue(of(mockLoginResponse));

      service.login({ email: 'test@example.com', password: 'pass' }).subscribe();

      expect(service.getCurrentUserValue()).toEqual(mockUser);
    });
  });
});
