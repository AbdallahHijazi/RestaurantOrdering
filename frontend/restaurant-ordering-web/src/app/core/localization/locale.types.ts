export type TextDirection = 'rtl' | 'ltr';

/** Admin shell UI — fixed ar/en dictionaries only. */
export type AdminUiLocale = 'ar' | 'en';

/** Restaurant content locales — dynamic codes from API (ar, en, fr, de, …). */
export type ContentLocale = string;

/** @deprecated Use AdminUiLocale for admin UI; ContentLocale for menu content. */
export type SupportedLocale = AdminUiLocale;

export interface LocaleMetadata {
  code: string;
  displayName: string;
  nativeName: string;
  direction: TextDirection;
}

export interface RestaurantSupportedLocale {
  code: string;
  isEnabled: boolean;
  sortOrder: number;
}

export interface RestaurantLocaleSettings {
  defaultLocale: string;
  translationMode: string;
  supportedLocales: RestaurantSupportedLocale[];
  availableLocales: LocaleMetadata[];
  canManageLocales: boolean;
}

export interface UpdateRestaurantLocaleSettingsPayload {
  defaultLocale: string;
  translationMode: string;
  supportedLocales: RestaurantSupportedLocale[];
}

export interface PublicMenuLocaleContext {
  requestedLocale: string | null;
  resolvedLocale: string;
  fallbackApplied: boolean;
  direction: TextDirection;
}

export interface LocalizedText {
  ar?: string | null;
  en?: string | null;
}
