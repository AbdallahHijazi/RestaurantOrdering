import type { PublicMenuApiDto } from './public-menu.dto';
import type {
  PublicMenuPageData,
  PublicRestaurantOrderSettings,
} from '../models/public-menu.models';
import { resolveApiAssetUrl } from '../../../core/config/resolve-api-asset-url';
import { MOCK_IMAGE_FALLBACK } from './public-menu-mock.data';

function mapOrderSettings(dto: PublicMenuApiDto): PublicRestaurantOrderSettings {
  return {
    currencyCode: dto.currencyCode?.trim() || 'SAR',
    taxRate: dto.taxRate ?? 0,
    deliveryFee: dto.deliveryFee ?? 0,
    minimumOrderAmount: dto.minimumOrderAmount ?? 0,
    isDeliveryEnabled: dto.isDeliveryEnabled ?? true,
    isPickupEnabled: dto.isPickupEnabled ?? true,
  };
}

export function mapPublicMenuApiDto(dto: PublicMenuApiDto): PublicMenuPageData {
  const categories = [...dto.categories]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((category) => ({
      id: category.id,
      nameAr: category.nameAr,
      nameEn: category.nameEn,
      displayOrder: category.displayOrder,
      isActive: true,
    }));

  const items = dto.categories.flatMap((category) =>
    [...category.items]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((item) => ({
        id: item.id,
        categoryId: item.categoryId,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        descriptionAr: item.descriptionAr,
        descriptionEn: item.descriptionEn,
        price: item.price,
        discountPrice: item.discountPrice,
        imageUrl: resolveApiAssetUrl(item.imageUrl ?? null),
        isAvailable: true,
        isPopular: false,
        isVegetarian: false,
      })),
  );

  const orderSettings = mapOrderSettings(dto);

  return {
    restaurant: {
      slug: dto.slug,
      nameAr: dto.nameAr,
      nameEn: dto.nameEn,
      descriptionAr: dto.descriptionAr,
      descriptionEn: dto.descriptionEn,
      logoUrl: dto.logoFileId ? MOCK_IMAGE_FALLBACK : null,
      coverImageUrl: null,
      primaryAccentColor: null,
      countryCode: 'SA',
      currencyCode: orderSettings.currencyCode,
      timeZone: 'Asia/Riyadh',
      phoneNumber: dto.phoneNumber,
      whatsAppNumber: dto.whatsAppNumber,
      addressAr: dto.addressAr,
      addressEn: dto.addressEn,
      isOpen: null,
    },
    orderSettings,
    categories,
    items,
  };
}
