import { Injectable, signal } from '@angular/core';
import type { ContentLocale, LocaleMetadata, TextDirection } from './locale.types';

const FALLBACK_DIRECTION_REGISTRY: Readonly<Record<string, TextDirection>> = {
  ar: 'rtl',
  fa: 'rtl',
  he: 'rtl',
  en: 'ltr',
  fr: 'ltr',
  de: 'ltr',
};

export function getFallbackDirection(localeCode: ContentLocale): TextDirection {
  const normalized = localeCode.trim().toLowerCase();
  if (!normalized) {
    return 'ltr';
  }

  return FALLBACK_DIRECTION_REGISTRY[normalized] ?? 'ltr';
}

@Injectable({
  providedIn: 'root',
})
export class DirectionService {
  private readonly metadataByCode = signal<ReadonlyMap<string, LocaleMetadata>>(new Map());

  registerLocales(locales: readonly LocaleMetadata[]): void {
    const next = new Map<string, LocaleMetadata>();
    for (const locale of locales) {
      const code = locale.code.trim().toLowerCase();
      if (!code) {
        continue;
      }

      next.set(code, {
        ...locale,
        code,
        direction: normalizeDirection(locale.direction),
      });
    }

    this.metadataByCode.set(next);
  }

  getDirection(localeCode: ContentLocale): TextDirection {
    const normalized = localeCode.trim().toLowerCase();
    if (!normalized) {
      return 'ltr';
    }

    const fromMetadata = this.metadataByCode().get(normalized);
    if (fromMetadata) {
      return fromMetadata.direction;
    }

    return FALLBACK_DIRECTION_REGISTRY[normalized] ?? 'ltr';
  }

  applyDocumentDirection(localeCode: ContentLocale): void {
    const direction = this.getDirection(localeCode);
    const normalized = localeCode.trim().toLowerCase() || 'ar';
    document.documentElement.lang = normalized;
    document.documentElement.dir = direction;
  }
}

export function normalizeDirection(value: string | null | undefined): TextDirection {
  return value?.trim().toLowerCase() === 'rtl' ? 'rtl' : 'ltr';
}
