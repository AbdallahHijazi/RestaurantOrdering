import { describe, expect, it } from 'vitest';
import type { ContentLocale, LocaleMetadata, RestaurantLocaleSettings } from './locale.types';

describe('LocaleMetadata and locale settings models', () => {
  it('accepts dynamic content locale codes such as fr and de', () => {
    const fr: ContentLocale = 'fr';
    const de: ContentLocale = 'de';

    const metadata: LocaleMetadata[] = [
      {
        code: fr,
        displayName: 'French',
        nativeName: 'Français',
        direction: 'ltr',
      },
      {
        code: de,
        displayName: 'German',
        nativeName: 'Deutsch',
        direction: 'ltr',
      },
    ];

    const settings: RestaurantLocaleSettings = {
      defaultLocale: 'ar',
      translationMode: 'Manual',
      supportedLocales: [
        { code: 'ar', isEnabled: true, sortOrder: 0 },
        { code: fr, isEnabled: true, sortOrder: 1 },
        { code: de, isEnabled: false, sortOrder: 2 },
      ],
      availableLocales: metadata,
      canManageLocales: true,
    };

    expect(settings.supportedLocales.map((locale) => locale.code)).toEqual(['ar', 'fr', 'de']);
    expect(settings.availableLocales).toHaveLength(2);
  });
});
