import { Component, computed, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ApplicationRoles } from '../../auth/application-roles';
import { AuthService } from '../../auth/auth.service';
import { LocaleService } from '../../localization/locale';
import { AdminBrandingService } from '../admin-layout/admin-branding.service';

@Component({
  selector: 'app-profile-console-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './profile-console-layout.html',
  styleUrl: './profile-console-layout.scss',
})
export class ProfileConsoleLayout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly localeService = inject(LocaleService);
  protected readonly branding = inject(AdminBrandingService);

  private readonly currentPath = signal(this.router.url);

  protected readonly isProfileRoute = computed(() =>
    this.currentPath().includes('/admin/restaurant-profile'),
  );

  protected readonly isOwner = computed(() =>
    this.authService.hasAnyRole(ApplicationRoles.RestaurantOwner),
  );

  protected readonly brandAvatarUrl = this.branding.brandAvatarUrl;
  protected readonly brandInitial = this.branding.brandInitial;

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.currentPath.set(event.urlAfterRedirects);
      });
  }

  protected adminTargetLanguageLabel(): string {
    return this.localeService.locale() === 'ar' ? 'EN' : 'العربية';
  }

  protected adminLanguageAriaLabel(): string {
    return this.localeService.locale() === 'ar'
      ? this.localeService.uiText('adminSwitchToEnglish')
      : this.localeService.uiText('adminSwitchToArabic');
  }

  protected toggleInterfaceLocale(): void {
    this.localeService.setLocale(this.localeService.locale() === 'ar' ? 'en' : 'ar');
  }

  protected logout(): void {
    this.authService.logout();
  }

  protected onAvatarError(): void {
    this.branding.onAvatarError();
  }
}
