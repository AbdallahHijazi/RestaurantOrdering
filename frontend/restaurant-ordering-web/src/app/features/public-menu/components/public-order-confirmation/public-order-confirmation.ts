import { Component, HostListener, inject, input, output } from '@angular/core';
import { LocaleService } from '../../../../core/localization/locale';
import type { PublicOrderConfirmationApiDto } from '../../data-access/public-order.dto';
import {
  ORDER_STATUS_NEW,
  ORDER_TYPE_DELIVERY,
  ORDER_TYPE_PICKUP,
} from '../../models/public-menu.models';

@Component({
  selector: 'app-public-order-confirmation',
  templateUrl: './public-order-confirmation.html',
  styleUrl: './public-order-confirmation.scss',
})
export class PublicOrderConfirmation {
  readonly open = input(false);
  readonly confirmation = input<PublicOrderConfirmationApiDto | null>(null);
  readonly countryCode = input('SA');

  readonly closed = output<void>();
  readonly returnToMenu = output<void>();

  protected readonly localeService = inject(LocaleService);
  protected readonly ui = this.localeService.ui;

  protected readonly ORDER_TYPE_PICKUP = ORDER_TYPE_PICKUP;
  protected readonly ORDER_TYPE_DELIVERY = ORDER_TYPE_DELIVERY;
  protected readonly ORDER_STATUS_NEW = ORDER_STATUS_NEW;

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) {
      this.closed.emit();
    }
  }

  protected lineName(line: {
    itemNameAr: string;
    itemNameEn?: string | null;
  }): string {
    return this.localeService.pickText(
      { ar: line.itemNameAr, en: line.itemNameEn },
      line.itemNameAr,
    );
  }

  protected formatMoney(amount: number, currencyCode: string): string {
    return this.localeService.formatCurrency(amount, currencyCode, this.countryCode());
  }

  protected orderTypeLabel(orderType: number): string {
    return orderType === ORDER_TYPE_DELIVERY
      ? this.ui().publicOrderTypeDelivery
      : this.ui().publicOrderTypePickup;
  }

  protected statusLabel(status: number): string {
    return status === ORDER_STATUS_NEW
      ? this.ui().publicOrderStatusNew
      : String(status);
  }

  protected instructions(orderType: number): string {
    return orderType === ORDER_TYPE_DELIVERY
      ? this.ui().publicConfirmationDeliveryInstructions
      : this.ui().publicConfirmationPickupInstructions;
  }

  protected formatCreatedAt(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const localeTag = this.localeService.locale() === 'ar' ? 'ar-SA' : 'en-SA';
    return new Intl.DateTimeFormat(localeTag, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
