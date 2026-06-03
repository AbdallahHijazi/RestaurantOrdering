import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ApplicationRoles } from '../../auth/application-roles';
import { AuthService } from '../../auth/auth.service';
import { LocaleService } from '../../localization/locale';
import { ADMIN_SHELL_MOCK } from './admin-shell.config';

type AdminPageKey = 'dashboard' | 'restaurantProfile' | 'staff';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly localeService = inject(LocaleService);
  protected readonly authService = inject(AuthService);

  protected readonly drawerOpen = signal(false);
  protected readonly currentPath = signal(this.router.url);

  protected readonly systemName = computed(
    () => ADMIN_SHELL_MOCK.systemName[this.localeService.locale()],
  );
  protected readonly restaurantName = computed(
    () => ADMIN_SHELL_MOCK.restaurantName[this.localeService.locale()],
  );
  protected readonly pageTitle = computed(() => {
    const key = this.resolvePageKey(this.currentPath());
    const titleKey =
      key === 'staff'
        ? 'adminPageStaff'
        : key === 'restaurantProfile'
          ? 'adminPageRestaurantProfile'
          : 'adminPageDashboard';
    return this.localeService.uiText(titleKey);
  });
  protected readonly isOwner = computed(() =>
    this.authService.hasAnyRole(ApplicationRoles.RestaurantOwner),
  );
  protected readonly roleLabel = computed(() => {
    const role = this.authService.currentRole();
    if (role === ApplicationRoles.RestaurantOwner) {
      return this.localeService.uiText('adminRoleOwner');
    }
    if (role === ApplicationRoles.RestaurantManager) {
      return this.localeService.uiText('adminRoleManager');
    }
    return role ?? '';
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.currentPath.set(event.urlAfterRedirects);
        this.drawerOpen.set(false);
      });
  }

  protected toggleDrawer(): void {
    this.drawerOpen.update((open) => !open);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  protected setLocale(locale: 'ar' | 'en'): void {
    this.localeService.setLocale(locale);
  }

  protected logout(): void {
    this.authService.logout();
  }

  private resolvePageKey(url: string): AdminPageKey {
    if (url.includes('staff')) {
      return 'staff';
    }

    return url.includes('restaurant-profile') ? 'restaurantProfile' : 'dashboard';
  }
}
