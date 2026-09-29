import { Component, computed, effect, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { LocaleService } from '../../../core/localization/locale';
import type { ContentLocale, LocaleMetadata } from '../../../core/localization/locale.types';
import { RestaurantLocaleOptionsService } from '../../../core/localization/restaurant-locale-options.service';

@Component({
  selector: 'app-language-switcher',
  imports: [FormsModule],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.scss',
})
export class LanguageSwitcher {
  readonly restaurantId = input<string | null>(null);
  readonly syncQueryParam = input(false);
  readonly ariaLabel = input('Language switcher');

  protected readonly localeService = inject(LocaleService);
  protected readonly localeOptions = inject(RestaurantLocaleOptionsService);

  private readonly router = inject(Router, { optional: true });
  private readonly route = inject(ActivatedRoute, { optional: true });

  protected readonly selectedLocale = this.localeService.contentLocale;

  protected readonly selectedLocaleMetadata = computed(() =>
    this.findLocaleMetadata(this.selectedLocale()),
  );

  constructor() {
    effect(() => {
      this.localeOptions.loadForRestaurant(this.restaurantId());
    });
  }

  protected optionLabel(locale: LocaleMetadata): string {
    return locale.nativeName?.trim() || locale.displayName?.trim() || locale.code;
  }

  protected directionBadge(locale: LocaleMetadata): string {
    return locale.direction === 'rtl' ? 'RTL' : 'LTR';
  }

  protected onLocaleSelected(localeCode: string): void {
    const normalized = localeCode.trim().toLowerCase() as ContentLocale;
    if (!normalized) {
      return;
    }

    this.localeService.selectLanguage(normalized);

    if (!this.syncQueryParam() || !this.router || !this.route) {
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { lang: normalized },
      queryParamsHandling: 'merge',
    });
  }

  private findLocaleMetadata(code: string): LocaleMetadata | null {
    const normalized = code.trim().toLowerCase();
    return (
      this.localeOptions.enabledLocales().find((locale) => locale.code === normalized) ?? null
    );
  }
}
