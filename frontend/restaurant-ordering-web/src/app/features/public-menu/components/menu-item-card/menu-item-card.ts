import { Component, computed, inject, input, output, signal } from '@angular/core';
import { LocaleService } from '../../../../core/localization/locale';
import { getMenuItemLabels, type PublicMenuItem } from '../../models/public-menu.models';

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

  readonly quantityChange = output<number>();

  protected readonly localeService = inject(LocaleService);
  protected readonly imageFailed = signal(false);
  protected readonly justAdded = signal(false);

  protected readonly labels = computed(() => getMenuItemLabels(this.localeService.locale()));

  protected readonly displayName = computed(() => {
    this.localeService.locale();
    return this.localeService.pickText(
      { ar: this.item().nameAr, en: this.item().nameEn },
      this.item().nameAr,
    );
  });

  protected readonly displayDescription = computed(() => {
    this.localeService.locale();
    return this.localeService.pickText(
      { ar: this.item().descriptionAr, en: this.item().descriptionEn },
      '',
    );
  });

  protected readonly displayPrice = computed(() => {
    this.localeService.locale();
    return this.localeService.formatCurrency(
      this.item().price,
      this.currencyCode(),
      this.countryCode(),
    );
  });

  protected readonly displayDiscountPrice = computed(() => {
    const discount = this.item().discountPrice;
    if (discount == null) {
      return null;
    }

    this.localeService.locale();
    return this.localeService.formatCurrency(
      discount,
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

    this.quantityChange.emit(this.quantity() + 1);
    this.justAdded.set(true);

    window.setTimeout(() => this.justAdded.set(false), 1200);
  }

  protected increment(): void {
    this.quantityChange.emit(this.quantity() + 1);
  }

  protected decrement(): void {
    this.quantityChange.emit(Math.max(0, this.quantity() - 1));
  }
}
