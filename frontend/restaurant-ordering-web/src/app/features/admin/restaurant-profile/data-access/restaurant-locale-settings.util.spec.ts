import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import {
  buildLocaleSettingsPayload,
  createEditorStateFromSettings,
  ensureDefaultLocaleEnabled,
  formatLocaleOptionLabel,
  hasMissingTranslationErrors,
  parseMissingTranslationCounts,
} from './restaurant-locale-settings.util';
import type { LocaleMetadata, RestaurantLocaleSettings } from '../../../../core/localization/locale.types';

const AVAILABLE: LocaleMetadata[] = [
  {
    code: 'ar',
    displayName: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
  },
  {
    code: 'en',
    displayName: 'English',
    nativeName: 'English',
    direction: 'ltr',
  },
  {
    code: 'fr',
    displayName: 'French',
    nativeName: 'Français',
    direction: 'ltr',
  },
];

const BASE_SETTINGS: RestaurantLocaleSettings = {
  defaultLocale: 'ar',
  translationMode: 'ManualOnly',
  supportedLocales: [
    { code: 'ar', isEnabled: true, sortOrder: 1 },
    { code: 'en', isEnabled: true, sortOrder: 2 },
  ],
  availableLocales: AVAILABLE,
  canManageLocales: true,
};

describe('restaurant-locale-settings.util', () => {
  it('formats locale option labels with native and display names', () => {
    expect(formatLocaleOptionLabel(AVAILABLE[2]!)).toBe('Français — French');
  });

  it('creates editor state and keeps default locale enabled', () => {
    const editor = createEditorStateFromSettings(BASE_SETTINGS);
    expect(editor.defaultLocale).toBe('ar');
    expect(editor.enabledByCode['ar']).toBe(true);
  });

  it('auto-enables default locale when building payload after change', () => {
    const editor = createEditorStateFromSettings(BASE_SETTINGS);
    editor.defaultLocale = 'fr';
    editor.enabledByCode['fr'] = false;

    const payload = buildLocaleSettingsPayload(editor, AVAILABLE);
    const french = payload.supportedLocales.find((locale) => locale.code === 'fr');

    expect(french?.isEnabled).toBe(true);
    expect(payload.defaultLocale).toBe('fr');
  });

  it('does not allow disabling default locale in editor helper', () => {
    const enabledByCode = { ar: true, en: true };
    ensureDefaultLocaleEnabled('ar', enabledByCode);
    enabledByCode['ar'] = false;
    ensureDefaultLocaleEnabled('ar', enabledByCode);
    expect(enabledByCode['ar']).toBe(true);
  });

  it('parses missing translation counts from validation errors', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        errors: {
          missingRestaurantTranslations: ['1'],
          missingCategoryTranslations: ['2'],
          missingMenuItemTranslations: ['3'],
        },
      },
    });

    expect(hasMissingTranslationErrors(error)).toBe(true);
    expect(parseMissingTranslationCounts(error)).toEqual({
      restaurant: 1,
      categories: 2,
      menuItems: 3,
    });
  });
});
