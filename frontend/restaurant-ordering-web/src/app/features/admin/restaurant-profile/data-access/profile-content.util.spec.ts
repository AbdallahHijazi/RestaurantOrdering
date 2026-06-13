import { describe, expect, it } from 'vitest';
import {
  isLegacyPrimaryLocale,
  resolvePrimaryProfileContent,
  syncLegacyFromProfileContent,
  toProfileContentRequest,
} from './profile-content.util';

const LEGACY = {
  nameAr: 'مطعم عربي',
  nameEn: 'English Restaurant',
  descriptionAr: 'وصف عربي',
  descriptionEn: 'English description',
  addressAr: 'الرياض',
  addressEn: 'Riyadh',
};

describe('profile-content.util', () => {
  it('detects legacy primary locales', () => {
    expect(isLegacyPrimaryLocale('ar')).toBe(true);
    expect(isLegacyPrimaryLocale('en')).toBe(true);
    expect(isLegacyPrimaryLocale('fr')).toBe(false);
  });

  it('resolves ar primary content from legacy bilingual fields', () => {
    const resolved = resolvePrimaryProfileContent('ar', LEGACY);
    expect(resolved.missingPrimaryLocale).toBe(false);
    expect(resolved.content).toEqual({
      name: 'مطعم عربي',
      description: 'وصف عربي',
      address: 'الرياض',
    });
  });

  it('resolves en primary content from legacy bilingual fields', () => {
    const resolved = resolvePrimaryProfileContent('en', LEGACY);
    expect(resolved.missingPrimaryLocale).toBe(false);
    expect(resolved.content).toEqual({
      name: 'English Restaurant',
      description: 'English description',
      address: 'Riyadh',
    });
  });

  it('leaves fr primary content empty with warning', () => {
    const resolved = resolvePrimaryProfileContent('fr', LEGACY);
    expect(resolved.missingPrimaryLocale).toBe(true);
    expect(resolved.content).toEqual({ name: '', description: '', address: '' });
  });

  it('syncs ar legacy fields from profile content', () => {
    const synced = syncLegacyFromProfileContent(
      'ar',
      { name: 'اسم جديد', description: 'وصف جديد', address: 'عنوان جديد' },
      LEGACY,
    );
    expect(synced.nameAr).toBe('اسم جديد');
    expect(synced.descriptionAr).toBe('وصف جديد');
    expect(synced.addressAr).toBe('عنوان جديد');
    expect(synced.nameEn).toBe('English Restaurant');
  });

  it('syncs en legacy fields from profile content', () => {
    const synced = syncLegacyFromProfileContent(
      'en',
      { name: 'Updated', description: 'New description', address: 'New address' },
      LEGACY,
    );
    expect(synced.nameEn).toBe('Updated');
    expect(synced.descriptionEn).toBe('New description');
    expect(synced.addressEn).toBe('New address');
    expect(synced.nameAr).toBe('مطعم عربي');
  });

  it('does not sync fr legacy fields from profile content', () => {
    const synced = syncLegacyFromProfileContent(
      'fr',
      { name: 'Restaurant FR', description: 'Description FR', address: 'Paris' },
      LEGACY,
    );
    expect(synced).toEqual(LEGACY);
  });

  it('builds profile-content request payload', () => {
    expect(
      toProfileContentRequest({
        name: '  Name  ',
        description: '  ',
        address: ' Address ',
      }),
    ).toEqual({
      name: 'Name',
      description: null,
      address: 'Address',
    });
  });
});
