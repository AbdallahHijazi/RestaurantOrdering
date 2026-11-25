import { Component, computed, inject, input, output, signal } from '@angular/core';
import { pickSecondaryLegacyText } from '../../../../core/localization/content-locale.util';
import { DirectionService } from '../../../../core/localization/direction.service';
import { LocaleService } from '../../../../core/localization/locale';
import type { ContentLocale } from '../../../../core/localization/locale.types';
import {
  getMenuItemLabels,
  PUBLIC_CART_MAX_QUANTITY,
  type PublicMenuItem,
} from '../../models/public-menu.models';
import { menuItemPrice } from '../../utils/menu-item-price.util';

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
  readonly sizeQuantityFor = input<(itemId: string, sizeId: string) => number>();
  readonly imageFallback = input<string | null>(null);
  readonly displayLocale = input<ContentLocale | null>(null);

  readonly added = output<PublicMenuItem>();
  readonly sizeAdded = output<{ item: PublicMenuItem; sizeId: string }>();
  readonly quantityChange = output<number>();
  readonly sizeQuantityChange = output<{ sizeId: string; quantity: number }>();

  protected readonly localeService = inject(LocaleService);
  private readonly directionService = inject(DirectionService);
  protected readonly imageFailed = signal(false);
  protected readonly justAdded = signal(false);

  protected readonly ui = this.localeService.ui;

  protected readonly activeLocale = computed(
    () => this.displayLocale() ?? this.localeService.contentLocale(),
  );

  protected readonly labels = computed(() =>
    getMenuItemLabels(this.activeLocale() === 'en' ? 'en' : 'ar'),
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

  protected readonly selectedSizeId = signal<string | null>(null);
  protected readonly selectedSize = computed(() =>
    this.item().sizes?.find((size) => size.id === this.selectedSizeId() && size.isAvailable),
  );

  protected readonly displayedQuantity = computed(() => {
    const item = this.item();
    if (!item.usesSizes) return this.quantity();

    const size = this.selectedSize();
    return size ? (this.sizeQuantityFor()?.(item.id, size.id) ?? 0) : 0;
  });

  protected readonly startingPrice = computed(() => {
    const options = this.item().sizes?.filter((size) => size.isAvailable) ?? [];
    return options.length ? Math.min(...options.map((size) => menuItemPrice(this.item(), size).finalPrice)) : null;
  });

  protected readonly pricing = computed(() => menuItemPrice(this.item(), this.selectedSize()));

  protected readonly displayPrice = computed(() => this.formatPrice(
    this.item().usesSizes && !this.selectedSize()
      ? this.startingPrice() ?? 0
      : this.pricing().basePrice,
  ));

  protected readonly displaySalePrice = computed(() => {
    const { basePrice, finalPrice } = this.pricing();
    return (!this.item().usesSizes || this.selectedSize()) && finalPrice < basePrice
      ? this.formatPrice(finalPrice)
      : null;
  });

  private formatPrice(price: number): string {
    return this.localeService.formatCurrency(price, this.currencyCode(), this.countryCode());
  }

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

    if (this.item().usesSizes) {
      const size = this.selectedSize();
      if (!size) return;
      this.sizeAdded.emit({ item: this.item(), sizeId: size.id });
      return;
    }

    this.added.emit(this.item());
    this.justAdded.set(true);
    window.setTimeout(() => this.justAdded.set(false), 1200);
  }

  protected increment(): void {
    this.changeQuantity(Math.min(PUBLIC_CART_MAX_QUANTITY, this.displayedQuantity() + 1));
  }

  protected decrement(): void {
    this.changeQuantity(Math.max(0, this.displayedQuantity() - 1));
  }

  private changeQuantity(quantity: number): void {
    if (!this.item().usesSizes) {
      this.quantityChange.emit(quantity);
      return;
    }

    const size = this.selectedSize();
    if (size) {
      this.sizeQuantityChange.emit({ sizeId: size.id, quantity });
    }
  }
}
