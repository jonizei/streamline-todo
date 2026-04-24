import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { LoginResponse } from '../../../core/models/user.model';
import { HttpErrorResponse } from '@angular/common/http';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: any;
  let mockRouter: any;
  let mockActivatedRoute: any;

  const mockLoginResponse: LoginResponse = {
    token: 'mock-token',
    user: {
      id: 'u1',
      email: 'test@example.com',
      name: 'Test User',
      created_at: '2026-04-10',
      updated_at: '2026-04-10'
    }
  };

  beforeEach(async () => {
    mockAuthService = {
      login: vi.fn()
    };

    mockRouter = {
      navigate: vi.fn()
    };

    mockActivatedRoute = {
      snapshot: {
        queryParams: {}
      }
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    expect(component.loginForm).toBeDefined();
    expect(component.loginForm.get('email')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
  });

  describe('form validation', () => {
    it('should require email', () => {
      const email = component.loginForm.get('email');
      email?.setValue('');

      expect(email?.hasError('required')).toBe(true);
      expect(email?.valid).toBe(false);
    });

    it('should validate email format', () => {
      const email = component.loginForm.get('email');

      email?.setValue('invalid-email');
      expect(email?.hasError('email')).toBe(true);
      expect(email?.valid).toBe(false);

      email?.setValue('valid@example.com');
      expect(email?.hasError('email')).toBe(false);
      expect(email?.valid).toBe(true);
    });

    it('should require password', () => {
      const password = component.loginForm.get('password');
      password?.setValue('');

      expect(password?.hasError('required')).toBe(true);
      expect(password?.valid).toBe(false);
    });

    it('should enforce minimum password length', () => {
      const password = component.loginForm.get('password');

      password?.setValue('short');
      expect(password?.hasError('minlength')).toBe(true);
      expect(password?.valid).toBe(false);

      password?.setValue('longenough');
      expect(password?.hasError('minlength')).toBe(false);
      expect(password?.valid).toBe(true);
    });

    it('should mark form as invalid when fields are invalid', () => {
      component.loginForm.get('email')?.setValue('');
      component.loginForm.get('password')?.setValue('short');

      expect(component.loginForm.valid).toBe(false);
    });

    it('should mark form as valid when all fields are valid', () => {
      component.loginForm.get('email')?.setValue('test@example.com');
      component.loginForm.get('password')?.setValue('validpassword');

      expect(component.loginForm.valid).toBe(true);
    });
  });

  describe('onSubmit', () => {
    it('should not submit when form is invalid', () => {
      component.loginForm.get('email')?.setValue('');
      component.loginForm.get('password')?.setValue('');

      component.onSubmit();

      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should mark all fields as touched when submitting invalid form', () => {
      component.loginForm.get('email')?.setValue('');
      component.loginForm.get('password')?.setValue('');

      component.onSubmit();

      expect(component.loginForm.get('email')?.touched).toBe(true);
      expect(component.loginForm.get('password')?.touched).toBe(true);
    });

    it('should call authService.login with form values on valid submit', () => {
      component.loginForm.get('email')?.setValue('test@example.com');
      component.loginForm.get('password')?.setValue('password123');

      mockAuthService.login.mockReturnValue(of(mockLoginResponse));

      component.onSubmit();

      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should set loading state during login', () => {
      component.loginForm.get('email')?.setValue('test@example.com');
      component.loginForm.get('password')?.setValue('password123');

      mockAuthService.login.mockReturnValue(of(mockLoginResponse));

      expect(component.isLoading).toBe(false);
      component.onSubmit();
      expect(component.isLoading).toBe(true);
    });

    it('should navigate to dashboard on successful login', () => {
      component.loginForm.get('email')?.setValue('test@example.com');
      component.loginForm.get('password')?.setValue('password123');

      mockAuthService.login.mockReturnValue(of(mockLoginResponse));

      component.onSubmit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should navigate to returnUrl when provided', () => {
      mockActivatedRoute.snapshot.queryParams['returnUrl'] = '/queues/q1';
      component.ngOnInit(); // Re-initialize to pick up the returnUrl

      component.loginForm.get('email')?.setValue('test@example.com');
      component.loginForm.get('password')?.setValue('password123');

      mockAuthService.login.mockReturnValue(of(mockLoginResponse));

      component.onSubmit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/queues/q1']);
    });

    it('should display error message on 401 Unauthorized', () => {
      component.loginForm.get('email')?.setValue('test@example.com');
      component.loginForm.get('password')?.setValue('wrongpassword');

      const error = new HttpErrorResponse({ status: 401 });
      mockAuthService.login.mockReturnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage).toBe('Invalid email or password');
      expect(component.isLoading).toBe(false);
    });

    it('should display connection error on status 0', () => {
      component.loginForm.get('email')?.setValue('test@example.com');
      component.loginForm.get('password')?.setValue('password123');

      const error = new HttpErrorResponse({ status: 0 });
      mockAuthService.login.mockReturnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage).toBe('Unable to connect to the server');
      expect(component.isLoading).toBe(false);
    });

    it('should display generic error message for other errors', () => {
      component.loginForm.get('email')?.setValue('test@example.com');
      component.loginForm.get('password')?.setValue('password123');

      const error = new HttpErrorResponse({ status: 500, error: { message: 'Server error' } });
      mockAuthService.login.mockReturnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage).toBe('Server error');
      expect(component.isLoading).toBe(false);
    });

    it('should clear error message on new submit attempt', () => {
      component.errorMessage = 'Previous error';
      component.loginForm.get('email')?.setValue('test@example.com');
      component.loginForm.get('password')?.setValue('password123');

      mockAuthService.login.mockReturnValue(of(mockLoginResponse));

      component.onSubmit();

      expect(component.errorMessage).toBe('');
    });
  });

  describe('form getters', () => {
    it('should provide email getter', () => {
      expect(component.email).toBe(component.loginForm.get('email'));
    });

    it('should provide password getter', () => {
      expect(component.password).toBe(component.loginForm.get('password'));
    });
  });
});
