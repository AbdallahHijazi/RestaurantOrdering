import type { LocaleMetadata, RestaurantLocaleSettings } from '../../../../core/localization/locale.types';

export interface LegacyBilingualContent {
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
}

export interface AdminPrimaryLocaleFields {
  primaryName?: string | null;
  primaryDescription?: string | null;
  primaryLocale?: string | null;
  primaryFallbackApplied?: boolean;
}

export interface PrimaryLocaleContent {
  name: string;
  description: string;
}

export interface ResolvedEditPrimaryContent {
  content: PrimaryLocaleContent;
  missingPrimaryLocale: boolean;
}

export function isLegacyPrimaryLocale(defaultLocale: string): boolean {
  const locale = defaultLocale.trim().toLowerCase();
  return locale === 'ar' || locale === 'en';
}

export function resolveEditPrimaryContent(
  defaultLocale: string,
  entity: LegacyBilingualContent & AdminPrimaryLocaleFields,
): ResolvedEditPrimaryContent {
  const locale = defaultLocale.trim().toLowerCase();

  if (entity.primaryName !== undefined && entity.primaryName !== null) {
    const primaryLocale = entity.primaryLocale?.trim().toLowerCase() ?? locale;
    const fallback = entity.primaryFallbackApplied === true;

    if (!isLegacyPrimaryLocale(locale)) {
      const hasPublishedPrimary =
        !fallback && primaryLocale === locale && entity.primaryName.trim().length > 0;

      if (!hasPublishedPrimary) {
        return {
          content: { name: '', description: '' },
          missingPrimaryLocale: true,
        };
      }
    }

    return {
      content: {
        name: entity.primaryName.trim(),
        description: entity.primaryDescription?.trim() ?? '',
      },
      missingPrimaryLocale: false,
    };
  }

  if (locale === 'en') {
    return {
      content: {
        name: entity.nameEn?.trim() || '',
        description: entity.descriptionEn?.trim() || '',
      },
      missingPrimaryLocale: false,
    };
  }

  if (locale === 'ar') {
    return {
      content: {
        name: entity.nameAr?.trim() || '',
        description: entity.descriptionAr?.trim() || '',
      },
      missingPrimaryLocale: false,
    };
  }

  return {
    content: { name: '', description: '' },
    missingPrimaryLocale: true,
  };
}

export function resolveCatalogSaveContent(
  defaultLocale: string,
  entity: LegacyBilingualContent & AdminPrimaryLocaleFields,
): PrimaryLocaleContent {
  const edit = resolveEditPrimaryContent(defaultLocale, entity);
  if (edit.content.name.trim()) {
    return edit.content;
  }

  if (entity.primaryName?.trim()) {
    return {
      name: entity.primaryName.trim(),
      description: entity.primaryDescription?.trim() ?? '',
    };
  }

  return resolvePrimaryLocaleContent(defaultLocale, entity);
}

export function resolvePrimaryLocaleContent(
  defaultLocale: string,
  legacy: LegacyBilingualContent & AdminPrimaryLocaleFields,
): PrimaryLocaleContent {
  if (legacy.primaryName?.trim()) {
    return {
      name: legacy.primaryName.trim(),
      description: legacy.primaryDescription?.trim() ?? '',
    };
  }

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

export function primarySortName(
  defaultLocale: string,
  legacy: LegacyBilingualContent & AdminPrimaryLocaleFields,
): string {
  return resolvePrimaryLocaleContent(defaultLocale, legacy).name;
}
