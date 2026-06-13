import { describe, expect, it } from 'vitest';
import {
  formatPrimaryLanguageLabel,
  resolvePrimaryLocaleContent,
} from './menu-catalog.util';

describe('menu-catalog.util', () => {
  it('resolves primary locale content for Arabic default', () => {
    expect(
      resolvePrimaryLocaleContent('ar', {
        nameAr: 'فئة',
        nameEn: 'Category',
        descriptionAr: 'وصف',
        descriptionEn: 'Desc',
      }),
    ).toEqual({ name: 'فئة', description: 'وصف' });
  });

  it('resolves primary locale content for English default', () => {
    expect(
      resolvePrimaryLocaleContent('en', {
        nameAr: 'فئة',
        nameEn: 'Category',
        descriptionAr: 'وصف',
        descriptionEn: 'Desc',
      }),
    ).toEqual({ name: 'Category', description: 'Desc' });
  });

  it('formats primary language label from locale settings', () => {
    expect(
      formatPrimaryLanguageLabel({
        defaultLocale: 'fr',
        translationMode: 'ManualOnly',
        supportedLocales: [{ code: 'fr', isEnabled: true, sortOrder: 1 }],
        availableLocales: [
          { code: 'fr', displayName: 'French', nativeName: 'Français', direction: 'ltr' },
        ],
        canManageLocales: true,
      }),
    ).toBe('Français');
  });
});
