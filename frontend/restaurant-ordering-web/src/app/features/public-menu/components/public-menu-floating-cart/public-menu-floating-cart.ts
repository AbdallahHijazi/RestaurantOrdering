import { Component, computed, inject, input, output } from '@angular/core';
import { LocaleService } from '../../../../core/localization/locale';
import { PublicCartService } from '../../data-access/public-cart.service';
import type { PublicRestaurantOrderSettings } from '../../models/public-menu.models';
import { ORDER_TYPE_PICKUP } from '../../models/public-menu.models';
import { estimateOrderTotals } from '../../utils/order-estimate.util';

@Component({
  selector: 'app-public-menu-floating-cart',
  templateUrl: './public-menu-floating-cart.html',
  styleUrl: './public-menu-floating-cart.scss',
})
export class PublicMenuFloatingCart {
  readonly orderSettings = input.required<PublicRestaurantOrderSettings>();
  readonly countryCode = input('SA');
  readonly visible = input(false);

  readonly viewCart = output<void>();

  protected readonly cart = inject(PublicCartService);
  protected readonly localeService = inject(LocaleService);
  protected readonly ui = this.localeService.ui;

  protected readonly estimate = computed(() =>
    estimateOrderTotals(this.cart.cartItems(), this.orderSettings(), ORDER_TYPE_PICKUP),
  );

  protected summaryLabel(): string {
    const count = this.cart.itemCount();
    const total = this.localeService.formatCurrency(
      this.estimate().subtotal,
      this.orderSettings().currencyCode,
      this.countryCode(),
    );

    return `${count} · ${total}`;
  }
}
