import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import { AuthService } from './auth.service';
import { AuthSessionService } from './auth-session.service';

export function isTrustedAdminApiRequest(requestUrl: string, apiBaseUrl: string): boolean {
  try {
    let path: string;

    if (requestUrl.startsWith('http://') || requestUrl.startsWith('https://')) {
      const trustedBase = new URL(apiBaseUrl);
      const target = new URL(requestUrl);

      if (target.origin !== trustedBase.origin) {
        return false;
      }

      path = target.pathname;
    } else {
      path = requestUrl.split('?')[0] ?? requestUrl;
    }

    if (path.includes('/api/v1/auth/login') || path.includes('/api/v1/public/')) {
      return false;
    }

    return path.includes('/api/v1/admin/');
  } catch {
    return false;
  }
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const sessionService = inject(AuthSessionService);
  const shouldAttach = isTrustedAdminApiRequest(request.url, API_BASE_URL);

  const requestWithAuth =
    shouldAttach && sessionService.getAccessToken()
      ? request.clone({
          setHeaders: {
            Authorization: `Bearer ${sessionService.getAccessToken()}`,
          },
        })
      : request;

  return next(requestWithAuth).pipe(
    catchError((error: unknown) => {
      if (
        shouldAttach &&
        error instanceof HttpErrorResponse &&
        error.status === 401
      ) {
        authService.logout();
      }

      return throwError(() => error);
    }),
  );
};
