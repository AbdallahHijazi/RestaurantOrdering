import { ComponentFixture, TestBed } from '@angular/core/testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { vi } from 'vitest';
import { LocaleService } from '../../../../core/localization/locale';
import { PublicCartService } from '../../data-access/public-cart.service';
import { MOCK_PUBLIC_MENU } from '../../data-access/public-menu-mock.data';
import { PublicCartDrawer } from './public-cart-drawer';

describe('PublicCartDrawer', () => {
  let fixture: ComponentFixture<PublicCartDrawer>;
  let cart: PublicCartService;
  const settings = MOCK_PUBLIC_MENU.orderSettings;
  const item = MOCK_PUBLIC_MENU.items[0]!;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [PublicCartDrawer],
    });
    TestBed.inject(LocaleService).setLocale('en');
    cart = TestBed.inject(PublicCartService);
    cart.initForRestaurant('restaurant-a');
    cart.addMenuItem(item);
    fixture = TestBed.createComponent(PublicCartDrawer);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('orderSettings', settings);
    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('opens drawer with title and dynamic subtitle', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="public-cart-drawer"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="public-cart-drawer-title"]')?.textContent).toContain(
      'Your cart',
    );
    expect(fixture.nativeElement.querySelector('[data-testid="public-cart-drawer-subtitle"]')?.textContent).toContain(
      '1 items selected',
    );
  });

  it('closes drawer on close button', () => {
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    (fixture.nativeElement.querySelector('[data-testid="public-cart-drawer-close"]') as HTMLButtonElement).click();
    expect(closed).toHaveBeenCalled();
  });

  it('renders cart item with localized name and prices', () => {
    const line = fixture.nativeElement.querySelector('[data-testid="public-cart-line-' + item.id + '"]');
    expect(line?.textContent).toContain(item.nameEn ?? item.nameAr);
    expect(line?.querySelector('.public-cart-drawer__line-unit')).toBeTruthy();
    expect(line?.querySelector('.public-cart-drawer__line-price')).toBeTruthy();
  });

  it('increases and decreases quantity', () => {
    (fixture.nativeElement.querySelector('[data-testid="public-cart-increase"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(cart.quantityFor(item.id)).toBe(2);

    (fixture.nativeElement.querySelector('[data-testid="public-cart-decrease"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(cart.quantityFor(item.id)).toBe(1);
  });

  it('removes item from cart', () => {
    (fixture.nativeElement.querySelector('[data-testid="public-cart-remove"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(cart.isEmpty()).toBe(true);
  });

  it('shows empty state with explore menu action', () => {
    cart.clearCart();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="public-cart-drawer-empty"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Your cart is empty');

    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    (fixture.nativeElement.querySelector('[data-testid="public-cart-drawer-explore"]') as HTMLButtonElement).click();
    expect(closed).toHaveBeenCalled();
  });

  it('shows subtotal and estimated total in footer', () => {
    expect(fixture.nativeElement.textContent).toContain('Subtotal');
    expect(fixture.nativeElement.textContent).toContain('Estimated total');
  });

  it('emits continue checkout', () => {
    const checkout = vi.fn();
    fixture.componentInstance.continueCheckout.subscribe(checkout);
    (fixture.nativeElement.querySelector('[data-testid="public-cart-checkout"]') as HTMLButtonElement).click();
    expect(checkout).toHaveBeenCalled();
  });

  it('uses drawer width and mobile rules in stylesheet', () => {
    const css = readFileSync(resolve(__dirname, 'public-cart-drawer.scss'), 'utf8');
    expect(css).toContain('min(31.25rem, 100vw)');
    expect(css).toContain('100dvh');
    expect(css).toContain('--cart-accent: var(--restaurant-accent)');
    expect(css).not.toContain('tailwind');
    expect(css).not.toContain('material-symbols');
  });
});
