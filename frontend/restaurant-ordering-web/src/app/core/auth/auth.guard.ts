import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { sanitizeReturnUrl } from './safe-return-url.util';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  auth.logout({ navigate: false });

  const path = state.url.split('?')[0] ?? state.url;
  const allowedPrefix = path.startsWith('/kitchen') ? '/kitchen' : '/admin';
  const safeReturnUrl = sanitizeReturnUrl(state.url, allowedPrefix);

  return router.createUrlTree(
    ['/login'],
    safeReturnUrl ? { queryParams: { returnUrl: safeReturnUrl } } : {},
  );
};
