import { readFileSync } from 'fs';
import { resolve } from 'path';
import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocaleService } from '../../../../core/localization/locale';
import { ORDER_TYPE_PICKUP } from '../../models/public-menu.models';
import { PublicOrderConfirmation } from './public-order-confirmation';

describe('PublicOrderConfirmation', () => {
  let fixture: ComponentFixture<PublicOrderConfirmation>;
  let locale: LocaleService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicOrderConfirmation],
    }).compileComponents();

    locale = TestBed.inject(LocaleService);
    fixture = TestBed.createComponent(PublicOrderConfirmation);
  });

  afterEach(() => {
    document.body.classList.remove('order-modal-scroll-lock');
    document.body.style.overflow = '';
    document.querySelectorAll('app-modal-shell, app-order-modal-shell').forEach((node) => node.remove());
    locale.setLocale('ar');
  });

  function openConfirmation(): void {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('confirmation', baseConfirmation());
    fixture.detectChanges();
  }

  it('uses a compact modal width near 608px', () => {
    const css = readFileSync(resolve(__dirname, 'public-order-confirmation.scss'), 'utf8');
    expect(css).toContain('38rem');
    expect(css).toContain('calc(100vw - 2rem)');
    expect(css).toContain('calc(100vw - 1rem)');
  });

  it('does not use the wide modal shell variant', () => {
    const html = readFileSync(resolve(__dirname, 'public-order-confirmation.html'), 'utf8');
    expect(html).not.toContain('[wide]="true"');
    expect(html).toContain('public-order-confirmation__shell');
  });

  it('renders translated success copy in Arabic', () => {
    locale.setLocale('ar');
    openConfirmation();

    const text = document.body.textContent ?? '';
    expect(text).toContain(locale.uiText('publicConfirmationSuccessTitle'));
    expect(text).toContain(locale.uiText('publicConfirmationPreparingMessage'));
    expect(text).toContain(locale.uiText('publicConfirmationBackToMenu'));
  });

  it('renders translated success copy in English', () => {
    locale.setLocale('en');
    openConfirmation();

    const text = document.body.textContent ?? '';
    expect(text).toContain('Your order has been received');
    expect(text).toContain('Your order will be prepared shortly.');
    expect(text).toContain('Back to menu');
  });

  it('shows order number in an ltr bdi element', () => {
    openConfirmation();

    const orderNumber = document.body.querySelector('.identifier-ltr');
    expect(orderNumber?.textContent).toContain('ORD-7F29134F948B4E60');
    expect(orderNumber?.getAttribute('dir')).toBe('ltr');
  });

  it('exposes close button with aria label', () => {
    openConfirmation();

    const close = document.body.querySelector(
      '[data-testid="order-modal-close"]',
    ) as HTMLButtonElement;
    expect(close).toBeTruthy();
    expect(close.getAttribute('aria-label')).toBe(locale.uiText('publicConfirmationCloseAria'));
  });

  it('emits closed when close button is clicked', () => {
    openConfirmation();

    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);

    const close = document.body.querySelector(
      '[data-testid="order-modal-close"]',
    ) as HTMLButtonElement;
    close.click();
    fixture.detectChanges();

    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('removes overlay when parent closes confirmation', async () => {
    openConfirmation();

    const closed = vi.fn(() => {
      fixture.componentRef.setInput('open', false);
      fixture.detectChanges();
    });
    fixture.componentInstance.closed.subscribe(closed);

    const close = document.body.querySelector(
      '[data-testid="order-modal-close"]',
    ) as HTMLButtonElement;
    close.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentRef.setInput('confirmation', null);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(closed).toHaveBeenCalled();
    expect(document.body.querySelector('[data-testid="public-order-confirmation-modal"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="order-modal-backdrop"]')).toBeNull();
    expect(document.body.classList.contains('order-modal-scroll-lock')).toBe(false);
  });

  it('emits returnToMenu when back button is clicked', () => {
    openConfirmation();

    const returnToMenu = vi.fn();
    fixture.componentInstance.returnToMenu.subscribe(returnToMenu);

    const back = document.body.querySelector(
      '[data-testid="public-order-confirmation-return"]',
    ) as HTMLButtonElement;
    back.click();
    fixture.detectChanges();

    expect(returnToMenu).toHaveBeenCalledTimes(1);
  });

  it('emits closed on escape', () => {
    openConfirmation();

    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(closed).toHaveBeenCalled();
  });

  it('does not render when open is false', () => {
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('confirmation', baseConfirmation());
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="public-order-confirmation-modal"]')).toBeNull();
  });

  it('does not render when confirmation is null', () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('confirmation', null);
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="public-order-confirmation-modal"]')).toBeNull();
  });
});

function baseConfirmation() {
  return {
    orderId: '11111111-1111-1111-1111-111111111111',
    orderNumber: 'ORD-7F29134F948B4E60',
    orderType: ORDER_TYPE_PICKUP,
    orderStatus: 1,
    subtotal: 10,
    discountAmount: 0,
    taxAmount: 0,
    deliveryFee: 0,
    totalAmount: 10,
    currencyCode: 'USD',
    createdAt: '2026-06-04T12:23:00.000Z',
    items: [],
  };
}
