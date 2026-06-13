import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocaleService } from './locale';
import type { ContentLocale } from './locale.types';

describe('LocaleService admin UI compatibility', () => {
  let service: LocaleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocaleService);
  });

  it('keeps admin UI locale restricted to ar/en', () => {
    service.setLocale('ar');
    expect(service.locale()).toBe('ar');

    service.setLocale('en');
    expect(service.locale()).toBe('en');
  });

  it('accepts dynamic content locales in pickTextForLocale', () => {
    const fr: ContentLocale = 'fr';
    const de: ContentLocale = 'de';

    expect(
      service.pickTextForLocale(fr, { ar: 'مرحبا', en: 'Hello' }, 'fallback'),
    ).toBe('Hello');
    expect(
      service.pickTextForLocale(de, { ar: 'مرحبا', en: 'Hello' }, 'fallback'),
    ).toBe('Hello');
  });

  it('uses direction metadata instead of hardcoded locale checks for admin dir', () => {
    service.setLocale('ar');
    expect(document.documentElement.dir).toBe('rtl');

    service.setLocale('en');
    expect(document.documentElement.dir).toBe('ltr');
  });
});

describe('Preview/content locale strings', () => {
  it('accepts fr/de preview locale values as plain strings', () => {
    const previewLocales: ContentLocale[] = ['fr', 'de'];
    expect(previewLocales).toEqual(['fr', 'de']);
  });
});
