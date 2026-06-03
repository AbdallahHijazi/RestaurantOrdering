export const ApplicationRoles = {
  RestaurantOwner: 'RestaurantOwner',
  RestaurantManager: 'RestaurantManager',
  KitchenManager: 'KitchenManager',
} as const;

export type ApplicationRole =
  (typeof ApplicationRoles)[keyof typeof ApplicationRoles];

export const SUPPORTED_APPLICATION_ROLES: readonly ApplicationRole[] = [
  ApplicationRoles.RestaurantOwner,
  ApplicationRoles.RestaurantManager,
  ApplicationRoles.KitchenManager,
];

export function isApplicationRole(value: string): value is ApplicationRole {
  return (SUPPORTED_APPLICATION_ROLES as readonly string[]).includes(value);
}

export function getDefaultRouteForRole(role: ApplicationRole): string {
  switch (role) {
    case ApplicationRoles.KitchenManager:
      return '/kitchen';
    case ApplicationRoles.RestaurantOwner:
    case ApplicationRoles.RestaurantManager:
      return '/admin/dashboard';
    default:
      return '/login';
  }
}
