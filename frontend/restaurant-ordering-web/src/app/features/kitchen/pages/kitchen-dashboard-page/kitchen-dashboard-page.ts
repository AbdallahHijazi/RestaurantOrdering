import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { LocaleService } from '../../../../core/localization/locale';
import { OrderModalShell } from '../../../../shared/components/order-modal-shell/order-modal-shell';
import { shouldShowFinancialAmount } from '../../../../shared/orders/order-display.util';
import { formatOrderDateTime } from '../../../../shared/orders/order-date-time.util';
import { formatOrderCurrency } from '../../../../shared/orders/order-money.util';
import { getOrderStatusLabel } from '../../../../shared/orders/order-status-label.util';
import { getOrderTypeLabel } from '../../../../shared/orders/order-type-label.util';
import {
  KITCHEN_BOARD_STATUSES,
  KITCHEN_ORDERS_PAGE_SIZE,
  OrderStatus,
  OrderType,
  type GetOrdersResult,
  type KitchenBoardColumnKey,
  type OrderDetails,
  type OrderSummary,
} from '../../data-access/kitchen-orders.models';
import { KitchenOrdersService } from '../../data-access/kitchen-orders.service';

type PageState = 'loading' | 'ready' | 'error' | 'missing-context';

interface ColumnState {
  orders: OrderSummary[];
  pageNumber: number;
  totalCount: number;
  loadingMore: boolean;
}

const EMPTY_COLUMN: ColumnState = {
  orders: [],
  pageNumber: 1,
  totalCount: 0,
  loadingMore: false,
};

@Component({
  selector: 'app-kitchen-dashboard-page',
  imports: [OrderModalShell],
  templateUrl: './kitchen-dashboard-page.html',
  styleUrl: './kitchen-dashboard-page.scss',
})
export class KitchenDashboardPage {
  private readonly ordersService = inject(KitchenOrdersService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly locale = inject(LocaleService);
  protected readonly boardColumns = KITCHEN_BOARD_STATUSES;
  protected readonly OrderStatus = OrderStatus;
  protected readonly OrderType = OrderType;

  protected readonly pageState = signal<PageState>('loading');
  protected readonly boardError = signal<string | null>(null);
  protected readonly refreshing = signal(false);
  protected readonly feedbackMessage = signal<string | null>(null);
  protected readonly activeMobileTab = signal<KitchenBoardColumnKey>('new');

  protected readonly columns = signal<Record<KitchenBoardColumnKey, ColumnState>>({
    new: { ...EMPTY_COLUMN },
    preparing: { ...EMPTY_COLUMN },
    ready: { ...EMPTY_COLUMN },
  });

  protected readonly updatingOrderIds = signal<ReadonlySet<string>>(new Set());

  protected readonly detailsOpen = signal(false);
  protected readonly detailsLoading = signal(false);
  protected readonly detailsError = signal<string | null>(null);
  protected readonly selectedOrderId = signal<string | null>(null);
  protected readonly selectedOrder = signal<OrderSummary | null>(null);
  protected readonly orderDetails = signal<OrderDetails | null>(null);
  protected readonly shouldShowFinancialAmount = shouldShowFinancialAmount;
  protected readonly itemCountByOrderId = signal<ReadonlyMap<string, number>>(new Map());

  protected readonly currentRoleLabel = computed(() =>
    this.locale.uiText('kitchenRoleKitchenManager'),
  );

  constructor() {
    this.loadBoard();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.detailsOpen()) {
      this.closeDetails();
    }
  }

  protected loadBoard(): void {
    const restaurantId = this.ordersService.getRestaurantId();
    if (!restaurantId) {
      this.pageState.set('missing-context');
      return;
    }

    this.pageState.set('loading');
    this.boardError.set(null);
    if (!this.refreshing()) {
      this.feedbackMessage.set(null);
    }

    forkJoin(
      KITCHEN_BOARD_STATUSES.map((column) =>
        this.ordersService.listOrders(column.status, 1, KITCHEN_ORDERS_PAGE_SIZE),
      ),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          this.applyBoardResults(results);
          this.pageState.set('ready');
          this.refreshing.set(false);
        },
        error: (error) => {
          this.pageState.set('error');
          this.boardError.set(this.mapBoardError(error));
          this.refreshing.set(false);
        },
      });
  }

  protected refreshBoard(): void {
    if (this.refreshing() || this.pageState() === 'loading') {
      return;
    }

    this.refreshing.set(true);
    this.loadBoard();
  }

  protected loadMore(columnKey: KitchenBoardColumnKey): void {
    const column = this.columns()[columnKey];
    if (column.loadingMore || !this.hasMore(columnKey)) {
      return;
    }

    const definition = KITCHEN_BOARD_STATUSES.find((item) => item.key === columnKey);
    if (!definition) {
      return;
    }

    const nextPage = column.pageNumber + 1;
    this.patchColumn(columnKey, { loadingMore: true });

    this.ordersService
      .listOrders(definition.status, nextPage, KITCHEN_ORDERS_PAGE_SIZE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.patchColumn(columnKey, {
            orders: [...column.orders, ...result.items],
            pageNumber: result.pageNumber,
            totalCount: result.totalCount,
            loadingMore: false,
          });
        },
        error: () => {
          this.patchColumn(columnKey, { loadingMore: false });
          this.feedbackMessage.set(this.locale.uiText('kitchenLoadMoreError'));
        },
      });
  }

  protected hasMore(columnKey: KitchenBoardColumnKey): boolean {
    const column = this.columns()[columnKey];
    return column.orders.length < column.totalCount;
  }

  protected openDetails(order: OrderSummary): void {
    this.detailsOpen.set(true);
    this.selectedOrder.set(order);
    this.selectedOrderId.set(order.id);
    this.orderDetails.set(null);
    this.detailsError.set(null);
    this.loadDetails(order.id);
  }

  protected closeDetails(): void {
    this.detailsOpen.set(false);
    this.selectedOrder.set(null);
    this.selectedOrderId.set(null);
    this.orderDetails.set(null);
    this.detailsError.set(null);
  }

  protected retryDetails(): void {
    const orderId = this.selectedOrderId();
    if (!orderId) {
      return;
    }

    this.loadDetails(orderId);
  }

  protected startPreparing(order: OrderSummary): void {
    this.transitionOrder(order, OrderStatus.Preparing, 'new', 'preparing');
  }

  protected markReady(order: OrderSummary): void {
    this.transitionOrder(order, OrderStatus.Ready, 'preparing', 'ready');
  }

  protected isUpdating(orderId: string): boolean {
    return this.updatingOrderIds().has(orderId);
  }

  protected itemCount(order: OrderSummary): number | null {
    return this.itemCountByOrderId().get(order.id) ?? null;
  }

  protected orderTypeLabel(orderType: OrderType): string {
    return getOrderTypeLabel(orderType, this.locale.locale());
  }

  protected statusLabel(status: OrderStatus): string {
    return getOrderStatusLabel(status, this.locale.locale());
  }

  protected formatMoney(amount: number, currencyCode: string): string {
    return formatOrderCurrency(amount, currencyCode);
  }

  protected itemName(item: { itemNameAr: string; itemNameEn: string | null }): string {
    if (this.locale.locale() === 'en') {
      return item.itemNameEn?.trim() || item.itemNameAr;
    }

    return item.itemNameAr;
  }

  protected formatCreatedAt(value: string): string {
    return formatOrderDateTime(value);
  }

  protected logout(): void {
    this.authService.logout();
  }

  protected setMobileTab(tab: KitchenBoardColumnKey): void {
    this.activeMobileTab.set(tab);
  }

  private loadDetails(orderId: string): void {
    this.detailsLoading.set(true);
    this.detailsError.set(null);

    this.ordersService
      .getOrderDetails(orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (details) => {
          this.orderDetails.set(details);
          this.detailsLoading.set(false);
          this.cacheItemCount(details);
        },
        error: (error) => {
          this.detailsLoading.set(false);
          this.detailsError.set(this.mapDetailsError(error));
        },
      });
  }

  private transitionOrder(
    order: OrderSummary,
    newStatus: OrderStatus,
    fromColumn: KitchenBoardColumnKey,
    toColumn: KitchenBoardColumnKey,
  ): void {
    if (this.isUpdating(order.id)) {
      return;
    }

    this.setUpdating(order.id, true);
    this.feedbackMessage.set(null);

    this.ordersService
      .updateOrderStatus(order.id, { newStatus })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.moveOrderLocally(order.id, fromColumn, toColumn, updated);
          this.setUpdating(order.id, false);
          this.feedbackMessage.set(this.locale.uiText('kitchenStatusUpdateSuccess'));

          const openId = this.selectedOrderId();
          if (openId === order.id) {
            this.loadDetails(order.id);
          }
        },
        error: (error) => {
          this.setUpdating(order.id, false);
          this.handleTransitionError(error);
        },
      });
  }

  private moveOrderLocally(
    orderId: string,
    fromColumn: KitchenBoardColumnKey,
    toColumn: KitchenBoardColumnKey,
    updated: OrderSummary,
  ): void {
    this.columns.update((current) => {
      const next = { ...current };
      next[fromColumn] = {
        ...next[fromColumn],
        orders: next[fromColumn].orders.filter((item) => item.id !== orderId),
        totalCount: Math.max(0, next[fromColumn].totalCount - 1),
      };
      next[toColumn] = {
        ...next[toColumn],
        orders: [updated, ...next[toColumn].orders.filter((item) => item.id !== orderId)],
        totalCount: next[toColumn].totalCount + 1,
      };
      return next;
    });
  }

  private applyBoardResults(results: GetOrdersResult[]): void {
    const next: Record<KitchenBoardColumnKey, ColumnState> = {
      new: { ...EMPTY_COLUMN },
      preparing: { ...EMPTY_COLUMN },
      ready: { ...EMPTY_COLUMN },
    };

    KITCHEN_BOARD_STATUSES.forEach((column, index) => {
      const result = results[index];
      next[column.key] = {
        orders: result.items,
        pageNumber: result.pageNumber,
        totalCount: result.totalCount,
        loadingMore: false,
      };
    });

    this.columns.set(next);
  }

  private patchColumn(columnKey: KitchenBoardColumnKey, patch: Partial<ColumnState>): void {
    this.columns.update((current) => ({
      ...current,
      [columnKey]: {
        ...current[columnKey],
        ...patch,
      },
    }));
  }

  private setUpdating(orderId: string, updating: boolean): void {
    this.updatingOrderIds.update((current) => {
      const next = new Set(current);
      if (updating) {
        next.add(orderId);
      } else {
        next.delete(orderId);
      }
      return next;
    });
  }

  private cacheItemCount(details: OrderDetails): void {
    this.itemCountByOrderId.update((current) => {
      const next = new Map(current);
      next.set(details.id, details.items.length);
      return next;
    });
  }

  private handleTransitionError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) {
        this.feedbackMessage.set(this.locale.uiText('kitchenErrorConflict'));
        this.refreshBoard();
        return;
      }

      if (error.status === 403) {
        this.feedbackMessage.set(this.locale.uiText('kitchenErrorForbidden'));
        return;
      }

      if (error.status === 404) {
        this.feedbackMessage.set(this.locale.uiText('kitchenErrorNotFound'));
        this.refreshBoard();
        return;
      }

      if (error.status === 429) {
        this.feedbackMessage.set(this.locale.uiText('kitchenErrorTooManyRequests'));
        return;
      }
    }

    this.feedbackMessage.set(this.locale.uiText('kitchenErrorGeneric'));
  }

  private mapBoardError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 429) {
      return this.locale.uiText('kitchenErrorTooManyRequests');
    }

    return this.locale.uiText('kitchenBoardError');
  }

  private mapDetailsError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return this.locale.uiText('kitchenErrorNotFound');
      }

      if (error.status === 429) {
        return this.locale.uiText('kitchenErrorTooManyRequests');
      }
    }

    return this.locale.uiText('kitchenDetailsError');
  }
}
