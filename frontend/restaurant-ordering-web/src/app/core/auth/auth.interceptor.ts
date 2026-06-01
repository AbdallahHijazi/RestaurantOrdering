import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';
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
  if (!isTrustedAdminApiRequest(request.url, API_BASE_URL)) {
    return next(request);
  }

  const token = inject(AuthSessionService).getAccessToken();
  if (!token) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
