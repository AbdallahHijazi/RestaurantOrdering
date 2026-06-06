import { DecimalPipe } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { LocaleService } from '../../../../../../core/localization/locale';
import type { AdminMenuItem } from '../../../../data-access/admin-menu.models';

@Component({
  selector: 'app-menu-management-meal-card',
  imports: [DecimalPipe],
  templateUrl: './menu-management-meal-card.html',
  styleUrl: './menu-management-meal-card.scss',
})
export class MenuManagementMealCard {
  protected readonly locale = inject(LocaleService);

  readonly item = input.required<AdminMenuItem>();
  readonly categoryName = input.required<string>();
  readonly imageSrc = input<string | null>(null);
  readonly availabilityBusy = input(false);

  readonly toggleAvailability = output<AdminMenuItem>();
  readonly editItem = output<AdminMenuItem>();
  readonly deleteItem = output<AdminMenuItem>();
  readonly imageError = output<string>();

  protected displayItemName(item: AdminMenuItem): string {
    return this.locale.pickText(
      { ar: item.nameAr, en: item.nameEn ?? item.nameAr },
      item.nameAr,
    );
  }

  protected hasMeaningfulDiscount(item: AdminMenuItem): boolean {
    const discount = item.discountPrice;
    return discount != null && discount > 0 && discount < item.price;
  }

  protected availabilityLabel(item: AdminMenuItem): string {
    return item.isAvailable
      ? this.locale.uiText('adminMenuAvailableNow')
      : this.locale.uiText('adminMenuUnavailable');
  }
}
