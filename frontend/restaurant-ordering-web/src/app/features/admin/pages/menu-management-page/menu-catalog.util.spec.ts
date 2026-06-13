import { describe, expect, it } from 'vitest';
import {
  formatPrimaryLanguageLabel,
  resolveCatalogSaveContent,
  resolveEditPrimaryContent,
  resolvePrimaryLocaleContent,
} from './menu-catalog.util';

describe('menu-catalog.util', () => {
  const legacy = {
    nameAr: 'فئة',
    nameEn: 'Category',
    descriptionAr: 'وصف',
    descriptionEn: 'Desc',
  };

  it('resolves primary locale content for Arabic default', () => {
    expect(resolvePrimaryLocaleContent('ar', legacy)).toEqual({
      name: 'فئة',
      description: 'وصف',
    });
  });

  it('resolves primary locale content for English default', () => {
    expect(resolvePrimaryLocaleContent('en', legacy)).toEqual({
      name: 'Category',
      description: 'Desc',
    });
  });

  it('uses backend primary fields for list display when present', () => {
    expect(
      resolvePrimaryLocaleContent('fr', {
        ...legacy,
        primaryName: 'Catégorie FR',
        primaryDescription: 'Description FR',
      }),
    ).toEqual({
      name: 'Catégorie FR',
      description: 'Description FR',
    });
  });

  it('fills edit form from primaryName for French default', () => {
    expect(
      resolveEditPrimaryContent('fr', {
        ...legacy,
        primaryName: 'Catégorie FR',
        primaryDescription: 'Description FR',
        primaryLocale: 'fr',
        primaryFallbackApplied: false,
      }),
    ).toEqual({
      content: { name: 'Catégorie FR', description: 'Description FR' },
      missingPrimaryLocale: false,
    });
  });

  it('fills edit form from primaryName for German default', () => {
    expect(
      resolveEditPrimaryContent('de', {
        ...legacy,
        primaryName: 'Kategorie DE',
        primaryDescription: 'Beschreibung DE',
        primaryLocale: 'de',
        primaryFallbackApplied: false,
      }),
    ).toEqual({
      content: { name: 'Kategorie DE', description: 'Beschreibung DE' },
      missingPrimaryLocale: false,
    });
  });

  it('shows missing primary warning when fr fallback is applied', () => {
    expect(
      resolveEditPrimaryContent('fr', {
        ...legacy,
        primaryName: 'فئة',
        primaryLocale: 'ar',
        primaryFallbackApplied: true,
      }),
    ).toEqual({
      content: { name: '', description: '' },
      missingPrimaryLocale: true,
    });
  });

  it('does not silently fill Arabic as French when primary fields are absent', () => {
    expect(resolveEditPrimaryContent('fr', legacy)).toEqual({
      content: { name: '', description: '' },
      missingPrimaryLocale: true,
    });
  });

  it('uses backend primary name for silent catalog save when edit form is empty', () => {
    expect(
      resolveCatalogSaveContent('fr', {
        ...legacy,
        primaryName: 'فئة',
        primaryLocale: 'ar',
        primaryFallbackApplied: true,
      }),
    ).toEqual({
      name: 'فئة',
      description: '',
    });
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
