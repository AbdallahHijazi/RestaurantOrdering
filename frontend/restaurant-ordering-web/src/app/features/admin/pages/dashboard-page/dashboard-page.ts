import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ApplicationRoles } from '../../../../core/auth/application-roles';
import { AuthService } from '../../../../core/auth/auth.service';
import { LocaleService } from '../../../../core/localization/locale';

import { AdminOrdersService } from '../../data-access/admin-orders.service';

import {
  OrderStatus,
  OrderType,
  type OrderSummary,
} from '../../../kitchen/data-access/kitchen-orders.models';

import { getOrderStatusLabel } from '../../../../shared/orders/order-status-label.util';
import { getOrderTypeLabel } from '../../../../shared/orders/order-type-label.util';
import { formatOrderCurrency } from '../../../../shared/orders/order-money.util';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  protected readonly localeService = inject(LocaleService);
  protected readonly authService = inject(AuthService);

  private readonly ordersService = inject(AdminOrdersService);

  protected readonly OrderStatus = OrderStatus;

  protected readonly orders = signal<OrderSummary[]>([]);

  protected readonly loading = signal(true);

  protected readonly isOwner = computed(() =>
    this.authService.hasAnyRole(ApplicationRoles.RestaurantOwner),
  );

  protected readonly roleLabel = computed(() => {
    const role = this.authService.currentRole();

    if (role === ApplicationRoles.RestaurantOwner) {
      return this.localeService.uiText('adminRoleOwner');
    }

    if (role === ApplicationRoles.RestaurantManager) {
      return this.localeService.uiText('adminRoleManager');
    }

    return role ?? '—';
  });

  protected readonly todayOrders = computed(() => this.orders().length);

  protected readonly activeOrders = computed(() =>
    this.orders().filter(
      (order) =>
        order.orderStatus === OrderStatus.New ||
        order.orderStatus === OrderStatus.Preparing ||
        order.orderStatus === OrderStatus.Ready,
    ).length,
  );

  protected readonly todaySales = computed(() =>
    this.orders().reduce(
      (total, order) => total + order.totalAmount,
      0,
    ),
  );

  protected readonly averageOrder = computed(() => {
    const orders = this.orders();

    if (!orders.length) {
      return 0;
    }

    return this.todaySales() / orders.length;
  });


  constructor() {
    this.loadOrders();
  }


  private loadOrders(): void {
    this.ordersService.listOrders(null, 1, 5).subscribe({
      next: (result) => {
        this.orders.set(result.items);
        this.loading.set(false);
      },
      error: () => {
        this.orders.set([]);
        this.loading.set(false);
      },
    });
  }


  protected statusLabel(status: OrderStatus): string {
    return getOrderStatusLabel(
      status,
      this.localeService.contentLocale() === 'ar' ? 'ar' : 'en',
    );
  }


  protected typeLabel(type: OrderType): string {
    return getOrderTypeLabel(
      type,
      this.localeService.contentLocale() === 'ar' ? 'ar' : 'en',
    );
  }


  protected money(amount: number, currency: string): string {
    return formatOrderCurrency(amount, currency);
  }


  protected refresh(): void {
    this.loading.set(true);
    this.loadOrders();
  }
}