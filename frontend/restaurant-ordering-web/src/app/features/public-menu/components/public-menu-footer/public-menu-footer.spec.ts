import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { LocaleService } from '../../../../core/localization/locale';
import { PublicMenuFooter } from './public-menu-footer';

describe('PublicMenuFooter', () => {
  let fixture: ComponentFixture<PublicMenuFooter>;

  const root = () => fixture.nativeElement as HTMLElement;
  const q = (testId: string) => root().querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;

  function create(inputs: Record<string, unknown>): void {
    fixture = TestBed.createComponent(PublicMenuFooter);
    fixture.componentRef.setInput('name', 'Test Resto');
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PublicMenuFooter], providers: [provideRouter([])] });
    TestBed.inject(LocaleService).setLocale('en');
  });

  afterEach(() => TestBed.inject(LocaleService).setLocale('ar'));

  it('renders identity, actionable contact links and the admin login from real profile data', () => {
    create({
      description: 'Great food',
      logoUrl: '/logo.png',
      address: '1 Main St',
      phone: '+962 6 555 0123',
      whatsApp: '+962 79 000 0123',
    });

    expect(q('public-footer-brand')?.textContent).toContain('Test Resto');
    expect(q('public-footer-brand')?.textContent).toContain('Great food');
    expect(root().querySelector('img.public-footer__logo')?.getAttribute('alt')).toBe('Test Resto');
    expect(q('public-footer-contact')?.textContent).toContain('1 Main St');
    // tel: digits only; wa.me without the leading +; numbers are LTR islands.
    expect(q('public-footer-phone')?.getAttribute('href')).toBe('tel:+96265550123');
    expect(q('public-footer-phone')?.querySelector('bdi')?.getAttribute('dir')).toBe('ltr');
    expect(q('public-footer-whatsapp')?.getAttribute('href')).toBe('https://wa.me/962790000123');
    expect(q('public-footer-whatsapp')?.getAttribute('rel')).toContain('noopener');
    expect(q('public-footer-admin')?.getAttribute('href')).toBe('/login');
    expect(root().textContent).toContain(`© ${new Date().getFullYear()} Test Resto`);
  });

  it('hides the contact column and optional parts when data is missing (nothing invented)', () => {
    create({ phone: '  ', whatsApp: null, address: null, description: null, logoUrl: null });

    expect(q('public-footer-contact')).toBeNull();
    expect(root().querySelector('.public-footer__description')).toBeNull();
    expect(root().querySelector('img.public-footer__logo')).toBeNull();
    expect(root().querySelector('.public-footer__logo--initial')?.textContent?.trim()).toBe('T');
    // Browse + admin login are always available.
    expect(q('public-footer-browse')).toBeTruthy();
    expect(q('public-footer-admin')).toBeTruthy();
  });

  it('shows only the contact rows that exist', () => {
    create({ phone: '+962 6 555 0123' });

    expect(q('public-footer-phone')).toBeTruthy();
    expect(q('public-footer-whatsapp')).toBeNull();
    expect(root().querySelector('.public-footer__contact app-icon[ng-reflect-name="map-pin"]')).toBeNull();
  });

  it('emits browse / category events without navigating', () => {
    create({ categories: [{ id: 'c1', title: 'Starters' }, { id: 'c2', title: 'Grills' }] });
    const browse = vi.fn();
    const category = vi.fn();
    fixture.componentInstance.browseMenu.subscribe(browse);
    fixture.componentInstance.categorySelected.subscribe(category);

    const browseLink = q('public-footer-browse') as HTMLAnchorElement;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    browseLink.dispatchEvent(event);
    q('public-footer-category-c2')!.click();

    expect(event.defaultPrevented).toBe(true);
    expect(browse).toHaveBeenCalledTimes(1);
    expect(category).toHaveBeenCalledWith('c2');
    expect(root().querySelectorAll('[data-testid^="public-footer-category-"]')).toHaveLength(2);
  });

  it('falls back to the initial when the logo fails to load', () => {
    create({ logoUrl: '/broken.png' });
    root().querySelector('img.public-footer__logo')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(root().querySelector('img.public-footer__logo')).toBeNull();
    expect(root().querySelector('.public-footer__logo--initial')).toBeTruthy();
  });
});
