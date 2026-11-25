import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import {
  ApplicationRole,
  getDefaultRouteForRole,
  isApplicationRole,
} from './application-roles';
import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = readAllowedRolesFromRouteTree(route);
  const currentRole = auth.currentRole();

  if (!auth.isAuthenticated() || !currentRole) {
    return router.createUrlTree(['/login']);
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentRole)) {
    return router.createUrlTree([getDefaultRouteForRole(currentRole)]);
  }

  return true;
};

function readAllowedRolesFromRouteTree(route: ActivatedRouteSnapshot): ApplicationRole[] {
  let current: ActivatedRouteSnapshot | null = route;

  while (current) {
    const roles = readAllowedRoles(current.data['roles']);
    if (roles.length > 0) {
      return roles;
    }

    current = current.parent;
  }

  return [];
}

function readAllowedRoles(value: unknown): ApplicationRole[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (role): role is ApplicationRole => typeof role === 'string' && isApplicationRole(role),
  );
}
