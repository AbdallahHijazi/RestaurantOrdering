import type { LocalizedText, SupportedLocale } from '../../../core/localization/locale';

export interface RestaurantPublicProfile {
  slug: string;
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  primaryAccentColor?: string | null;
  countryCode: string;
  currencyCode: string;
  timeZone?: string | null;
  phoneNumber?: string | null;
  whatsAppNumber?: string | null;
  addressAr?: string | null;
  addressEn?: string | null;
  isOpen?: boolean | null;
}

export interface PublicMenuCategory {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface PublicMenuItem {
  id: string;
  categoryId: string;
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  price: number;
  discountPrice?: number | null;
  imageUrl?: string | null;
  isAvailable: boolean;
  isPopular?: boolean;
  isVegetarian?: boolean;
}

export interface PublicRestaurantOrderSettings {
  currencyCode: string;
  taxRate: number;
  deliveryFee: number;
  minimumOrderAmount: number;
  isDeliveryEnabled: boolean;
  isPickupEnabled: boolean;
}

export interface PublicMenuPageData {
  restaurant: RestaurantPublicProfile;
  orderSettings: PublicRestaurantOrderSettings;
  categories: PublicMenuCategory[];
  items: PublicMenuItem[];
}

/** Backend OrderType: Pickup = 1, Delivery = 2 */
export const ORDER_TYPE_PICKUP = 1 as const;
export const ORDER_TYPE_DELIVERY = 2 as const;
export type PublicOrderType = typeof ORDER_TYPE_PICKUP | typeof ORDER_TYPE_DELIVERY;

/** Backend OrderStatus values used in confirmation display */
export const ORDER_STATUS_NEW = 1 as const;

export const PUBLIC_CART_MAX_QUANTITY = 99;
export const PUBLIC_CART_MIN_QUANTITY = 1;

export interface MenuItemCardLabels {
  add: string;
  added: string;
  soldOut: string;
  popular: string;
  vegetarian: string;
}

export function getMenuItemLabels(locale: SupportedLocale): MenuItemCardLabels {
  return locale === 'ar'
    ? {
        add: 'أضف',
        added: 'تمت الإضافة',
        soldOut: 'غير متوفر',
        popular: 'الأكثر طلبًا',
        vegetarian: 'نباتي',
      }
    : {
        add: 'Add',
        added: 'Added',
        soldOut: 'Sold Out',
        popular: 'Popular',
        vegetarian: 'Vegetarian',
      };
}

export type { LocalizedText, SupportedLocale };
