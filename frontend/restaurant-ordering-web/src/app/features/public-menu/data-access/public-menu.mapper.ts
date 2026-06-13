import type { PublicMenuApiDto } from './public-menu.dto';
import type {
  PublicMenuPageData,
  PublicRestaurantOrderSettings,
} from '../models/public-menu.models';
import { resolveApiAssetUrl } from '../../../core/config/resolve-api-asset-url';
import { normalizeDirection } from '../../../core/localization/direction.service';

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

function mapLocaleContext(dto: PublicMenuApiDto) {
  const resolvedLocale = dto.resolvedLocale?.trim().toLowerCase() || 'ar';
  return {
    requestedLocale: dto.requestedLocale?.trim().toLowerCase() || null,
    resolvedLocale,
    fallbackApplied: dto.fallbackApplied ?? false,
    direction: normalizeDirection(dto.direction),
  };
}

export function mapPublicMenuApiDto(dto: PublicMenuApiDto): PublicMenuPageData {
  const categories = [...dto.categories]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((category) => ({
      id: category.id,
      nameAr: category.nameAr,
      nameEn: category.nameEn,
      name: category.name,
      description: category.description,
      displayOrder: category.displayOrder,
      isActive: true,
      resolvedLocale: category.resolvedLocale,
      fallbackApplied: category.fallbackApplied ?? false,
    }));

  const items = dto.categories.flatMap((category) =>
    [...category.items]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((item) => ({
        id: item.id,
        categoryId: item.categoryId,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        name: item.name,
        descriptionAr: item.descriptionAr,
        descriptionEn: item.descriptionEn,
        description: item.description,
        price: item.price,
        discountPrice: item.discountPrice,
        imageUrl: resolveApiAssetUrl(item.imageUrl ?? null),
        isAvailable: true,
        isPopular: false,
        isVegetarian: false,
        resolvedLocale: item.resolvedLocale,
        fallbackApplied: item.fallbackApplied ?? false,
      })),
  );

  const orderSettings = mapOrderSettings(dto);

  return {
    restaurant: {
      slug: dto.slug,
      nameAr: dto.nameAr,
      nameEn: dto.nameEn,
      name: dto.name,
      descriptionAr: dto.descriptionAr,
      descriptionEn: dto.descriptionEn,
      description: dto.description,
      logoUrl: resolveApiAssetUrl(dto.logoUrl ?? null),
      coverImageUrl: resolveApiAssetUrl(dto.coverImageUrl ?? null),
      primaryAccentColor: dto.accentColor ?? null,
      countryCode: 'SA',
      currencyCode: orderSettings.currencyCode,
      timeZone: 'Asia/Riyadh',
      phoneNumber: dto.phoneNumber,
      whatsAppNumber: dto.whatsAppNumber,
      addressAr: dto.addressAr,
      addressEn: dto.addressEn,
      address: dto.address,
      isOpen: null,
    },
    orderSettings,
    categories,
    items,
    locale: mapLocaleContext(dto),
  };
}
