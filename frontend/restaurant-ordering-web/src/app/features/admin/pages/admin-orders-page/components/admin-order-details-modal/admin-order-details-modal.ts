import { Component, ViewEncapsulation, computed, inject, input, output } from '@angular/core';
import { LocaleService } from '../../../../../../core/localization/locale';
import { shouldShowFinancialAmount } from '../../../../../../shared/orders/order-display.util';
import { formatOrderDateTime } from '../../../../../../shared/orders/order-date-time.util';
import { formatOrderCurrency } from '../../../../../../shared/orders/order-money.util';
import { getOrderStatusLabel } from '../../../../../../shared/orders/order-status-label.util';
import { getOrderTypeLabel } from '../../../../../../shared/orders/order-type-label.util';
import {
  OrderStatus,
  OrderType,
  type OrderDetails,
  type OrderDetailsItem,
} from '../../../../../kitchen/data-access/kitchen-orders.models';
import { buildOrderDetailsTimeline } from './admin-order-details-modal.util';

export interface AdminOrderDetailsAction {
  labelKey:
    | 'adminOrdersActionStartPreparing'
    | 'adminOrdersActionMarkReady'
    | 'adminOrdersActionComplete'
    | 'adminOrdersActionCancel';
  newStatus: OrderStatus;
  destructive?: boolean;
}

@Component({
  selector: 'app-admin-order-details-modal',
  templateUrl: './admin-order-details-modal.html',
  styleUrls: [
    './admin-order-details-modal.portal.scss',
    './admin-order-details-modal.main.scss',
    './admin-order-details-modal.aside.scss',
    './admin-order-details-modal.print.scss',
  ],
  encapsulation: ViewEncapsulation.None,
})
export class AdminOrderDetailsModal {
  protected readonly locale = inject(LocaleService);

  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly details = input<OrderDetails | null>(null);
  readonly actions = input<AdminOrderDetailsAction[]>([]);
  readonly updating = input(false);
  readonly titleId = input('admin-order-details-title');
  readonly closeLabel = input('');

  readonly closed = output<void>();
  readonly retry = output<void>();
  readonly actionRequested = output<AdminOrderDetailsAction>();

  protected readonly OrderType = OrderType;
  protected readonly OrderStatus = OrderStatus;
  protected readonly shouldShowFinancialAmount = shouldShowFinancialAmount;

  protected readonly timelineSteps = computed(() => {
    const details = this.details();
    return details ? buildOrderDetailsTimeline(details.orderStatus) : [];
  });

  protected statusLabel(status: OrderStatus): string {
    return getOrderStatusLabel(status, this.locale.locale());
  }

  protected orderTypeLabel(orderType: OrderType): string {
    return getOrderTypeLabel(orderType, this.locale.locale());
  }

  protected formatCreatedAt(value: string): string {
    return formatOrderDateTime(value);
  }

  protected itemName(item: OrderDetailsItem): string {
    if (this.locale.locale() === 'en') {
      return item.itemNameEn?.trim() || item.itemNameAr;
    }

    return item.itemNameAr;
  }

  protected formatMoney(amount: number, currencyCode: string): string {
    return formatOrderCurrency(amount, currencyCode);
  }

  protected showDeliveryFee(details: OrderDetails): boolean {
    return details.orderType === OrderType.Delivery;
  }

  protected showDeliveryAddress(details: OrderDetails): boolean {
    return (
      details.orderType === OrderType.Delivery && Boolean(details.deliveryAddress?.trim())
    );
  }

  protected requestClose(): void {
    this.closed.emit();
  }

  protected printInvoice(): void {
    const details = this.details();

    if (!details || this.loading()) {
      return;
    }

    window.print();
  }
}
