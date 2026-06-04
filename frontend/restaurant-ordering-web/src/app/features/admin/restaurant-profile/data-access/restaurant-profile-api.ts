import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import { API_BASE_URL } from '../../../../core/config/api-config';
import { AuthService } from '../../../../core/auth/auth.service';
import type {
  RestaurantApiDto,
  RestaurantSettingsApiDto,
  UpdateRestaurantApiRequest,
  UpdateRestaurantSettingsApiRequest,
} from '../../../public-menu/data-access/public-menu.dto';
import type {
  RestaurantProfileFormValue,
  RestaurantSettingsSnapshot,
} from '../models/restaurant-profile.models';
import { buildUpdateSettingsRequest } from './restaurant-profile-settings.util';

export { buildUpdateSettingsRequest } from './restaurant-profile-settings.util';

export type ProfileSaveScope = 'restaurant' | 'settings';

export interface ProfileSaveResult {
  mode: 'demo' | 'api';
  scope: ProfileSaveScope;
  message: string;
}

/**
 * Backend validation and ownership enforcement are required for production saves.
 * Frontend validation here is UX-only and must not be treated as a security boundary.
 */
@Injectable({
  providedIn: 'root',
})
export class RestaurantProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private demoSnapshot: RestaurantProfileFormValue | null = null;

  saveRestaurantProfile(formValue: RestaurantProfileFormValue): Observable<ProfileSaveResult> {
    const restaurantId = this.authService.restaurantId();
    if (!restaurantId) {
      this.demoSnapshot = structuredClone(formValue);
      return of({
        mode: 'demo',
        scope: 'restaurant',
        message: 'demo-preview-only',
      });
    }

    const updateRequest = this.toUpdateRestaurantRequest(formValue);
    return this.updateRestaurant(restaurantId, updateRequest).pipe(
      map(() => ({ mode: 'api' as const, scope: 'restaurant' as const, message: 'restaurant-saved' })),
    );
  }

  saveOrderingSettings(
    formValue: RestaurantProfileFormValue,
    settingsSnapshot: RestaurantSettingsSnapshot,
  ): Observable<ProfileSaveResult> {
    const restaurantId = this.authService.restaurantId();
    if (!restaurantId) {
      this.demoSnapshot = structuredClone(formValue);
      return of({
        mode: 'demo',
        scope: 'settings',
        message: 'demo-preview-only',
      });
    }

    const settingsRequest = buildUpdateSettingsRequest(formValue, settingsSnapshot);
    return this.updateSettings(restaurantId, settingsRequest).pipe(
      map(() => ({ mode: 'api' as const, scope: 'settings' as const, message: 'settings-saved' })),
    );
  }

  getDemoSnapshot(): RestaurantProfileFormValue | null {
    return this.demoSnapshot ? structuredClone(this.demoSnapshot) : null;
  }

  loadProfile(restaurantId: string): Observable<{
    restaurant: RestaurantApiDto;
    settings: RestaurantSettingsApiDto;
  }> {
    return forkJoin({
      restaurant: this.getRestaurant(restaurantId),
      settings: this.getSettings(restaurantId),
    });
  }

  /** Real contract: GET /api/v1/admin/restaurants/{restaurantId} */
  getRestaurant(restaurantId: string): Observable<RestaurantApiDto> {
    return this.http.get<RestaurantApiDto>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}`,
    );
  }

  /** Real contract: PUT /api/v1/admin/restaurants/{restaurantId} */
  updateRestaurant(
    restaurantId: string,
    request: UpdateRestaurantApiRequest,
  ): Observable<RestaurantApiDto> {
    return this.http.put<RestaurantApiDto>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}`,
      request,
    );
  }

  /** Real contract: GET /api/v1/admin/restaurants/{restaurantId}/settings */
  getSettings(restaurantId: string): Observable<RestaurantSettingsApiDto> {
    return this.http.get<RestaurantSettingsApiDto>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/settings`,
    );
  }

  /** Real contract: PUT /api/v1/admin/restaurants/{restaurantId}/settings */
  updateSettings(
    restaurantId: string,
    request: UpdateRestaurantSettingsApiRequest,
  ): Observable<RestaurantSettingsApiDto> {
    return this.http.put<RestaurantSettingsApiDto>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/settings`,
      request,
    );
  }

  toUpdateRestaurantRequest(form: RestaurantProfileFormValue): UpdateRestaurantApiRequest {
    return {
      slug: form.slug.trim().toLowerCase(),
      nameAr: form.nameAr.trim(),
      nameEn: form.nameEn.trim() || null,
      descriptionAr: form.descriptionAr.trim() || null,
      descriptionEn: form.descriptionEn.trim() || null,
      phoneNumber: form.phoneNumber.trim(),
      whatsAppNumber: form.whatsAppNumber.trim() || null,
      addressAr: form.addressAr.trim() || null,
      addressEn: form.addressEn.trim() || null,
      latitude: null,
      longitude: null,
    };
  }
}

/** @deprecated Use RestaurantProfileApiService */
export { RestaurantProfileApiService as RestaurantProfileApi };
