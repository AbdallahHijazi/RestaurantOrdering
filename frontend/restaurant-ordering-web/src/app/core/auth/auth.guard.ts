import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from './auth-session.service';
import { sanitizeAdminReturnUrl } from './safe-return-url.util';

export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(AuthSessionService);
  const router = inject(Router);

  if (session.hasValidSession()) {
    return true;
  }

  session.clearSession();

  const safeReturnUrl = sanitizeAdminReturnUrl(state.url);
  return router.createUrlTree(
    ['/login'],
    safeReturnUrl ? { queryParams: { returnUrl: safeReturnUrl } } : {},
  );
};
