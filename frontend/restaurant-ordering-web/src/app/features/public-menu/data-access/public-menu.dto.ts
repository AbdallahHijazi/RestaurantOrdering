/** Backend contract: GET /api/v1/public/restaurants/{slug}/menu */
export interface PublicMenuApiDto {
  id: string;
  slug: string;
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  logoFileId?: string | null;
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
  categories: PublicMenuCategoryApiDto[];
}

export interface PublicMenuCategoryApiDto {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  displayOrder: number;
  items: PublicMenuItemApiDto[];
}

export interface PublicMenuItemApiDto {
  id: string;
  categoryId: string;
  imageFileId?: string | null;
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  price: number;
  discountPrice?: number | null;
  displayOrder: number;
  imageUrl?: string | null;
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
  phoneNumber: string;
  whatsAppNumber?: string | null;
  addressAr?: string | null;
  addressEn?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
}
