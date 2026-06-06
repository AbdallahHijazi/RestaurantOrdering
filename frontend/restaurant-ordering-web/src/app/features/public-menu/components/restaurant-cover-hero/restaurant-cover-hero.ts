import { Component, computed, inject, input, output, signal } from '@angular/core';
import { LocaleService, type SupportedLocale } from '../../../../core/localization/locale';
import type { RestaurantPublicProfile } from '../../models/public-menu.models';

@Component({
  selector: 'app-restaurant-cover-hero',
  templateUrl: './restaurant-cover-hero.html',
  styleUrl: './restaurant-cover-hero.scss',
})
export class RestaurantCoverHero {
  readonly restaurant = input.required<RestaurantPublicProfile>();
  readonly imageFallback = input<string | null>(null);
  readonly displayLocale = input<SupportedLocale | null>(null);

  readonly exploreMenu = output<void>();

  protected readonly localeService = inject(LocaleService);
  protected readonly coverFailed = signal(false);

  protected readonly activeLocale = computed(
    () => this.displayLocale() ?? this.localeService.locale(),
  );

  protected readonly displayName = computed(() => {
    const locale = this.activeLocale();
    return this.localeService.pickTextForLocale(
      locale,
      { ar: this.restaurant().nameAr, en: this.restaurant().nameEn },
      this.restaurant().nameAr,
    );
  });

  protected readonly displayDescription = computed(() => {
    const locale = this.activeLocale();
    return this.localeService.pickTextForLocale(
      locale,
      {
        ar: this.restaurant().descriptionAr,
        en: this.restaurant().descriptionEn,
      },
      '',
    );
  });

  protected readonly coverSrc = computed(() => {
    if (this.coverFailed()) {
      return this.imageFallback();
    }

    return this.restaurant().coverImageUrl ?? this.imageFallback();
  });

  protected readonly statusLabel = computed(() => {
    const isOpen = this.restaurant().isOpen;
    if (isOpen == null) {
      return null;
    }

    const locale = this.activeLocale();
    return isOpen
      ? this.localeService.uiTextForLocale(locale, 'openNow')
      : this.localeService.uiTextForLocale(locale, 'closedNow');
  });

  protected readonly ctaLabel = computed(() =>
    this.localeService.uiTextForLocale(this.activeLocale(), 'viewMenu'),
  );

  protected onCoverError(): void {
    this.coverFailed.set(true);
  }
}
