import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import { AuthService } from '../../../core/auth/auth.service';
import type {
  CreateRestaurantTableRequest,
  RestaurantTable,
  UpdateRestaurantTableRequest,
  UpdateRestaurantTableStatusRequest,
} from './restaurant-tables.models';

@Injectable({
  providedIn: 'root',
})
export class RestaurantTablesService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  getRestaurantId(): string | null {
    return this.authService.restaurantId();
  }

  listTables(includeArchived = true): Observable<RestaurantTable[]> {
    const restaurantId = this.requireRestaurantId();
    return this.http.get<RestaurantTable[]>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/tables`,
      { params: { includeArchived: String(includeArchived) } },
    );
  }

  /** Archive (soft delete) or restore a table; the row and its historical orders are kept. */
  archiveTable(tableId: string, isArchived: boolean): Observable<RestaurantTable> {
    const restaurantId = this.requireRestaurantId();
    return this.http.patch<RestaurantTable>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/tables/${tableId}/archive`,
      { isArchived },
    );
  }

  createTable(request: CreateRestaurantTableRequest): Observable<RestaurantTable> {
    const restaurantId = this.requireRestaurantId();
    return this.http.post<RestaurantTable>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/tables`,
      request,
    );
  }

  updateTable(tableId: string, request: UpdateRestaurantTableRequest): Observable<RestaurantTable> {
    const restaurantId = this.requireRestaurantId();
    return this.http.patch<RestaurantTable>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/tables/${tableId}`,
      request,
    );
  }

  updateTableStatus(
    tableId: string,
    request: UpdateRestaurantTableStatusRequest,
  ): Observable<RestaurantTable> {
    const restaurantId = this.requireRestaurantId();
    return this.http.patch<RestaurantTable>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/tables/${tableId}/status`,
      request,
    );
  }

  regenerateTableToken(tableId: string): Observable<RestaurantTable> {
    const restaurantId = this.requireRestaurantId();
    return this.http.post<RestaurantTable>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/tables/${tableId}/regenerate-token`,
      {},
    );
  }

  private requireRestaurantId(): string {
    const restaurantId = this.getRestaurantId();
    if (!restaurantId) {
      throw new Error('Restaurant context is required for tables management.');
    }

    return restaurantId;
  }
}
