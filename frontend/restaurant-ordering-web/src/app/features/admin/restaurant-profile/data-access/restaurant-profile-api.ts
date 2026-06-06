import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../../core/config/api-config';
import { AuthService } from '../../../../core/auth/auth.service';
import type { UploadedMediaFile } from '../../data-access/admin-menu.models';
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

export interface SetRestaurantLogoApiRequest {
  mediaFileId: string;
}

export interface SetRestaurantCoverImageApiRequest {
  mediaFileId: string;
}

export interface BrandingSaveContext {
  pendingLogoFile: File | null;
  pendingCoverFile: File | null;
  uploadedLogo: UploadedMediaFile | null;
  uploadedCover: UploadedMediaFile | null;
}

export interface BrandingSaveResult {
  mode: 'api';
  restaurant: RestaurantApiDto;
  uploadedLogo: UploadedMediaFile | null;
  uploadedCover: UploadedMediaFile | null;
}

export type BrandingSaveError =
  | 'logo-upload'
  | 'cover-upload'
  | 'profile-save'
  | 'profile-reload';

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

  saveRestaurantProfileWithBranding(
    formValue: RestaurantProfileFormValue,
    branding: BrandingSaveContext,
  ): Observable<BrandingSaveResult | ProfileSaveResult> {
    const restaurantId = this.authService.restaurantId();
    if (!restaurantId) {
      this.demoSnapshot = structuredClone(formValue);
      return of({
        mode: 'demo',
        scope: 'restaurant',
        message: 'demo-preview-only',
      });
    }

    return this.uploadPendingMedia(restaurantId, branding.pendingLogoFile, branding.uploadedLogo).pipe(
      catchError(() => throwError(() => ({ type: 'logo-upload' satisfies BrandingSaveError }))),
      switchMap((uploadedLogo) =>
        this.uploadPendingMedia(restaurantId, branding.pendingCoverFile, branding.uploadedCover).pipe(
          catchError(() => throwError(() => ({ type: 'cover-upload' satisfies BrandingSaveError }))),
          switchMap((uploadedCover) => {
            const updateRequest = this.toUpdateRestaurantRequest(formValue);
            return this.updateRestaurant(restaurantId, updateRequest).pipe(
              catchError(() => throwError(() => ({ type: 'profile-save' satisfies BrandingSaveError }))),
              switchMap((restaurant) => {
                const logoLink$ = uploadedLogo
                  ? this.setRestaurantLogo(restaurantId, uploadedLogo.id).pipe(
                      catchError(() =>
                        throwError(() => ({ type: 'profile-save' satisfies BrandingSaveError })),
                      ),
                    )
                  : of(restaurant);

                return logoLink$.pipe(
                  switchMap((afterLogo) => {
                    if (!uploadedCover) {
                      return of({
                        mode: 'api' as const,
                        restaurant: afterLogo,
                        uploadedLogo,
                        uploadedCover,
                      });
                    }

                    return this.setRestaurantCoverImage(restaurantId, uploadedCover.id).pipe(
                      catchError(() =>
                        throwError(() => ({ type: 'profile-save' satisfies BrandingSaveError })),
                      ),
                      map((afterCover) => ({
                        mode: 'api' as const,
                        restaurant: afterCover,
                        uploadedLogo,
                        uploadedCover,
                      })),
                    );
                  }),
                );
              }),
            );
          }),
        ),
      ),
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

  uploadMedia(restaurantId: string, file: File): Observable<UploadedMediaFile> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<UploadedMediaFile>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/media`,
      formData,
    );
  }

  setRestaurantLogo(
    restaurantId: string,
    mediaFileId: string,
  ): Observable<RestaurantApiDto> {
    const body: SetRestaurantLogoApiRequest = { mediaFileId };
    return this.http.put<RestaurantApiDto>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/logo`,
      body,
    );
  }

  setRestaurantCoverImage(
    restaurantId: string,
    mediaFileId: string,
  ): Observable<RestaurantApiDto> {
    const body: SetRestaurantCoverImageApiRequest = { mediaFileId };
    return this.http.put<RestaurantApiDto>(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/cover-image`,
      body,
    );
  }

  private uploadPendingMedia(
    restaurantId: string,
    pendingFile: File | null,
    uploaded: UploadedMediaFile | null,
  ): Observable<UploadedMediaFile | null> {
    if (uploaded) {
      return of(uploaded);
    }

    if (!pendingFile) {
      return of(null);
    }

    return this.uploadMedia(restaurantId, pendingFile);
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
      accentColor: form.primaryAccentColor.trim(),
    };
  }
}

/** @deprecated Use RestaurantProfileApiService */
export { RestaurantProfileApiService as RestaurantProfileApi };
