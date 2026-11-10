import { Component, computed, inject, input, output, signal } from '@angular/core';
import { pickSecondaryLegacyText } from '../../../../core/localization/content-locale.util';
import { DirectionService } from '../../../../core/localization/direction.service';
import { LocaleService } from '../../../../core/localization/locale';
import type { AdminUiLocale, ContentLocale } from '../../../../core/localization/locale.types';
import type { RestaurantPublicProfile } from '../../models/public-menu.models';

@Component({
  selector: 'app-restaurant-cover-hero',
  templateUrl: './restaurant-cover-hero.html',
  styleUrl: './restaurant-cover-hero.scss',
})
export class RestaurantCoverHero {
  readonly restaurant = input.required<RestaurantPublicProfile>();
  readonly imageFallback = input<string | null>(null);
  readonly displayLocale = input<ContentLocale | null>(null);

  readonly exploreMenu = output<void>();

  protected readonly localeService = inject(LocaleService);
  private readonly directionService = inject(DirectionService);
  protected readonly coverFailed = signal(false);
  protected readonly logoFailed = signal(false);

  protected readonly activeLocale = computed(
    () => this.displayLocale() ?? this.localeService.contentLocale(),
  );

  protected readonly displayName = computed(() => {
    const restaurant = this.restaurant();
    return this.localeService.pickResolvedTextForLocale(
      this.activeLocale(),
      restaurant.name,
      { ar: restaurant.nameAr, en: restaurant.nameEn },
      restaurant.nameAr,
    );
  });

  protected readonly secondaryName = computed(() => {
    const restaurant = this.restaurant();
    return pickSecondaryLegacyText(
      this.activeLocale(),
      { ar: restaurant.nameAr, en: restaurant.nameEn },
      this.displayName(),
      (code) => this.directionService.getDirection(code),
    );
  });

  protected readonly brandInitial = computed(
    () => Array.from(this.displayName().trim())[0] ?? '',
  );

  protected readonly displayDescription = computed(() => {
    const restaurant = this.restaurant();
    return this.localeService.pickResolvedTextForLocale(
      this.activeLocale(),
      restaurant.description,
      { ar: restaurant.descriptionAr, en: restaurant.descriptionEn },
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

    const locale = this.uiLocale();
    return isOpen
      ? this.localeService.uiTextForLocale(locale, 'openNow')
      : this.localeService.uiTextForLocale(locale, 'closedNow');
  });

  protected readonly ctaLabel = computed(() =>
    this.localeService.uiTextForLocale(this.uiLocale(), 'viewMenu'),
  );

  protected onCoverError(): void {
    this.coverFailed.set(true);
  }

  protected onLogoError(): void {
    this.logoFailed.set(true);
  }

  private uiLocale(): AdminUiLocale {
    const locale = this.activeLocale();
    return locale === 'en' ? 'en' : 'ar';
  }
}
