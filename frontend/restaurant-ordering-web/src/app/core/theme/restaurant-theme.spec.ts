import { TestBed } from '@angular/core/testing';
import {
  DEFAULT_RESTAURANT_ACCENT,
  RestaurantThemeService,
} from './restaurant-theme';

describe('RestaurantThemeService', () => {
  let service: RestaurantThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RestaurantThemeService);
  });

  it('accepts a valid hex accent color', () => {
    expect(service.sanitizeAccentColor('#B8663F')).toBe('#B8663F');
    expect(service.applyAccent('#B8663F')).toBe('#B8663F');
  });

  it('rejects javascript payloads', () => {
    expect(service.sanitizeAccentColor('javascript:alert(1)')).toBe(DEFAULT_RESTAURANT_ACCENT);
  });

  it('rejects url payloads', () => {
    expect(service.sanitizeAccentColor('url(https://evil.test)')).toBe(DEFAULT_RESTAURANT_ACCENT);
  });

  it('rejects style tag payloads', () => {
    expect(service.sanitizeAccentColor('<style>body{}</style>')).toBe(DEFAULT_RESTAURANT_ACCENT);
  });

  it('falls back to default for invalid values', () => {
    expect(service.sanitizeAccentColor('#abc')).toBe(DEFAULT_RESTAURANT_ACCENT);
    expect(service.sanitizeAccentColor('')).toBe(DEFAULT_RESTAURANT_ACCENT);
  });

  it('writes only dynamic accent variables to documentElement.style', () => {
    service.applyAccent('#AABBCC');
    const style = document.documentElement.style;

    expect(style.getPropertyValue('--restaurant-accent').trim()).toBe('#AABBCC');
    expect(style.getPropertyValue('--restaurant-accent-strong')).toContain('color-mix');
    expect(style.getPropertyValue('--restaurant-accent-soft')).toContain('color-mix');
    expect(style.getPropertyValue('--restaurant-background').trim()).toBe('');
    expect(style.getPropertyValue('--restaurant-text').trim()).toBe('');
    expect(style.getPropertyValue('--restaurant-border').trim()).toBe('');
  });

  it('computes accent soft via color-mix', () => {
    service.applyAccent('#B8663F');
    const accentSoft = document.documentElement.style.getPropertyValue('--restaurant-accent-soft');
    expect(accentSoft).toContain('color-mix');
    expect(accentSoft).toContain('#B8663F');
  });
});
