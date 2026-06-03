import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import { AuthService } from '../../../core/auth/auth.service';
import type {
  GetOrdersResult,
  OrderDetails,
  OrderStatus,
  OrderSummary,
  UpdateOrderStatusRequest,
} from './kitchen-orders.models';

@Injectable({
  providedIn: 'root',
})
export class KitchenOrdersService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  getRestaurantId(): string | null {
    return this.authService.restaurantId();
  }

  listOrders(
    status: OrderStatus,
    pageNumber = 1,
    pageSize = 20,
  ): Observable<GetOrdersResult> {
    const restaurantId = this.requireRestaurantId();
    const params = new HttpParams()
      .set('status', String(status))
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

    return this.http.get<GetOrdersResult>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/orders`,
      { params },
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
      throw new Error('Restaurant context is required for kitchen orders.');
    }

    return restaurantId;
  }
}
