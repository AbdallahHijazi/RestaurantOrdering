export interface RestaurantProfileFormValue {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  slug: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  primaryAccentColor: string;
  countryCode: string;
  defaultLocale: 'ar' | 'en';
  supportedLocales: ('ar' | 'en')[];
  currencyCode: string;
  timeZone: string;
  phoneCountryCode: string;
  phoneNumber: string;
  whatsAppNumber: string;
  email: string;
  city: string;
  addressAr: string;
  addressEn: string;
}

export interface RestaurantProfilePreviewData {
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
}

/** Demo restaurant ID used until auth provides the real tenant context. */
export const DEMO_RESTAURANT_ID = '00000000-0000-0000-0000-000000000001';
