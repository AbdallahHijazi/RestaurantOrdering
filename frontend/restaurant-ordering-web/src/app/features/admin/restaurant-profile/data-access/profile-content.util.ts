export interface ProfileContentFields {
  name: string;
  description: string;
  address: string;
}

export interface LegacyProfileBilingual {
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  addressAr?: string | null;
  addressEn?: string | null;
}

export interface ResolvedPrimaryProfileContent {
  content: ProfileContentFields;
  missingPrimaryLocale: boolean;
}

export function isLegacyPrimaryLocale(defaultLocale: string): boolean {
  const locale = defaultLocale.trim().toLowerCase();
  return locale === 'ar' || locale === 'en';
}

export function resolvePrimaryProfileContent(
  defaultLocale: string,
  legacy: LegacyProfileBilingual,
): ResolvedPrimaryProfileContent {
  const locale = defaultLocale.trim().toLowerCase();

  if (locale === 'en') {
    return {
      content: {
        name: legacy.nameEn?.trim() || '',
        description: legacy.descriptionEn?.trim() || '',
        address: legacy.addressEn?.trim() || '',
      },
      missingPrimaryLocale: false,
    };
  }

  if (locale === 'ar') {
    return {
      content: {
        name: legacy.nameAr?.trim() || '',
        description: legacy.descriptionAr?.trim() || '',
        address: legacy.addressAr?.trim() || '',
      },
      missingPrimaryLocale: false,
    };
  }

  return {
    content: { name: '', description: '', address: '' },
    missingPrimaryLocale: true,
  };
}

export function syncLegacyFromProfileContent(
  defaultLocale: string,
  content: ProfileContentFields,
  legacy: LegacyProfileBilingual,
): LegacyProfileBilingual {
  const locale = defaultLocale.trim().toLowerCase();

  if (locale === 'en') {
    return {
      ...legacy,
      nameEn: content.name.trim() || null,
      descriptionEn: content.description.trim() || null,
      addressEn: content.address.trim() || null,
    };
  }

  if (locale === 'ar') {
    return {
      ...legacy,
      nameAr: content.name.trim(),
      descriptionAr: content.description.trim() || null,
      addressAr: content.address.trim() || null,
    };
  }

  return legacy;
}

export function toProfileContentRequest(content: ProfileContentFields): {
  name: string;
  description?: string | null;
  address?: string | null;
} {
  const name = content.name.trim();
  const description = content.description.trim();
  const address = content.address.trim();

  return {
    name,
    description: description || null,
    address: address || null,
  };
}
