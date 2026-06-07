import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocaleService } from '../../../../../../core/localization/locale';
import {
  OrderStatus,
  OrderType,
  type OrderDetails,
} from '../../../../../kitchen/data-access/kitchen-orders.models';
import { AdminOrderDetailsModal } from './admin-order-details-modal';

const RESTAURANT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('AdminOrderDetailsModal', () => {
  let fixture: ComponentFixture<AdminOrderDetailsModal>;
  let locale: LocaleService;
  let printSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminOrderDetailsModal],
    }).compileComponents();

    locale = TestBed.inject(LocaleService);
    locale.setLocale('ar');
    document.documentElement.setAttribute('dir', 'rtl');
    printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    fixture = TestBed.createComponent(AdminOrderDetailsModal);
    fixture.componentRef.setInput('details', createDetails());
    fixture.detectChanges();
  });

  afterEach(() => {
    printSpy.mockRestore();
    locale.setLocale('ar');
    document.documentElement.setAttribute('dir', 'rtl');
  });

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('keeps footer outside scroll wrapper with fixed flex layout', () => {
    const shell = root().querySelector('.order-details-modal') as HTMLElement;
    const header = root().querySelector('.order-details-modal__header') as HTMLElement;
    const scroll = root().querySelector('.order-details-modal__scroll') as HTMLElement;
    const footer = root().querySelector('.order-details-modal__footer') as HTMLElement;
    const body = root().querySelector('[data-testid="admin-orders-details-body"]') as HTMLElement;

    expect(shell).toBeTruthy();
    expect(header).toBeTruthy();
    expect(scroll).toBeTruthy();
    expect(footer).toBeTruthy();
    expect(scroll.contains(body)).toBe(true);
    expect(scroll.contains(footer)).toBe(false);

    const shellStyle = getComputedStyle(shell);
    expect(shellStyle.display).toBe('flex');
    expect(shellStyle.flexDirection).toBe('column');
    expect(shellStyle.overflow).toBe('hidden');

    const footerStyle = getComputedStyle(footer);
    expect(footerStyle.flexGrow).toBe('0');
    expect(footerStyle.flexShrink).toBe('0');
    expect(footerStyle.position).not.toBe('absolute');

    const scrollStyle = getComputedStyle(scroll);
    expect(scrollStyle.overflowY).toBe('auto');
    expect(['0', '0px']).toContain(scrollStyle.minHeight);
  });

  it('uses reduced modal dimensions with 920px width and 820px max-height', () => {
    const portalCss = collectPortalCssText();

    expect(portalCss).toContain('max-width: 920px');
    expect(portalCss).toContain('min(820px');
    expect(portalCss).toContain('100dvh - 2rem');
    expect(portalCss).toContain('border-radius: 24px');
  });

  it('adds balanced bottom padding and safe-area support on the footer', () => {
    const footer = root().querySelector('.order-details-modal__footer') as HTMLElement;
    const footerStyle = getComputedStyle(footer);

    expect(footerStyle.display).toBe('flex');
    expect(footerStyle.paddingBlockEnd).toContain('1.25rem');
    expect(footerStyle.paddingBlockEnd).toContain('safe-area-inset-bottom');
  });

  it('aligns footer actions to the visual left in RTL', () => {
    document.documentElement.setAttribute('dir', 'rtl');
    fixture.detectChanges();

    const actions = root().querySelector('.order-details-modal__footer-actions') as HTMLElement;
    const footer = root().querySelector('.order-details-modal__footer') as HTMLElement;

    expect(getComputedStyle(actions).marginInlineStart).toBe('auto');
    expect(actions.getBoundingClientRect().left).toBeLessThanOrEqual(footer.getBoundingClientRect().left + 4);
  });

  it('keeps footer actions on the visual right in LTR', () => {
    locale.setLocale('en');
    document.documentElement.setAttribute('dir', 'ltr');
    fixture.detectChanges();

    const actions = root().querySelector('.order-details-modal__footer-actions') as HTMLElement;
    const footer = root().querySelector('.order-details-modal__footer') as HTMLElement;

    expect(actions.getBoundingClientRect().right).toBeGreaterThanOrEqual(footer.getBoundingClientRect().right - 4);
  });

  it('emits closed from header and footer actions', () => {
    const closed: number[] = [];
    fixture.componentInstance.closed.subscribe(() => closed.push(1));

    root()
      .querySelector<HTMLButtonElement>('[data-testid="admin-order-details-close"]')
      ?.click();
    expect(closed).toEqual([1]);

    closed.length = 0;
    root()
      .querySelector<HTMLButtonElement>('[data-testid="admin-order-details-footer-close"]')
      ?.click();
    expect(closed).toEqual([1]);
  });

  it('enables print invoice and calls window.print once', () => {
    const printButton = root().querySelector<HTMLButtonElement>(
      '[data-testid="admin-order-details-print"]',
    )!;

    expect(printButton.disabled).toBe(false);
    expect(printButton.getAttribute('aria-disabled')).toBeNull();
    expect(printButton.getAttribute('type')).toBe('button');

    printButton.click();
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('does not call window.print while loading or without details', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    root().querySelector<HTMLButtonElement>('[data-testid="admin-order-details-print"]')?.click();
    expect(printSpy).not.toHaveBeenCalled();

    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('details', null);
    fixture.detectChanges();
    root().querySelector<HTMLButtonElement>('[data-testid="admin-order-details-print"]')?.click();
    expect(printSpy).not.toHaveBeenCalled();
  });

  it('renders invoice print area with order details and conditional financial rows', () => {
    const area = root().querySelector('[data-testid="admin-order-invoice-print-area"]') as HTMLElement;

    expect(area).toBeTruthy();
    expect(area.getAttribute('dir')).toBe('rtl');
    expect(area.querySelector('[data-testid="admin-order-invoice-number"]')?.textContent).toContain(
      'ORD-7F29134F948B4E60',
    );
    expect(area.querySelector('[data-testid="admin-order-invoice-guest"]')?.textContent).toContain(
      'Abdallah Hijazi',
    );
    expect(area.querySelector('[data-testid="admin-order-invoice-phone"]')?.textContent).toContain(
      '0982720564',
    );
    expect(area.querySelector('[data-testid="admin-order-invoice-address"]')?.textContent).toContain(
      'Mimi Mimi',
    );
    expect(area.querySelector('[data-testid="admin-order-invoice-item-item-1"]')).toBeTruthy();
    expect(area.querySelector('[data-testid="admin-order-invoice-total"]')).toBeTruthy();
    expect(area.textContent).toContain('منسف');
    expect(area.textContent).not.toContain('الخصم');
    expect(area.textContent).not.toContain('الضريبة');
    expect(getComputedStyle(area).display).toBe('none');
  });

  it('hides delivery address on pickup orders in invoice print area', () => {
    fixture.componentRef.setInput('details', createPickupDetails());
    fixture.detectChanges();

    const area = root().querySelector('[data-testid="admin-order-invoice-print-area"]')!;
    expect(area.querySelector('[data-testid="admin-order-invoice-address"]')).toBeNull();
  });

  it('shows discount and tax in invoice only when amounts are greater than zero', () => {
    const discounted = createDetails();
    discounted.discountAmount = 2;
    discounted.taxAmount = 1.5;
    fixture.componentRef.setInput('details', discounted);
    fixture.detectChanges();

    const area = root().querySelector('[data-testid="admin-order-invoice-print-area"]')!;
    expect(area.textContent).toContain(locale.uiText('adminOrdersFieldDiscount'));
    expect(area.textContent).toContain(locale.uiText('adminOrdersFieldTax'));
  });

  it('uses LTR invoice direction in English locale', () => {
    locale.setLocale('en');
    fixture.detectChanges();

    const area = root().querySelector('[data-testid="admin-order-invoice-print-area"]') as HTMLElement;
    expect(area.getAttribute('dir')).toBe('ltr');
    expect(area.textContent).toContain('Thank you for choosing our restaurant');
  });

  it('includes @media print rules in component styles', () => {
    const hasPrintMedia = Array.from(document.styleSheets).some((sheet) => {
      try {
        return Array.from(sheet.cssRules).some((rule) => rule.cssText.includes('@media print'));
      } catch {
        return false;
      }
    });

    expect(hasPrintMedia).toBe(true);
  });

  it('keeps modal overlay printable instead of hiding it with display none', () => {
    const printRules = collectPrintCssText();

    expect(printRules).toContain('.order-invoice-print-area');
    expect(printRules).not.toMatch(/\.modal-overlay[^}]*display:\s*none/i);
  });
});

function collectPortalCssText(): string {
  return Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText);
      } catch {
        return [];
      }
    })
    .join('\n');
}

function collectPrintCssText(): string {
  return Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules);
      } catch {
        return [];
      }
    })
    .filter((rule) => rule.cssText.includes('@media print'))
    .map((rule) => rule.cssText)
    .join('\n');
}

function createDetails(): OrderDetails {
  return {
    id: 'order-new',
    orderNumber: 'ORD-7F29134F948B4E60',
    restaurantId: RESTAURANT_ID,
    customerId: null,
    guestName: 'Abdallah Hijazi',
    guestPhone: '0982720564',
    orderType: OrderType.Delivery,
    orderStatus: OrderStatus.Completed,
    totalAmount: 25,
    currencyCode: 'USD',
    createdAt: '2026-06-04T09:23:00.000Z',
    updatedAt: null,
    deliveryAddress: 'Mimi Mimi',
    deliveryLatitude: null,
    deliveryLongitude: null,
    subtotal: 0.1,
    discountAmount: 0,
    taxAmount: 0,
    deliveryFee: 0,
    notes: null,
    items: [
      {
        id: 'item-1',
        menuItemId: null,
        itemNameAr: 'منسف',
        itemNameEn: 'Mansaf',
        unitPrice: 0.1,
        quantity: 1,
        totalPrice: 0.1,
        notes: null,
      },
      {
        id: 'item-2',
        menuItemId: null,
        itemNameAr: 'سلطة',
        itemNameEn: 'Salad',
        unitPrice: 5,
        quantity: 2,
        totalPrice: 10,
        notes: null,
      },
    ],
  };
}

function createPickupDetails(): OrderDetails {
  const details = createDetails();
  details.orderType = OrderType.Pickup;
  details.deliveryAddress = null;
  return details;
}
