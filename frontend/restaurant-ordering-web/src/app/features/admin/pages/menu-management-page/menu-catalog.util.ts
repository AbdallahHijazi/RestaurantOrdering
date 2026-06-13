import type { LocaleMetadata, RestaurantLocaleSettings } from '../../../../core/localization/locale.types';

export interface LegacyBilingualContent {
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
}

export interface PrimaryLocaleContent {
  name: string;
  description: string;
}

export function resolvePrimaryLocaleContent(
  defaultLocale: string,
  legacy: LegacyBilingualContent,
): PrimaryLocaleContent {
  const locale = defaultLocale.trim().toLowerCase();

  if (locale === 'en') {
    return {
      name: legacy.nameEn?.trim() || legacy.nameAr,
      description: legacy.descriptionEn?.trim() || legacy.descriptionAr?.trim() || '',
    };
  }

  return {
    name: legacy.nameAr,
    description: legacy.descriptionAr?.trim() || '',
  };
}

export function formatPrimaryLanguageLabel(settings: RestaurantLocaleSettings): string {
  const code = settings.defaultLocale.trim().toLowerCase();
  const metadata = settings.availableLocales.find((locale) => locale.code === code);
  return formatLocaleDisplayName(metadata, code);
}

export function formatLocaleDisplayName(metadata: LocaleMetadata | undefined, code: string): string {
  if (metadata?.nativeName?.trim()) {
    return metadata.nativeName.trim();
  }

  if (metadata?.displayName?.trim()) {
    return metadata.displayName.trim();
  }

  return code.toUpperCase();
}

export function primarySortName(defaultLocale: string, legacy: LegacyBilingualContent): string {
  return resolvePrimaryLocaleContent(defaultLocale, legacy).name;
}
