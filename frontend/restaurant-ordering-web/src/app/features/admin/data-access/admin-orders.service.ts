import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import { AuthService } from '../../../core/auth/auth.service';
import type {
  DashboardActivity,
  DashboardSummary,
  GetOrdersResult,
  OrderDetails,
  OrderStatus,
  OrderSummary,
  OrderType,
  UpdateOrderStatusRequest,
} from '../../kitchen/data-access/kitchen-orders.models';

export const ADMIN_ORDERS_PAGE_SIZE = 20;

/** Optional server-side filters; applied to the whole dataset, not just loaded rows. */
export interface AdminOrderListFilters {
  searchTerm?: string | null;
  orderType?: OrderType | null;
}

@Injectable({
  providedIn: 'root',
})
export class AdminOrdersService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  getRestaurantId(): string | null {
    return this.authService.restaurantId();
  }

  listOrders(
    status: OrderStatus | null,
    pageNumber = 1,
    pageSize = ADMIN_ORDERS_PAGE_SIZE,
    filters: AdminOrderListFilters = {},
  ): Observable<GetOrdersResult> {
    const restaurantId = this.requireRestaurantId();
    let params = new HttpParams()
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

    if (status !== null) {
      params = params.set('status', String(status));
    }

    if (filters.orderType !== null && filters.orderType !== undefined) {
      params = params.set('orderType', String(filters.orderType));
    }

    const searchTerm = filters.searchTerm?.trim();
    if (searchTerm) {
      params = params.set('searchTerm', searchTerm);
    }

    return this.http.get<GetOrdersResult>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/orders`,
      { params },
    );
  }

  /** Server-side aggregates for the dashboard cards (not derived from a paginated subset). */
  getDashboardSummary(): Observable<DashboardSummary> {
    const restaurantId = this.requireRestaurantId();
    return this.http.get<DashboardSummary>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/dashboard/summary`,
    );
  }

  /** Last N days of real order activity for the dashboard chart. */
  getDashboardActivity(days = 7): Observable<DashboardActivity> {
    const restaurantId = this.requireRestaurantId();
    return this.http.get<DashboardActivity>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/dashboard/activity`,
      { params: { days: String(days) } },
    );
  }

  getOrderDetails(orderId: string): Observable<OrderDetails> {
    const restaurantId = this.requireRestaurantId();
    return this.http.get<OrderDetails>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/orders/${orderId}`,
    );
  }

  updateOrderStatus(
    orderId: string,
    request: UpdateOrderStatusRequest,
  ): Observable<OrderSummary> {
    const restaurantId = this.requireRestaurantId();
    return this.http.patch<OrderSummary>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/orders/${orderId}/status`,
      request,
    );
  }

  private requireRestaurantId(): string {
    const restaurantId = this.getRestaurantId();
    if (!restaurantId) {
      throw new Error('Restaurant context is required for admin orders.');
    }

    return restaurantId;
  }
}
