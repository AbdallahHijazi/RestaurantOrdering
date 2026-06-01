import { TestBed } from '@angular/core/testing';
import { LocaleService } from './locale';

describe('LocaleService', () => {
  let service: LocaleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocaleService);
  });

  it('defaults to Arabic locale', () => {
    service.setLocale('ar');
    expect(service.locale()).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('setLocale("en") updates lang and dir to English LTR', () => {
    service.setLocale('en');
    expect(service.locale()).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  it('setLocale("ar") updates lang and dir to Arabic RTL', () => {
    service.setLocale('en');
    service.setLocale('ar');
    expect(service.locale()).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('pickText returns Arabic text when locale is ar', () => {
    service.setLocale('ar');
    expect(service.pickText({ ar: 'مرحبا', en: 'Hello' })).toBe('مرحبا');
  });

  it('pickText returns English text when locale is en', () => {
    service.setLocale('en');
    expect(service.pickText({ ar: 'مرحبا', en: 'Hello' })).toBe('Hello');
  });

  it('falls back to the other locale when the primary translation is empty', () => {
    service.setLocale('en');
    expect(service.pickText({ ar: 'مرحبا', en: '' }, 'fallback')).toBe('مرحبا');

    service.setLocale('ar');
    expect(service.pickText({ ar: '', en: 'Hello' }, 'fallback')).toBe('Hello');
  });

  it('exposes reactive ui strings through the ui signal', () => {
    service.setLocale('ar');
    expect(service.ui().cart).toBe('السلة');

    service.setLocale('en');
    expect(service.ui().cart).toBe('Cart');
  });

  it('formats currency values', () => {
    service.setLocale('en');
    const formatted = service.formatCurrency(120, 'SAR', 'SA');
    expect(formatted).toContain('120');
  });
});
