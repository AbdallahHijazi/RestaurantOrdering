import { TestBed } from '@angular/core/testing';
import { LocaleService } from './locale';

describe('LocaleService', () => {
  let service: LocaleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocaleService);
  });

  it('applies RTL for Arabic', () => {
    service.setLocale('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('applies LTR for English', () => {
    service.setLocale('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  it('falls back when one localized value is empty', () => {
    service.setLocale('en');
    expect(service.pickText({ ar: 'مرحبا', en: '' }, 'fallback')).toBe('مرحبا');
  });

  it('formats currency values', () => {
    service.setLocale('en');
    const formatted = service.formatCurrency(120, 'SAR', 'SA');
    expect(formatted).toContain('120');
  });
});
