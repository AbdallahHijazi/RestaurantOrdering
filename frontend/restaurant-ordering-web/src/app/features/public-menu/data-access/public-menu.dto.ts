import type { MenuItemSize, MenuPrice } from '../../../shared/models/menu-item-size';

/** Backend contract: GET /api/v1/public/restaurants/{slug}/menu */
export interface PublicMenuApiDto {
  id: string;
  slug: string;
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  logoFileId?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  accentColor?: string | null;
  phoneNumber: string;
  whatsAppNumber?: string | null;
  addressAr?: string | null;
  addressEn?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  currencyCode?: string | null;
  taxRate?: number | null;
  deliveryFee?: number | null;
  minimumOrderAmount?: number | null;
  isDeliveryEnabled?: boolean | null;
  isPickupEnabled?: boolean | null;
  requestedLocale?: string | null;
  resolvedLocale?: string | null;
  fallbackApplied?: boolean | null;
  direction?: string | null;
  name?: string | null;
  description?: string | null;
  address?: string | null;
  /** Languages the restaurant offers publicly (so anonymous visitors never call admin endpoints). */
  supportedLocales?: PublicMenuLocaleApiDto[] | null;
  categories: PublicMenuCategoryApiDto[];
}

export interface PublicMenuLocaleApiDto {
  code: string;
  displayName?: string | null;
  nativeName?: string | null;
  direction?: string | null;
  isDefault?: boolean | null;
}

export interface PublicMenuCategoryApiDto {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  displayOrder: number;
  name?: string | null;
  description?: string | null;
  resolvedLocale?: string | null;
  fallbackApplied?: boolean | null;
  items: PublicMenuItemApiDto[];
}

export interface PublicMenuItemApiDto {
  usesSizes?: boolean;
  sizes?: readonly MenuItemSize[] | null;
  id: string;
  categoryId: string;
  imageFileId?: string | null;
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  price: number;
  discountPrice?: number | null;
  pricing?: MenuPrice | null;
  sizePrices?: Record<string, MenuPrice> | null;
  displayOrder: number;
  imageUrl?: string | null;
  name?: string | null;
  description?: string | null;
  resolvedLocale?: string | null;
  fallbackApplied?: boolean | null;
}

/** Backend contract: PUT /api/v1/admin/restaurants/{restaurantId} */
export interface UpdateRestaurantApiRequest {
  slug: string;
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  phoneNumber: string;
  whatsAppNumber?: string | null;
  addressAr?: string | null;
  addressEn?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accentColor: string;
  /** Optional on the wire: omitted = keep stored value; empty string clears Email/City. */
  countryCode?: string | null;
  phoneCountryCode?: string | null;
  email?: string | null;
  city?: string | null;
}

/** Backend contract: GET/PUT settings */
export interface RestaurantSettingsApiDto {
  id: string;
  restaurantId: string;
  currencyCode: string;
  timeZone: string;
  taxRate: number;
  deliveryFee: number;
  minimumOrderAmount: number;
  isDeliveryEnabled: boolean;
  isPickupEnabled: boolean;
  workingHoursJson?: string | null;
}

export interface UpdateRestaurantSettingsApiRequest {
  currencyCode: string;
  timeZone: string;
  taxRate: number;
  deliveryFee: number;
  minimumOrderAmount: number;
  isDeliveryEnabled: boolean;
  isPickupEnabled: boolean;
  workingHoursJson?: string | null;
}

export interface RestaurantApiDto {
  id: string;
  ownerId: string;
  slug: string;
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  logoFileId?: string | null;
  logoUrl?: string | null;
  coverImageFileId?: string | null;
  coverImageUrl?: string | null;
  accentColor?: string;
  phoneNumber: string;
  whatsAppNumber?: string | null;
  countryCode?: string | null;
  phoneCountryCode?: string | null;
  email?: string | null;
  city?: string | null;
  addressAr?: string | null;
  addressEn?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
}
