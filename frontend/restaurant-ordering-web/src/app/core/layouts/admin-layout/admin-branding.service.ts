import { Injectable, computed, inject, signal } from '@angular/core';
import { LocaleService } from '../../localization/locale';
import { ADMIN_SHELL_MOCK } from './admin-shell.config';

export interface AdminBrandingSnapshot {
  logoUrl: string | null;
  coverImageUrl: string | null;
  nameAr: string;
  nameEn: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AdminBrandingService {
  private readonly localeService = inject(LocaleService);

  private readonly logoUrlSignal = signal<string | null>(null);
  private readonly coverImageUrlSignal = signal<string | null>(null);
  private readonly nameArSignal = signal<string | null>(null);
  private readonly nameEnSignal = signal<string | null>(null);
  private readonly logoLoadFailedSignal = signal(false);
  private readonly coverLoadFailedSignal = signal(false);

  readonly logoUrl = this.logoUrlSignal.asReadonly();
  readonly coverImageUrl = this.coverImageUrlSignal.asReadonly();
  readonly logoLoadFailed = this.logoLoadFailedSignal.asReadonly();
  readonly coverLoadFailed = this.coverLoadFailedSignal.asReadonly();

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

  /** Cover image first, then logo — used for compact header avatars. */
  readonly brandAvatarUrl = computed(() => {
    const cover = this.coverImageUrl();
    if (cover && !this.coverLoadFailed()) {
      return cover;
    }

    const logo = this.logoUrl();
    if (logo && !this.logoLoadFailed()) {
      return logo;
    }

    return null;
  });

  updateBranding(snapshot: AdminBrandingSnapshot): void {
    this.logoUrlSignal.set(snapshot.logoUrl);
    this.coverImageUrlSignal.set(snapshot.coverImageUrl);
    this.nameArSignal.set(snapshot.nameAr);
    this.nameEnSignal.set(snapshot.nameEn);
    this.logoLoadFailedSignal.set(false);
    this.coverLoadFailedSignal.set(false);
  }

  onLogoError(): void {
    this.logoLoadFailedSignal.set(true);
  }

  onAvatarError(): void {
    const cover = this.coverImageUrl();
    if (cover && !this.coverLoadFailed()) {
      this.coverLoadFailedSignal.set(true);
      return;
    }

    this.logoLoadFailedSignal.set(true);
  }
}
