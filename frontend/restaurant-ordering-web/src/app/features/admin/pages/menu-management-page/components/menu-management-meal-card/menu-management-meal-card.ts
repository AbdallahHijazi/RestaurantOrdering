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
  readonly reorderMode = input(false);
  readonly dragging = input(false);

  readonly toggleAvailability = output<AdminMenuItem>();
  readonly editItem = output<AdminMenuItem>();
  readonly deleteItem = output<AdminMenuItem>();
  readonly imageError = output<string>();
  readonly reorderPointerDown = output<PointerEvent>();

  protected beginPointerReorder(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.reorderPointerDown.emit(event);
  }

  protected displayItemName(item: AdminMenuItem): string {
    return this.locale.pickResolvedTextForLocale(
      this.locale.contentLocale(),
      item.primaryName,
      { ar: item.nameAr, en: item.nameEn ?? item.nameAr },
      item.nameAr,
    );
  }

  protected displayItemDescription(item: AdminMenuItem): string {
    const fallback = item.descriptionAr?.trim() ?? '';
    return this.locale.pickResolvedTextForLocale(
      this.locale.contentLocale(),
      item.primaryDescription,
      { ar: fallback, en: item.descriptionEn?.trim() || fallback },
      fallback,
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
