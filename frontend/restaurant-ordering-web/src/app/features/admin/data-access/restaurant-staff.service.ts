import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import { AuthService } from '../../../core/auth/auth.service';
import type {
  CreateRestaurantStaffRequest,
  RestaurantStaffRoleUpdateResult,
  RestaurantStaffUser,
  UpdateRestaurantStaffRoleRequest,
} from './restaurant-staff.models';

@Injectable({
  providedIn: 'root',
})
export class RestaurantStaffService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  getRestaurantId(): string | null {
    return this.authService.restaurantId();
  }

  listStaff(): Observable<RestaurantStaffUser[]> {
    const restaurantId = this.requireRestaurantId();
    return this.http.get<RestaurantStaffUser[]>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/users`,
    );
  }

  createStaff(request: CreateRestaurantStaffRequest): Observable<RestaurantStaffUser> {
    const restaurantId = this.requireRestaurantId();
    return this.http.post<RestaurantStaffUser>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/users`,
      request,
    );
  }

  updateStaffRole(
    userId: string,
    request: UpdateRestaurantStaffRoleRequest,
  ): Observable<RestaurantStaffRoleUpdateResult> {
    const restaurantId = this.requireRestaurantId();
    return this.http.patch<RestaurantStaffRoleUpdateResult>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/users/${userId}/role`,
      request,
    );
  }

  private requireRestaurantId(): string {
    const restaurantId = this.getRestaurantId();
    if (!restaurantId) {
      throw new Error('Restaurant context is required for staff management.');
    }

    return restaurantId;
  }
}
