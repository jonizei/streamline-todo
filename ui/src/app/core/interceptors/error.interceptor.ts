import { HttpInterceptorFn, HttpErrorResponse, HttpContextToken } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';
import { ToastService } from '../services/toast.service';

export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokenService = inject(TokenService);
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const skipToast = req.context.get(SKIP_ERROR_TOAST);

      if (!skipToast) {
        let errorMessage = 'An unexpected error occurred';

        if (error.status === 401) {
          errorMessage = 'Session expired. Please login again.';
          tokenService.removeToken();
          router.navigate(['/login']);
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (error.status === 404) {
          errorMessage = 'The requested resource was not found.';
        } else if (error.status === 409) {
          errorMessage = error.error?.message || 'A conflict occurred.';
        } else if (error.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }

        toastService.error(errorMessage);
      } else if (error.status === 401) {
        // Always handle 401 even if toast is skipped
        tokenService.removeToken();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};
