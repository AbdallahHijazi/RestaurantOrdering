import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { API_BASE_URL } from '../../../../core/config/api-config';
import type {
  RestaurantApiDto,
  RestaurantSettingsApiDto,
  UpdateRestaurantApiRequest,
  UpdateRestaurantSettingsApiRequest,
} from '../../../public-menu/data-access/public-menu.dto';
import type { RestaurantProfileFormValue } from '../models/restaurant-profile.models';
import { DEMO_RESTAURANT_ID } from '../models/restaurant-profile.models';

export interface ProfileSaveResult {
  mode: 'demo' | 'api';
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
  private demoSnapshot: RestaurantProfileFormValue | null = null;

  /**
   * TODO: Replace demo restaurant ID with authenticated tenant context.
   * TODO: Add Auth Guard before calling admin endpoints.
   */
  saveProfile(formValue: RestaurantProfileFormValue): Observable<ProfileSaveResult> {
    this.demoSnapshot = structuredClone(formValue);

    const restaurantId = DEMO_RESTAURANT_ID;
    const updateRequest = this.toUpdateRestaurantRequest(formValue);
    const settingsRequest = this.toUpdateSettingsRequest(formValue);

    // Real endpoints exist but require auth + known restaurantId.
    // Until auth is wired, keep an in-memory demo save only.
    void restaurantId;
    void updateRequest;
    void settingsRequest;
    void this.http;

    return of({
      mode: 'demo',
      message: 'demo-preview-only',
    });
  }

  getDemoSnapshot(): RestaurantProfileFormValue | null {
    return this.demoSnapshot ? structuredClone(this.demoSnapshot) : null;
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

  private toUpdateRestaurantRequest(form: RestaurantProfileFormValue): UpdateRestaurantApiRequest {
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

  private toUpdateSettingsRequest(
    form: RestaurantProfileFormValue,
  ): UpdateRestaurantSettingsApiRequest {
    return {
      currencyCode: form.currencyCode.trim().toUpperCase(),
      timeZone: form.timeZone.trim(),
      taxRate: 0,
      deliveryFee: 0,
      minimumOrderAmount: 0,
      isDeliveryEnabled: true,
      isPickupEnabled: true,
      workingHoursJson: null,
    };
  }
}

/** @deprecated Use RestaurantProfileApiService */
export { RestaurantProfileApiService as RestaurantProfileApi };
