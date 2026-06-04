import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import { AuthService } from '../../../core/auth/auth.service';
import type {
  AdminCategory,
  AdminMenuItem,
  SaveCategoryRequest,
  SaveMenuItemRequest,
  UploadedMediaFile,
} from './admin-menu.models';

@Injectable({
  providedIn: 'root',
})
export class AdminMenuService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  getRestaurantId(): string | null {
    return this.authService.restaurantId();
  }

  listCategories(): Observable<AdminCategory[]> {
    const restaurantId = this.requireRestaurantId();
    return this.http.get<AdminCategory[]>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/categories`,
    );
  }

  getCategory(categoryId: string): Observable<AdminCategory> {
    const restaurantId = this.requireRestaurantId();
    return this.http.get<AdminCategory>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/categories/${categoryId}`,
    );
  }

  createCategory(request: SaveCategoryRequest): Observable<AdminCategory> {
    const restaurantId = this.requireRestaurantId();
    return this.http.post<AdminCategory>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/categories`,
      request,
    );
  }

  updateCategory(categoryId: string, request: SaveCategoryRequest): Observable<AdminCategory> {
    const restaurantId = this.requireRestaurantId();
    return this.http.put<AdminCategory>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/categories/${categoryId}`,
      request,
    );
  }

  deleteCategory(categoryId: string): Observable<void> {
    const restaurantId = this.requireRestaurantId();
    return this.http.delete<void>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/categories/${categoryId}`,
    );
  }

  listMenuItems(categoryId?: string | null): Observable<AdminMenuItem[]> {
    const restaurantId = this.requireRestaurantId();
    let params = new HttpParams();
    if (categoryId) {
      params = params.set('categoryId', categoryId);
    }

    return this.http.get<AdminMenuItem[]>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/menu-items`,
      { params },
    );
  }

  getMenuItem(menuItemId: string): Observable<AdminMenuItem> {
    const restaurantId = this.requireRestaurantId();
    return this.http.get<AdminMenuItem>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/menu-items/${menuItemId}`,
    );
  }

  createMenuItem(request: SaveMenuItemRequest): Observable<AdminMenuItem> {
    const restaurantId = this.requireRestaurantId();
    return this.http.post<AdminMenuItem>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/menu-items`,
      request,
    );
  }

  updateMenuItem(menuItemId: string, request: SaveMenuItemRequest): Observable<AdminMenuItem> {
    const restaurantId = this.requireRestaurantId();
    return this.http.put<AdminMenuItem>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/menu-items/${menuItemId}`,
      request,
    );
  }

  deleteMenuItem(menuItemId: string): Observable<void> {
    const restaurantId = this.requireRestaurantId();
    return this.http.delete<void>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/menu-items/${menuItemId}`,
    );
  }

  uploadMedia(file: File): Observable<UploadedMediaFile> {
    const restaurantId = this.requireRestaurantId();
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<UploadedMediaFile>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/media`,
      formData,
    );
  }

  private requireRestaurantId(): string {
    const restaurantId = this.getRestaurantId();
    if (!restaurantId) {
      throw new Error('Restaurant context is required for admin menu management.');
    }

    return restaurantId;
  }
}
