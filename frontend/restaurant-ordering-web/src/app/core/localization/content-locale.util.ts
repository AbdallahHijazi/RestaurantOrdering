import type { ContentLocale, LocalizedText, TextDirection } from './locale.types';

export function pickResolvedOrLegacyText(
  resolved: string | null | undefined,
  locale: ContentLocale,
  legacy: LocalizedText | null | undefined,
  fallback: string,
  getDirection: (code: ContentLocale) => TextDirection,
): string {
  const resolvedValue = resolved?.trim();
  if (resolvedValue) {
    return resolvedValue;
  }

  return pickLegacyBilingualText(locale, legacy, fallback, getDirection);
}

export function pickLegacyBilingualText(
  locale: ContentLocale,
  text: LocalizedText | null | undefined,
  fallback: string,
  getDirection: (code: ContentLocale) => TextDirection,
): string {
  if (!text) {
    return fallback;
  }

  const rtl = getDirection(locale) === 'rtl';
  const primary = rtl ? text.ar : text.en;
  const secondary = rtl ? text.en : text.ar;
  const chosen = (primary?.trim() || secondary?.trim() || '').trim();
  return chosen || fallback;
}

export function pickSecondaryLegacyText(
  locale: ContentLocale,
  legacy: LocalizedText,
  primaryDisplay: string,
  getDirection: (code: ContentLocale) => TextDirection,
): string {
  const rtl = getDirection(locale) === 'rtl';
  const secondary = rtl ? legacy.en?.trim() : legacy.ar?.trim();
  return secondary && secondary !== primaryDisplay ? secondary : '';
}

export function normalizeContentLocale(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function isAdminUiLocale(value: string | null | undefined): value is 'ar' | 'en' {
  return value === 'ar' || value === 'en';
}
