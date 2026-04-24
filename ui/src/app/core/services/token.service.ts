import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  exp?: number;
  iat?: number;
  userId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly TOKEN_KEY = 'jwt_token';

  /**
   * Save JWT token to localStorage
   */
  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Retrieve JWT token from localStorage
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Remove JWT token from localStorage
   */
  removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  /**
   * Check if the token is expired
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) {
      return true;
    }

    const expiryDate = this.getTokenExpiryDate();
    if (!expiryDate) {
      return true;
    }

    return expiryDate.getTime() <= Date.now();
  }

  /**
   * Get the expiration date from the token
   */
  getTokenExpiryDate(): Date | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      if (!decoded.exp) {
        return null;
      }

      // JWT exp is in seconds, Date expects milliseconds
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }
}
