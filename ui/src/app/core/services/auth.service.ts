import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, ReplaySubject, of, catchError } from 'rxjs';
import { User, LoginRequest, LoginResponse } from '../models/user.model';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private tokenService = inject(TokenService);

  private currentUserSubject = new ReplaySubject<User | null>(1);
  public currentUser$ = this.currentUserSubject.asObservable();
  private lastUser: User | null = null;

  private readonly API_URL = '/api/auth';

  constructor() {
    this.currentUser$.subscribe(user => this.lastUser = user);
    // Initialize with null if no token, otherwise wait for getCurrentUser
    if (!this.isAuthenticated()) {
      this.currentUserSubject.next(null);
    }
  }

  /**
   * Login with email and password
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials)
      .pipe(
        tap(response => {
          this.tokenService.setToken(response.token);
          this.currentUserSubject.next(response.user);
        })
      );
  }

  /**
   * Logout the current user
   */
  logout(): void {
    this.tokenService.removeToken();
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  /**
   * Get the current user from the API
   */
  getCurrentUser(): Observable<User | null> {
    if (!this.isAuthenticated()) {
      const obs = of(null);
      obs.subscribe(user => this.currentUserSubject.next(user));
      return obs;
    }

    return this.http.get<User>(`${this.API_URL}/me`)
      .pipe(
        tap(user => this.currentUserSubject.next(user)),
        catchError(() => {
          this.currentUserSubject.next(null);
          return of(null);
        })
      );
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.tokenService.getToken();
    if (!token) {
      return false;
    }

    return !this.tokenService.isTokenExpired();
  }

  /**
   * Get the current user value (synchronous)
   */
  getCurrentUserValue(): User | null {
    return this.lastUser;
  }
}
