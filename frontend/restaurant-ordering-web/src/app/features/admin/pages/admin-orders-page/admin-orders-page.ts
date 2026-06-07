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
import { LocaleService } from '../../../../core/localization/locale';
import { OrderModalShell } from '../../../../shared/components/order-modal-shell/order-modal-shell';
import { formatOrderCurrency } from '../../../../shared/orders/order-money.util';
import { getOrderStatusLabel } from '../../../../shared/orders/order-status-label.util';
import { getOrderTypeLabel } from '../../../../shared/orders/order-type-label.util';
import {
  OrderStatus,
  OrderType,
  type OrderDetails,
  type OrderSummary,
} from '../../../kitchen/data-access/kitchen-orders.models';
import { AdminOrdersService } from '../../data-access/admin-orders.service';
import { AdminOrdersSelect } from './components/admin-orders-select/admin-orders-select';
import {
  AdminOrderDetailsModal,
  type AdminOrderDetailsAction,
} from './components/admin-order-details-modal/admin-order-details-modal';
import {
  buildGuestFilterOptions,
  filterOrders,
  formatRelativeOrderTime,
  getAvatarInitials,
  hasActiveFilters,
  shortenOrderNumber,
  type OrderGuestFilter,
  type OrderListFilters,
  type OrderTypeFilter,
} from './admin-orders-page.util';

type PageState = 'loading' | 'ready' | 'error' | 'missing-context';
type StatusFilter = 'all' | OrderStatus;
type OrderAction = AdminOrderDetailsAction;

const STATUS_FILTERS: readonly { key: StatusFilter; status: OrderStatus | null }[] = [
  { key: 'all', status: null },
  { key: OrderStatus.New, status: OrderStatus.New },
  { key: OrderStatus.Preparing, status: OrderStatus.Preparing },
  { key: OrderStatus.Ready, status: OrderStatus.Ready },
  { key: OrderStatus.Completed, status: OrderStatus.Completed },
  { key: OrderStatus.Cancelled, status: OrderStatus.Cancelled },
];

@Component({
  selector: 'app-admin-orders-page',
  imports: [OrderModalShell, AdminOrderDetailsModal, AdminOrdersSelect],
  templateUrl: './admin-orders-page.html',
  styleUrls: ['./admin-orders-page.shell.scss', './admin-orders-page.cards.scss'],
})
export class AdminOrdersPage {
  private readonly ordersService = inject(AdminOrdersService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly locale = inject(LocaleService);
  protected readonly statusFilters = STATUS_FILTERS;
  protected readonly OrderStatus = OrderStatus;
  protected readonly OrderType = OrderType;
  protected readonly shortenOrderNumber = shortenOrderNumber;
  protected readonly getAvatarInitials = getAvatarInitials;

  protected readonly pageState = signal<PageState>('loading');
  protected readonly listError = signal<string | null>(null);
  protected readonly refreshing = signal(false);
  protected readonly feedbackMessage = signal<string | null>(null);
  protected readonly activeFilter = signal<StatusFilter>('all');
  protected readonly searchQuery = signal('');
  protected readonly typeFilter = signal<OrderTypeFilter>('all');
  protected readonly guestFilter = signal<OrderGuestFilter>('all');
  protected readonly orders = signal<OrderSummary[]>([]);
  protected readonly pageNumber = signal(1);
  protected readonly totalCount = signal(0);
  protected readonly updatingOrderIds = signal<ReadonlySet<string>>(new Set());

  protected readonly detailsOpen = signal(false);
  protected readonly detailsLoading = signal(false);
  protected readonly detailsError = signal<string | null>(null);
  protected readonly selectedOrderId = signal<string | null>(null);
  protected readonly orderDetails = signal<OrderDetails | null>(null);
  protected readonly pendingCancelOrder = signal<OrderSummary | null>(null);

  protected readonly listFilters = computed<OrderListFilters>(() => ({
    status: this.activeFilter(),
    search: this.searchQuery(),
    orderType: this.typeFilter(),
    guest: this.guestFilter(),
  }));

  protected readonly filteredOrders = computed(() =>
    filterOrders(this.orders(), this.listFilters()),
  );

  protected readonly guestOptions = computed(() =>
    buildGuestFilterOptions(
      this.orders(),
      this.locale.uiText('adminOrdersFilterAllGuests'),
    ),
  );

  protected readonly typeOptions = computed(() => [
    { value: 'all', label: this.locale.uiText('adminOrdersFilterAllTypes') },
    {
      value: String(OrderType.Delivery),
      label: this.locale.uiText('adminOrdersTypeDelivery'),
    },
    {
      value: String(OrderType.Pickup),
      label: this.locale.uiText('adminOrdersTypePickup'),
    },
  ]);

  protected readonly hasMore = computed(
    () => this.orders().length < this.totalCount(),
  );

  protected readonly filtersActive = computed(() =>
    hasActiveFilters(this.listFilters()),
  );

  constructor() {
    this.loadOrders();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.pendingCancelOrder()) {
      this.dismissCancelConfirmation();
      return;
    }

    if (this.detailsOpen()) {
      this.closeDetails();
    }
  }

  protected loadOrders(resetPage = true): void {
    const restaurantId = this.ordersService.getRestaurantId();
    if (!restaurantId) {
      this.pageState.set('missing-context');
      return;
    }

    const nextPage = resetPage ? 1 : this.pageNumber();
    if (resetPage) {
      this.pageState.set('loading');
      this.listError.set(null);
    }

    this.ordersService
      .listOrders(null, nextPage)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.orders.set(resetPage ? result.items : [...this.orders(), ...result.items]);
          this.pageNumber.set(result.pageNumber);
          this.totalCount.set(result.totalCount);
          this.pageState.set('ready');
          this.refreshing.set(false);
        },
        error: (error) => {
          this.pageState.set('error');
          this.listError.set(this.mapListError(error));
          this.refreshing.set(false);
        },
      });
  }

  protected refreshOrders(): void {
    if (this.refreshing() || this.pageState() === 'loading') {
      return;
    }

    this.feedbackMessage.set(null);
    this.refreshing.set(true);
    this.loadOrders(true);
  }

  protected setFilter(filter: StatusFilter): void {
    if (this.activeFilter() === filter) {
      return;
    }

    this.feedbackMessage.set(null);
    this.activeFilter.set(filter);
  }

  protected setSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  protected setTypeFilter(value: string): void {
    this.typeFilter.set(value === 'all' ? 'all' : (Number(value) as OrderType));
  }

  protected typeFilterValue(): string {
    const value = this.typeFilter();
    return value === 'all' ? 'all' : String(value);
  }

  protected setGuestFilter(value: string): void {
    this.guestFilter.set(value as OrderGuestFilter);
  }

  protected clearFilters(): void {
    this.activeFilter.set('all');
    this.searchQuery.set('');
    this.typeFilter.set('all');
    this.guestFilter.set('all');
  }

  protected resultCountLabel(): string {
    return `${this.locale.uiText('adminOrdersShowing')} ${this.filteredOrders().length} ${this.locale.uiText('adminOrdersOf')} ${this.orders().length} ${this.locale.uiText('adminOrdersOrdersWord')}`;
  }

  protected loadMore(): void {
    if (this.pageState() !== 'ready' || !this.hasMore()) {
      return;
    }

    const nextPage = this.pageNumber() + 1;

    this.ordersService
      .listOrders(null, nextPage)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.orders.update((current) => [...current, ...result.items]);
          this.pageNumber.set(result.pageNumber);
          this.totalCount.set(result.totalCount);
        },
        error: () => {
          this.feedbackMessage.set(this.locale.uiText('adminOrdersLoadMoreError'));
        },
      });
  }

  protected filterLabel(filter: StatusFilter): string {
    switch (filter) {
      case 'all':
        return this.locale.uiText('adminOrdersFilterAll');
      case OrderStatus.New:
        return this.locale.uiText('adminOrdersStatusNew');
      case OrderStatus.Preparing:
        return this.locale.uiText('adminOrdersStatusPreparing');
      case OrderStatus.Ready:
        return this.locale.uiText('adminOrdersStatusReady');
      case OrderStatus.Completed:
        return this.locale.uiText('adminOrdersStatusCompleted');
      case OrderStatus.Cancelled:
        return this.locale.uiText('adminOrdersStatusCancelled');
    }
  }

  protected statusLabel(status: OrderStatus): string {
    return getOrderStatusLabel(status, this.locale.locale());
  }

  protected orderTypeLabel(orderType: OrderType): string {
    return getOrderTypeLabel(orderType, this.locale.locale());
  }

  protected guestDisplayName(order: OrderSummary): string {
    return order.guestName?.trim() || this.locale.uiText('adminOrdersGuestFallback');
  }

  protected formatMoney(amount: number, currencyCode: string): string {
    return formatOrderCurrency(amount, currencyCode);
  }

  protected formatOrderTime(value: string): string {
    return formatRelativeOrderTime(value, this.locale.locale());
  }

  protected actionsForDetails(): OrderAction[] {
    const details = this.orderDetails();
    return details ? this.actionsForStatus(details.orderStatus) : [];
  }

  protected requestDetailsAction(action: OrderAction): void {
    const details = this.orderDetails();
    if (!details) {
      return;
    }

    const summary: OrderSummary = {
      id: details.id,
      orderNumber: details.orderNumber,
      restaurantId: details.restaurantId,
      customerId: details.customerId,
      guestName: details.guestName,
      guestPhone: details.guestPhone,
      orderType: details.orderType,
      orderStatus: details.orderStatus,
      totalAmount: details.totalAmount,
      currencyCode: details.currencyCode,
      createdAt: details.createdAt,
      updatedAt: details.updatedAt,
    };

    this.requestAction(summary, action);
  }

  protected actionsForStatus(status: OrderStatus): OrderAction[] {
    switch (status) {
      case OrderStatus.New:
        return [
          {
            labelKey: 'adminOrdersActionStartPreparing',
            newStatus: OrderStatus.Preparing,
          },
          {
            labelKey: 'adminOrdersActionCancel',
            newStatus: OrderStatus.Cancelled,
            destructive: true,
          },
        ];
      case OrderStatus.Preparing:
        return [
          {
            labelKey: 'adminOrdersActionMarkReady',
            newStatus: OrderStatus.Ready,
          },
          {
            labelKey: 'adminOrdersActionCancel',
            newStatus: OrderStatus.Cancelled,
            destructive: true,
          },
        ];
      case OrderStatus.Ready:
        return [
          {
            labelKey: 'adminOrdersActionComplete',
            newStatus: OrderStatus.Completed,
          },
          {
            labelKey: 'adminOrdersActionCancel',
            newStatus: OrderStatus.Cancelled,
            destructive: true,
          },
        ];
      default:
        return [];
    }
  }

  protected openDetails(order: OrderSummary): void {
    this.detailsOpen.set(true);
    this.selectedOrderId.set(order.id);
    this.orderDetails.set(null);
    this.detailsError.set(null);
    this.loadDetails(order.id);
  }

  protected closeDetails(): void {
    this.detailsOpen.set(false);
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

  protected requestAction(order: OrderSummary, action: OrderAction): void {
    if (action.destructive) {
      this.pendingCancelOrder.set(order);
      return;
    }

    this.applyStatusUpdate(order, action.newStatus);
  }

  protected confirmCancel(): void {
    const order = this.pendingCancelOrder();
    if (!order) {
      return;
    }

    this.pendingCancelOrder.set(null);
    this.applyStatusUpdate(order, OrderStatus.Cancelled);
  }

  protected dismissCancelConfirmation(): void {
    this.pendingCancelOrder.set(null);
  }

  protected isUpdating(orderId: string): boolean {
    return this.updatingOrderIds().has(orderId);
  }

  private applyStatusUpdate(order: OrderSummary, newStatus: OrderStatus): void {
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
          this.orders.update((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          );
          this.setUpdating(order.id, false);
          this.feedbackMessage.set(this.locale.uiText('adminOrdersStatusUpdateSuccess'));

          if (this.selectedOrderId() === order.id) {
            this.loadDetails(order.id);
          }
        },
        error: (error) => {
          this.setUpdating(order.id, false);
          this.handleTransitionError(error);
        },
      });
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
        },
        error: (error) => {
          this.detailsLoading.set(false);
          this.detailsError.set(this.mapDetailsError(error));
        },
      });
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

  private handleTransitionError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) {
        this.feedbackMessage.set(this.locale.uiText('adminOrdersErrorConflict'));
        this.loadOrders(true);
        return;
      }

      if (error.status === 403) {
        this.feedbackMessage.set(this.locale.uiText('adminOrdersErrorForbidden'));
        return;
      }

      if (error.status === 404) {
        this.feedbackMessage.set(this.locale.uiText('adminOrdersErrorNotFound'));
        this.loadOrders(true);
        return;
      }

      if (error.status === 429) {
        this.feedbackMessage.set(this.locale.uiText('adminOrdersErrorTooManyRequests'));
        return;
      }
    }

    this.feedbackMessage.set(this.locale.uiText('adminOrdersErrorGeneric'));
  }

  private mapListError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) {
        return this.locale.uiText('adminOrdersErrorForbidden');
      }

      if (error.status === 429) {
        return this.locale.uiText('adminOrdersErrorTooManyRequests');
      }
    }

    return this.locale.uiText('adminOrdersListError');
  }

  private mapDetailsError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return this.locale.uiText('adminOrdersErrorNotFound');
      }

      if (error.status === 429) {
        return this.locale.uiText('adminOrdersErrorTooManyRequests');
      }
    }

    return this.locale.uiText('adminOrdersDetailsError');
  }
}
