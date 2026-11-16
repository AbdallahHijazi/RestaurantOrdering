import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { ApplicationRoles } from '../../../../core/auth/application-roles';
import { AuthService } from '../../../../core/auth/auth.service';
import { LocaleService } from '../../../../core/localization/locale';
import { IconButton } from '../../../../shared/ui/icon-button/icon-button';

import { AdminOrdersService } from '../../data-access/admin-orders.service';

import {
  OrderStatus,
  OrderType,
  type DashboardActivity,
  type DashboardActivityDay,
  type DashboardSummary,
  type OrderSummary,
} from '../../../kitchen/data-access/kitchen-orders.models';

import { formatOrderDateTime } from '../../../../shared/orders/order-date-time.util';
import { getOrderStatusLabel } from '../../../../shared/orders/order-status-label.util';
import { getOrderTypeLabel } from '../../../../shared/orders/order-type-label.util';
import { formatOrderCurrency } from '../../../../shared/orders/order-money.util';

/** Number of rows shown in the "recent orders" table (statistics never derive from these rows). */
const RECENT_ORDERS_COUNT = 5;

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, IconButton],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  protected readonly localeService = inject(LocaleService);
  protected readonly authService = inject(AuthService);

  private readonly ordersService = inject(AdminOrdersService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly OrderStatus = OrderStatus;

  /** Latest orders for the table only. */
  protected readonly orders = signal<OrderSummary[]>([]);

  /** Authoritative aggregates computed by the server over the full dataset. */
  protected readonly summary = signal<DashboardSummary | null>(null);

  protected readonly activity = signal<DashboardActivity | null>(null);
  protected readonly activityState = signal<LoadState>('loading');
  private activityRequestActive = false;

  protected readonly statsState = signal<LoadState>('loading');
  protected readonly ordersState = signal<LoadState>('loading');

  protected readonly loading = computed(
    () => this.statsState() === 'loading' || this.ordersState() === 'loading',
  );

  protected readonly hasError = computed(
    () => this.statsState() === 'error' || this.ordersState() === 'error',
  );

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

  /** A statistic is `null` while loading or after a failure so it is never shown as a real zero. */
  protected readonly todayOrders = computed(() => this.summary()?.todayOrders ?? null);
  protected readonly activeOrders = computed(() => this.summary()?.activeOrders ?? null);
  protected readonly todaySales = computed(() => this.summary()?.todaySales ?? null);
  protected readonly averageOrder = computed(() => this.summary()?.averageOrderValue ?? null);
  protected readonly currencyCode = computed(() => this.summary()?.currencyCode ?? null);

  private statsRequestActive = false;
  private ordersRequestActive = false;

  constructor() {
    this.load();
  }

  protected refresh(): void {
    this.load();
  }

  private load(): void {
    this.loadSummary();
    this.loadRecentOrders();
    this.loadActivity();
  }

  private loadActivity(): void {
    if (this.activityRequestActive) {
      return;
    }

    this.activityRequestActive = true;
    this.activityState.set('loading');

    this.ordersService
      .getDashboardActivity(7)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (activity) => {
          this.activityRequestActive = false;
          this.activity.set(activity);
          this.activityState.set('ready');
        },
        error: () => {
          this.activityRequestActive = false;
          this.activity.set(null);
          this.activityState.set('error');
        },
      });
  }

  /** Bars scale to the busiest day; a week without orders is reported as empty, never drawn as fake data. */
  protected readonly activityMax = computed(() =>
    Math.max(0, ...(this.activity()?.days ?? []).map((day) => day.orders)),
  );

  protected readonly activityHasOrders = computed(() => this.activityMax() > 0);

  protected barHeight(day: DashboardActivityDay): number {
    const max = this.activityMax();
    return max === 0 ? 0 : Math.max(day.orders > 0 ? 6 : 0, Math.round((day.orders / max) * 100));
  }

  protected dayLabel(day: DashboardActivityDay): string {
    const [year, month, date] = day.date.split('-').map(Number);
    const value = new Date(Date.UTC(year!, month! - 1, date!));
    const weekday = new Intl.DateTimeFormat(this.localeService.locale() === 'ar' ? 'ar' : 'en', {
      weekday: 'short',
      timeZone: 'UTC',
    }).format(value);
    return `${weekday} ${String(date).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
  }

  protected isToday(index: number): boolean {
    return index === (this.activity()?.days.length ?? 0) - 1;
  }

  protected activityTitle(day: DashboardActivityDay): string {
    return `${this.dayLabel(day)}: ${day.orders} ${this.localeService.uiText('adminDashboardActivityOrders')}`;
  }

  private loadSummary(): void {
    if (this.statsRequestActive) {
      return;
    }

    this.statsRequestActive = true;
    this.statsState.set('loading');

    this.ordersService
      .getDashboardSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => {
          this.statsRequestActive = false;
          this.summary.set(summary);
          this.statsState.set('ready');
        },
        error: () => {
          this.statsRequestActive = false;
          // Never present a technical failure as a legitimate zero-sales day.
          this.summary.set(null);
          this.statsState.set('error');
        },
      });
  }

  private loadRecentOrders(): void {
    if (this.ordersRequestActive) {
      return;
    }

    this.ordersRequestActive = true;
    this.ordersState.set('loading');

    this.ordersService
      .listOrders(null, 1, RECENT_ORDERS_COUNT)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.ordersRequestActive = false;
          this.orders.set(result.items);
          this.ordersState.set('ready');
        },
        error: () => {
          this.ordersRequestActive = false;
          this.orders.set([]);
          this.ordersState.set('error');
        },
      });
  }

  protected statusLabel(status: OrderStatus): string {
    return getOrderStatusLabel(status, this.localeService.locale());
  }

  protected typeLabel(type: OrderType): string {
    return getOrderTypeLabel(type, this.localeService.locale());
  }

  protected formatMoney(amount: number | null, currency: string | null): string {
    if (amount === null || currency === null) {
      return '—';
    }

    return formatOrderCurrency(amount, currency);
  }

  protected formatCount(value: number | null): string {
    return value === null ? '—' : String(value);
  }

  protected formatTime(value: string): string {
    return formatOrderDateTime(value);
  }

  protected money(amount: number, currency: string): string {
    return formatOrderCurrency(amount, currency);
  }
}
