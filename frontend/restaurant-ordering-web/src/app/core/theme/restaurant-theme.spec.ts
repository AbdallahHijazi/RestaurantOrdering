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

  afterEach(() => {
    document.documentElement.style.removeProperty('--restaurant-olive');
  });

  it('accepts a valid hex accent color for sanitization', () => {
    expect(service.sanitizeAccentColor('#c6a15b')).toBe('#c6a15b');
  });

  it('returns the sanitized backend accent without overriding the central theme variables', () => {
    expect(service.applyAccent('#c6a15b')).toBe('#c6a15b');

    const style = document.documentElement.style;
    // Theme variables belong to src/styles.scss; the service must not shadow them.
    expect(style.getPropertyValue('--restaurant-accent').trim()).toBe('');
    expect(style.getPropertyValue('--restaurant-accent-strong').trim()).toBe('');
    expect(style.getPropertyValue('--restaurant-accent-soft').trim()).toBe('');
    expect(style.getPropertyValue('--restaurant-accent-border').trim()).toBe('');
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

  it('falls back to the palette defined in the stylesheet (single source of truth)', () => {
    document.documentElement.style.setProperty('--restaurant-olive', '#112233');

    expect(service.sanitizeAccentColor('not-a-color')).toBe('#112233');
    expect(service.getAppliedAccent()).toBe('#112233');
  });
});
