import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DirectionService } from './direction.service';
import type { LocaleMetadata } from './locale.types';

describe('DirectionService', () => {
  let service: DirectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DirectionService);
  });

  it('returns rtl for ar, fa, and he via fallback registry', () => {
    expect(service.getDirection('ar')).toBe('rtl');
    expect(service.getDirection('fa')).toBe('rtl');
    expect(service.getDirection('he')).toBe('rtl');
  });

  it('returns ltr for en, fr, and de via fallback registry', () => {
    expect(service.getDirection('en')).toBe('ltr');
    expect(service.getDirection('fr')).toBe('ltr');
    expect(service.getDirection('de')).toBe('ltr');
  });

  it('falls back to ltr for unknown locales', () => {
    expect(service.getDirection('xx')).toBe('ltr');
    expect(service.getDirection('')).toBe('ltr');
  });

  it('prefers API metadata over fallback registry', () => {
    const locales: LocaleMetadata[] = [
      {
        code: 'fr',
        displayName: 'French',
        nativeName: 'Français',
        direction: 'rtl',
      },
    ];

    service.registerLocales(locales);
    expect(service.getDirection('fr')).toBe('rtl');
  });
});
