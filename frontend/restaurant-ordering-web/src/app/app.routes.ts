import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'r/demo/menu',
  },
  {
    path: 'login',
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
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layouts/admin-layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/pages/dashboard-page/dashboard-page').then(
            (m) => m.DashboardPage,
          ),
      },
      {
        path: 'restaurant-profile',
        loadComponent: () =>
          import(
            './features/admin/restaurant-profile/pages/restaurant-profile-setup-page/restaurant-profile-setup-page'
          ).then((m) => m.RestaurantProfileSetupPage),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/pages/not-found-page/not-found-page').then((m) => m.NotFoundPage),
  },
];
