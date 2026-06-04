import { Component, HostListener, inject, input, output } from '@angular/core';
import { LocaleService } from '../../../../core/localization/locale';
import { OrderModalShell } from '../../../../shared/components/order-modal-shell/order-modal-shell';
import { shouldShowFinancialAmount } from '../../../../shared/orders/order-display.util';
import { formatOrderDateTime } from '../../../../shared/orders/order-date-time.util';
import { formatOrderCurrency } from '../../../../shared/orders/order-money.util';
import { getOrderStatusLabel } from '../../../../shared/orders/order-status-label.util';
import { getOrderTypeLabel } from '../../../../shared/orders/order-type-label.util';
import type { PublicOrderConfirmationApiDto } from '../../data-access/public-order.dto';
import {
  ORDER_STATUS_NEW,
  ORDER_TYPE_DELIVERY,
  ORDER_TYPE_PICKUP,
} from '../../models/public-menu.models';

@Component({
  selector: 'app-public-order-confirmation',
  imports: [OrderModalShell],
  templateUrl: './public-order-confirmation.html',
  styleUrl: './public-order-confirmation.scss',
})
export class PublicOrderConfirmation {
  readonly open = input(false);
  readonly confirmation = input<PublicOrderConfirmationApiDto | null>(null);
  /** Kept for template compatibility; confirmation uses API currencyCode. */
  readonly countryCode = input('SA');

  readonly closed = output<void>();
  readonly returnToMenu = output<void>();

  protected readonly localeService = inject(LocaleService);
  protected readonly ui = this.localeService.ui;
  protected readonly shouldShowFinancialAmount = shouldShowFinancialAmount;

  protected readonly ORDER_TYPE_PICKUP = ORDER_TYPE_PICKUP;
  protected readonly ORDER_TYPE_DELIVERY = ORDER_TYPE_DELIVERY;

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
    return formatOrderCurrency(amount, currencyCode);
  }

  protected orderTypeLabel(orderType: number): string {
    return getOrderTypeLabel(orderType, this.localeService.locale());
  }

  protected statusLabel(status: number): string {
    return getOrderStatusLabel(status, this.localeService.locale());
  }

  protected instructions(orderType: number): string {
    return orderType === ORDER_TYPE_DELIVERY
      ? this.ui().publicConfirmationDeliveryInstructions
      : this.ui().publicConfirmationPickupInstructions;
  }

  protected formatCreatedAt(value: string): string {
    return formatOrderDateTime(value);
  }

}
