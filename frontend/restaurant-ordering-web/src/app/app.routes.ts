import { Routes } from '@angular/router';
import { ApplicationRoles } from './core/auth/application-roles';
import { authGuard } from './core/auth/auth.guard';
import { guestGuard } from './core/auth/guest.guard';
import { roleGuard } from './core/auth/role.guard';

const adminRoles = [ApplicationRoles.RestaurantOwner, ApplicationRoles.RestaurantManager];

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'r/demo/menu',
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'r/:slug',
    loadComponent: () =>
      import('./core/layouts/public-layout/public-layout').then((m) => m.PublicLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'menu',
      },
      {
        path: 'menu',
        loadComponent: () =>
          import('./features/public-menu/pages/menu-page/menu-page').then((m) => m.MenuPage),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    canActivateChild: [roleGuard],
    data: {
      roles: adminRoles,
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: '',
        loadComponent: () =>
          import('./core/layouts/profile-console-layout/profile-console-layout').then(
            (m) => m.ProfileConsoleLayout,
          ),
        children: [
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./features/admin/pages/dashboard-page/dashboard-page').then(
                (m) => m.DashboardPage,
              ),
          },
          {
            path: 'restaurant-profile',
            data: {
              roles: [ApplicationRoles.RestaurantOwner],
            },
            loadComponent: () =>
              import(
                './features/admin/restaurant-profile/pages/restaurant-profile-setup-page/restaurant-profile-setup-page'
              ).then((m) => m.RestaurantProfileSetupPage),
          },
          {
            path: 'orders',
            loadComponent: () =>
              import('./features/admin/pages/admin-orders-page/admin-orders-page').then(
                (m) => m.AdminOrdersPage,
              ),
          },
          {
            path: 'menu',
            loadComponent: () =>
              import('./features/admin/pages/menu-management-page/menu-management-page').then(
                (m) => m.MenuManagementPage,
              ),
          },
          {
            path: 'staff',
            data: {
              roles: [ApplicationRoles.RestaurantOwner],
            },
            loadComponent: () =>
              import('./features/admin/pages/staff-management-page/staff-management-page').then(
                (m) => m.StaffManagementPage,
              ),
          },
          {
            path: 'tables',
            data: {
              roles: [ApplicationRoles.RestaurantOwner],
            },
            loadComponent: () =>
              import('./features/admin/pages/tables-management-page/tables-management-page').then(
                (m) => m.TablesManagementPage,
              ),
          },
        ],
      },
    ],
  },
  {
    path: 'kitchen',
    canActivate: [authGuard, roleGuard],
    data: {
      roles: [ApplicationRoles.KitchenManager],
    },
    loadComponent: () =>
      import('./features/kitchen/pages/kitchen-dashboard-page/kitchen-dashboard-page').then(
        (m) => m.KitchenDashboardPage,
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/pages/not-found-page/not-found-page').then((m) => m.NotFoundPage),
  },
];
