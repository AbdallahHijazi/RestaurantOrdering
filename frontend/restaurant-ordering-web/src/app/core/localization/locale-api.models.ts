import type {
  LocaleMetadata,
  RestaurantLocaleSettings,
  RestaurantSupportedLocale,
  UpdateRestaurantLocaleSettingsPayload,
} from './locale.types';
import { normalizeDirection } from './direction.service';

/** Backend contract: GET /api/v1/system/locales */
export interface SystemLocaleApiDto {
  code: string;
  displayName: string;
  nativeName: string;
  direction: string;
}

/** Backend contract: GET/PUT /api/v1/admin/restaurants/{restaurantId}/locales */
export interface RestaurantSupportedLocaleApiDto {
  code: string;
  isEnabled: boolean;
  sortOrder: number;
}

export interface RestaurantLocaleSettingsApiDto {
  defaultLocale: string;
  translationMode: string;
  supportedLocales: RestaurantSupportedLocaleApiDto[];
  availableLocales: SystemLocaleApiDto[];
  canManageLocales: boolean;
}

export interface UpdateRestaurantLocaleSettingsApiRequest {
  defaultLocale: string;
  translationMode: string;
  supportedLocales: RestaurantSupportedLocaleApiDto[];
}

export function mapSystemLocaleDto(dto: SystemLocaleApiDto): LocaleMetadata {
  return {
    code: dto.code.trim().toLowerCase(),
    displayName: dto.displayName,
    nativeName: dto.nativeName,
    direction: normalizeDirection(dto.direction),
  };
}

export function mapRestaurantLocaleSettingsDto(
  dto: RestaurantLocaleSettingsApiDto,
): RestaurantLocaleSettings {
  return {
    defaultLocale: dto.defaultLocale.trim().toLowerCase(),
    translationMode: dto.translationMode,
    supportedLocales: dto.supportedLocales.map(mapRestaurantSupportedLocaleDto),
    availableLocales: dto.availableLocales.map(mapSystemLocaleDto),
    canManageLocales: dto.canManageLocales,
  };
}

export function mapRestaurantSupportedLocaleDto(
  dto: RestaurantSupportedLocaleApiDto,
): RestaurantSupportedLocale {
  return {
    code: dto.code.trim().toLowerCase(),
    isEnabled: dto.isEnabled,
    sortOrder: dto.sortOrder,
  };
}

export function toUpdateRestaurantLocaleSettingsRequest(
  payload: UpdateRestaurantLocaleSettingsPayload,
): UpdateRestaurantLocaleSettingsApiRequest {
  return {
    defaultLocale: payload.defaultLocale.trim().toLowerCase(),
    translationMode: payload.translationMode,
    supportedLocales: payload.supportedLocales.map((locale) => ({
      code: locale.code.trim().toLowerCase(),
      isEnabled: locale.isEnabled,
      sortOrder: locale.sortOrder,
    })),
  };
}
