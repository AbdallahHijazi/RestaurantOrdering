import { Component, computed, inject, input, output, signal } from '@angular/core';
import { pickSecondaryLegacyText } from '../../../../core/localization/content-locale.util';
import { DirectionService } from '../../../../core/localization/direction.service';
import { LocaleService } from '../../../../core/localization/locale';
import type { ContentLocale } from '../../../../core/localization/locale.types';
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
  readonly displayLocale = input<ContentLocale | null>(null);

  readonly added = output<PublicMenuItem>();
  readonly quantityChange = output<number>();

  protected readonly localeService = inject(LocaleService);
  private readonly directionService = inject(DirectionService);
  protected readonly imageFailed = signal(false);
  protected readonly justAdded = signal(false);

  protected readonly ui = this.localeService.ui;

  protected readonly activeLocale = computed(
    () => this.displayLocale() ?? this.localeService.contentLocale(),
  );

  protected readonly displayName = computed(() => {
    const item = this.item();
    return this.localeService.pickResolvedTextForLocale(
      this.activeLocale(),
      item.name,
      { ar: item.nameAr, en: item.nameEn },
      item.nameAr,
    );
  });

  protected readonly secondaryName = computed(() => {
    const item = this.item();
    return pickSecondaryLegacyText(
      this.activeLocale(),
      { ar: item.nameAr, en: item.nameEn },
      this.displayName(),
      (code) => this.directionService.getDirection(code),
    );
  });

  protected readonly displayDescription = computed(() => {
    const item = this.item();
    return this.localeService.pickResolvedTextForLocale(
      this.activeLocale(),
      item.description,
      { ar: item.descriptionAr, en: item.descriptionEn },
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
