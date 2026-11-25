import {
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { LocaleService } from '../../../core/localization/locale';
import type { ContentLocale, LocaleMetadata } from '../../../core/localization/locale.types';
import { RestaurantLocaleOptionsService } from '../../../core/localization/restaurant-locale-options.service';

@Component({
  selector: 'app-language-switcher',
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
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  protected readonly isOpen = signal(false);

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

  protected localeBadge(locale: LocaleMetadata): string {
    return locale.code.trim().toUpperCase();
  }

  protected toggleDropdown(): void {
    if (this.localeOptions.loading()) {
      return;
    }

    this.isOpen.update((value) => !value);
  }

  protected selectLocale(localeCode: string): void {
    this.onLocaleSelected(localeCode);
    this.isOpen.set(false);
  }

  protected isSelected(locale: LocaleMetadata): boolean {
    return locale.code.trim().toLowerCase() === this.selectedLocale().trim().toLowerCase();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target;

    if (target instanceof Node && !this.elementRef.nativeElement.contains(target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.isOpen.set(false);
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
      this.localeOptions.enabledLocales().find(
        (locale) => locale.code.trim().toLowerCase() === normalized,
      ) ?? null
    );
  }
}