import { Injectable, computed, inject, signal } from '@angular/core';
import { LocaleService } from '../../localization/locale';
import { ADMIN_SHELL_MOCK } from './admin-shell.config';

export interface AdminBrandingSnapshot {
  logoUrl: string | null;
  nameAr: string;
  nameEn: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AdminBrandingService {
  private readonly localeService = inject(LocaleService);

  private readonly logoUrlSignal = signal<string | null>(null);
  private readonly nameArSignal = signal<string | null>(null);
  private readonly nameEnSignal = signal<string | null>(null);
  private readonly logoLoadFailedSignal = signal(false);

  readonly logoUrl = this.logoUrlSignal.asReadonly();
  readonly logoLoadFailed = this.logoLoadFailedSignal.asReadonly();

  readonly restaurantName = computed(() => {
    const locale = this.localeService.locale();
    const nameAr = this.nameArSignal();
    const nameEn = this.nameEnSignal();

    if (locale === 'ar') {
      return nameAr?.trim() || nameEn?.trim() || ADMIN_SHELL_MOCK.restaurantName.ar;
    }

    return nameEn?.trim() || nameAr?.trim() || ADMIN_SHELL_MOCK.restaurantName.en;
  });

  readonly brandInitial = computed(() => {
    const name =
      this.nameArSignal()?.trim() ||
      this.nameEnSignal()?.trim() ||
      ADMIN_SHELL_MOCK.restaurantName.ar;
    return name.charAt(0).toUpperCase();
  });

  updateBranding(snapshot: AdminBrandingSnapshot): void {
    this.logoUrlSignal.set(snapshot.logoUrl);
    this.nameArSignal.set(snapshot.nameAr);
    this.nameEnSignal.set(snapshot.nameEn);
    this.logoLoadFailedSignal.set(false);
  }

  onLogoError(): void {
    this.logoLoadFailedSignal.set(true);
  }
}
