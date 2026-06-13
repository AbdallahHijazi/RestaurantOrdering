import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import { DirectionService } from './direction.service';
import type { LocaleMetadata, RestaurantLocaleSettings, UpdateRestaurantLocaleSettingsPayload } from './locale.types';
import {
  mapRestaurantLocaleSettingsDto,
  mapSystemLocaleDto,
  toUpdateRestaurantLocaleSettingsRequest,
  type RestaurantLocaleSettingsApiDto,
  type SystemLocaleApiDto,
} from './locale-api.models';

@Injectable({
  providedIn: 'root',
})
export class LocaleApiService {
  private readonly http = inject(HttpClient);
  private readonly directionService = inject(DirectionService);

  getSystemLocales(): Observable<LocaleMetadata[]> {
    return this.http.get<SystemLocaleApiDto[]>(`${API_BASE_URL}/api/v1/system/locales`).pipe(
      map((items) => items.map(mapSystemLocaleDto)),
      tap((locales) => this.directionService.registerLocales(locales)),
    );
  }

  getRestaurantLocaleSettings(restaurantId: string): Observable<RestaurantLocaleSettings> {
    return this.http
      .get<RestaurantLocaleSettingsApiDto>(
        `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/locales`,
      )
      .pipe(
        map(mapRestaurantLocaleSettingsDto),
        tap((settings) => this.directionService.registerLocales(settings.availableLocales)),
      );
  }

  updateRestaurantLocaleSettings(
    restaurantId: string,
    payload: UpdateRestaurantLocaleSettingsPayload,
  ): Observable<RestaurantLocaleSettings> {
    return this.http
      .put<RestaurantLocaleSettingsApiDto>(
        `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/locales`,
        toUpdateRestaurantLocaleSettingsRequest(payload),
      )
      .pipe(
        map(mapRestaurantLocaleSettingsDto),
        tap((settings) => this.directionService.registerLocales(settings.availableLocales)),
      );
  }
}
