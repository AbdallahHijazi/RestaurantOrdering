import { describe, expect, it } from 'vitest';
import { mapPublicMenuApiDto } from './public-menu.mapper';
import type { PublicMenuApiDto } from './public-menu.dto';

describe('mapPublicMenuApiDto', () => {
  it('maps currency tax delivery minimum and service flags', () => {
    const dto: PublicMenuApiDto = {
      id: '11111111-1111-1111-1111-111111111111',
      slug: 'restaurant-a',
      nameAr: 'مطعم',
      phoneNumber: '+966500000000',
      currencyCode: 'SAR',
      taxRate: 15,
      deliveryFee: 12.5,
      minimumOrderAmount: 50,
      isDeliveryEnabled: true,
      isPickupEnabled: false,
      categories: [],
    };

    const mapped = mapPublicMenuApiDto(dto);

    expect(mapped.orderSettings).toEqual({
      currencyCode: 'SAR',
      taxRate: 15,
      deliveryFee: 12.5,
      minimumOrderAmount: 50,
      isDeliveryEnabled: true,
      isPickupEnabled: false,
    });
    expect(mapped.restaurant.currencyCode).toBe('SAR');
  });
});
