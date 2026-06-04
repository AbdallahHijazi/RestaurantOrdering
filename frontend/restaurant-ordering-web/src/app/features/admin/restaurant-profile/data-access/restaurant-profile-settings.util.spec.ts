import { describe, expect, it } from 'vitest';
import {
  buildUpdateSettingsRequest,
  createSettingsSnapshot,
  isCurrencyCodeValid,
  isOrderingMethodEnabled,
  mapSettingsDtoToFormPatch,
} from './restaurant-profile-settings.util';

describe('restaurant-profile-settings.util', () => {
  const baseForm = {
    currencyCode: 'SAR',
    timeZone: 'Asia/Riyadh',
    taxRate: 15,
    deliveryFee: 12.5,
    minimumOrderAmount: 50,
    isDeliveryEnabled: true,
    isPickupEnabled: false,
  };

  it('buildUpdateSettingsRequest preserves loaded values and hidden fields', () => {
    const request = buildUpdateSettingsRequest(baseForm, {
      workingHoursJson: '{"mon":"9-17"}',
    });

    expect(request).toEqual({
      currencyCode: 'SAR',
      timeZone: 'Asia/Riyadh',
      taxRate: 15,
      deliveryFee: 12.5,
      minimumOrderAmount: 50,
      isDeliveryEnabled: true,
      isPickupEnabled: false,
      workingHoursJson: '{"mon":"9-17"}',
    });
  });

  it('maps GET settings dto into form patch', () => {
    const patch = mapSettingsDtoToFormPatch({
      id: '1',
      restaurantId: '2',
      currencyCode: 'USD',
      timeZone: 'UTC',
      taxRate: 5,
      deliveryFee: 3,
      minimumOrderAmount: 20,
      isDeliveryEnabled: false,
      isPickupEnabled: true,
      workingHoursJson: null,
    });

    expect(patch.taxRate).toBe(5);
    expect(patch.deliveryFee).toBe(3);
    expect(patch.minimumOrderAmount).toBe(20);
  });

  it('creates snapshot without clearing workingHoursJson', () => {
    expect(
      createSettingsSnapshot({
        id: '1',
        restaurantId: '2',
        currencyCode: 'SAR',
        timeZone: 'Asia/Riyadh',
        taxRate: 0,
        deliveryFee: 0,
        minimumOrderAmount: 0,
        isDeliveryEnabled: true,
        isPickupEnabled: true,
        workingHoursJson: '[]',
      }).workingHoursJson,
    ).toBe('[]');
  });

  it('validates currency code format', () => {
    expect(isCurrencyCodeValid('sar')).toBe(true);
    expect(isCurrencyCodeValid('SA')).toBe(false);
  });

  it('requires at least one ordering method', () => {
    expect(isOrderingMethodEnabled(true, false)).toBe(true);
    expect(isOrderingMethodEnabled(false, true)).toBe(true);
    expect(isOrderingMethodEnabled(false, false)).toBe(false);
  });
});
