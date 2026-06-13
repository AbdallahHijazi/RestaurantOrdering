import { describe, expect, it } from 'vitest';
import { mapPublicMenuApiDto } from './public-menu.mapper';
import type { PublicMenuApiDto } from './public-menu.dto';

describe('public menu locale integration', () => {
  it('maps locale metadata and resolved content fields from API', () => {
    const dto: PublicMenuApiDto = {
      id: '11111111-1111-1111-1111-111111111111',
      slug: 'restaurant-a',
      nameAr: 'مطعم',
      nameEn: 'Restaurant',
      name: 'Le Restaurant',
      description: 'Menu en français',
      address: 'Paris',
      phoneNumber: '+966500000000',
      requestedLocale: 'fr',
      resolvedLocale: 'fr',
      fallbackApplied: false,
      direction: 'ltr',
      categories: [
        {
          id: 'cat-1',
          nameAr: 'تصنيف',
          nameEn: 'Category',
          name: 'Catégorie',
          displayOrder: 0,
          resolvedLocale: 'fr',
          fallbackApplied: false,
          items: [
            {
              id: 'item-1',
              categoryId: 'cat-1',
              nameAr: 'طبق',
              nameEn: 'Dish',
              name: 'Plat',
              description: 'Description FR',
              price: 10,
              displayOrder: 0,
              resolvedLocale: 'fr',
              fallbackApplied: false,
            },
          ],
        },
      ],
    };

    const mapped = mapPublicMenuApiDto(dto);

    expect(mapped.locale).toEqual({
      requestedLocale: 'fr',
      resolvedLocale: 'fr',
      fallbackApplied: false,
      direction: 'ltr',
    });
    expect(mapped.restaurant.name).toBe('Le Restaurant');
    expect(mapped.categories[0]?.name).toBe('Catégorie');
    expect(mapped.items[0]?.name).toBe('Plat');
    expect(mapped.items[0]?.description).toBe('Description FR');
  });
});
