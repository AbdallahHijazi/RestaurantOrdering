import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { resolvePostLoginRoute } from './safe-return-url.util';

export const guestGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }

  const role = auth.currentRole();
  if (!role) {
    auth.logout({ navigate: false });
    return true;
  }

  const returnUrl = route.queryParamMap.get('returnUrl');
  return router.createUrlTree([resolvePostLoginRoute(returnUrl, role)]);
};
