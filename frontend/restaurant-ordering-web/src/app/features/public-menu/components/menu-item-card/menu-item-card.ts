import { Component, computed, inject, input, output, signal } from '@angular/core';
import { LocaleService, type SupportedLocale } from '../../../../core/localization/locale';
import {
  PUBLIC_CART_MAX_QUANTITY,
  type PublicMenuItem,
} from '../../models/public-menu.models';
import { hasValidDiscount } from '../../utils/menu-item-price.util';

@Component({
  selector: 'app-menu-item-card',
  templateUrl: './menu-item-card.html',
  styleUrl: './menu-item-card.scss',
})
export class MenuItemCard {
  readonly item = input.required<PublicMenuItem>();
  readonly currencyCode = input('SAR');
  readonly countryCode = input('SA');
  readonly quantity = input(0);
  readonly imageFallback = input<string | null>(null);
  readonly displayLocale = input<SupportedLocale | null>(null);

  readonly added = output<PublicMenuItem>();
  readonly quantityChange = output<number>();

  protected readonly localeService = inject(LocaleService);
  protected readonly imageFailed = signal(false);
  protected readonly justAdded = signal(false);

  protected readonly ui = this.localeService.ui;

  protected readonly activeLocale = computed(
    () => this.displayLocale() ?? this.localeService.locale(),
  );

  protected readonly displayName = computed(() => {
    const locale = this.activeLocale();
    return this.localeService.pickTextForLocale(
      locale,
      { ar: this.item().nameAr, en: this.item().nameEn },
      this.item().nameAr,
    );
  });

  protected readonly secondaryName = computed(() => {
    const locale = this.activeLocale();
    const item = this.item();
    const secondary =
      locale === 'ar' ? item.nameEn?.trim() : item.nameAr?.trim();

    return secondary && secondary !== this.displayName() ? secondary : '';
  });

  protected readonly displayDescription = computed(() => {
    const locale = this.activeLocale();
    return this.localeService.pickTextForLocale(
      locale,
      { ar: this.item().descriptionAr, en: this.item().descriptionEn },
      '',
    );
  });

  protected readonly displayPrice = computed(() =>
    this.localeService.formatCurrency(
      this.item().price,
      this.currencyCode(),
      this.countryCode(),
    ),
  );

  protected readonly displaySalePrice = computed(() => {
    const item = this.item();
    if (!hasValidDiscount(item.price, item.discountPrice)) {
      return null;
    }

    return this.localeService.formatCurrency(
      item.discountPrice,
      this.currencyCode(),
      this.countryCode(),
    );
  });

  protected readonly imageSrc = computed(() => {
    if (this.imageFailed()) {
      return this.imageFallback() ?? null;
    }

    return this.item().imageUrl ?? this.imageFallback();
  });

  protected onImageError(): void {
    this.imageFailed.set(true);
  }

  protected addItem(): void {
    if (!this.item().isAvailable) {
      return;
    }

    const next = this.quantity() + 1;
    this.quantityChange.emit(next);
    this.added.emit(this.item());
    this.justAdded.set(true);
    window.setTimeout(() => this.justAdded.set(false), 1200);
  }

  protected increment(): void {
    const next = Math.min(PUBLIC_CART_MAX_QUANTITY, this.quantity() + 1);
    this.quantityChange.emit(next);
  }

  protected decrement(): void {
    this.quantityChange.emit(Math.max(0, this.quantity() - 1));
  }
}
