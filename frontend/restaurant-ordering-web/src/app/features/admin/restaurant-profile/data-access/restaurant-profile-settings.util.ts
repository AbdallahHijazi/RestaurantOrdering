import type { RestaurantSettingsApiDto, UpdateRestaurantSettingsApiRequest } from '../../../public-menu/data-access/public-menu.dto';
import type {
  RestaurantProfileFormValue,
  RestaurantSettingsSnapshot,
} from '../models/restaurant-profile.models';

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

export function buildUpdateSettingsRequest(
  form: Pick<
    RestaurantProfileFormValue,
    | 'currencyCode'
    | 'timeZone'
    | 'taxRate'
    | 'deliveryFee'
    | 'minimumOrderAmount'
    | 'isDeliveryEnabled'
    | 'isPickupEnabled'
  >,
  snapshot: RestaurantSettingsSnapshot,
): UpdateRestaurantSettingsApiRequest {
  return {
    currencyCode: form.currencyCode.trim().toUpperCase(),
    timeZone: form.timeZone.trim(),
    taxRate: form.taxRate,
    deliveryFee: form.deliveryFee,
    minimumOrderAmount: form.minimumOrderAmount,
    isDeliveryEnabled: form.isDeliveryEnabled,
    isPickupEnabled: form.isPickupEnabled,
    workingHoursJson: snapshot.workingHoursJson,
  };
}

export function mapSettingsDtoToFormPatch(
  settings: RestaurantSettingsApiDto,
): Pick<
  RestaurantProfileFormValue,
  | 'currencyCode'
  | 'timeZone'
  | 'taxRate'
  | 'deliveryFee'
  | 'minimumOrderAmount'
  | 'isDeliveryEnabled'
  | 'isPickupEnabled'
> {
  return {
    currencyCode: settings.currencyCode,
    timeZone: settings.timeZone,
    taxRate: settings.taxRate,
    deliveryFee: settings.deliveryFee,
    minimumOrderAmount: settings.minimumOrderAmount,
    isDeliveryEnabled: settings.isDeliveryEnabled,
    isPickupEnabled: settings.isPickupEnabled,
  };
}

export function createSettingsSnapshot(
  settings: RestaurantSettingsApiDto,
): RestaurantSettingsSnapshot {
  return {
    workingHoursJson: settings.workingHoursJson ?? null,
  };
}

export function isCurrencyCodeValid(value: string): boolean {
  return CURRENCY_CODE_PATTERN.test(value.trim().toUpperCase());
}

export function isOrderingMethodEnabled(
  isPickupEnabled: boolean,
  isDeliveryEnabled: boolean,
): boolean {
  return isPickupEnabled || isDeliveryEnabled;
}
