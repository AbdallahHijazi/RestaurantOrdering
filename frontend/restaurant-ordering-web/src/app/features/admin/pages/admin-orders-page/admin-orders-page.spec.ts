import { provideHttpClient, type HttpParams } from '@angular/common/http';
import { vi } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../../core/config/api-config';
import { ApplicationRoles } from '../../../../core/auth/application-roles';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { createTestSession } from '../../../../core/auth/test-jwt.util';
import { LocaleService } from '../../../../core/localization/locale';
import {
  OrderStatus,
  OrderType,
  type GetOrdersResult,
  type OrderDetails,
  type OrderSummary,
} from '../../../kitchen/data-access/kitchen-orders.models';
import { AdminOrdersPage } from './admin-orders-page';

const RESTAURANT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('AdminOrdersPage', () => {
  let fixture: ComponentFixture<AdminOrdersPage>;
  let httpMock: HttpTestingController;
  let session: AuthSessionService;

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [AdminOrdersPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner, RESTAURANT_ID));
    TestBed.inject(AuthService).restoreSessionFromStorage();

    fixture = TestBed.createComponent(AdminOrdersPage);
  });

  afterEach(() => {
    document.body.classList.remove('order-modal-scroll-lock');
    document.querySelectorAll('app-modal-shell, app-order-modal-shell').forEach((node) => node.remove());
    TestBed.inject(LocaleService).setLocale('ar');
    httpMock.verify({ ignoreCancelled: true });
    session.clearSession();
  });

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function flushList(items: OrderSummary[] = []): void {
    const req = httpMock.expectOne(
      (request) =>
        request.url === `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders` &&
        request.method === 'GET' &&
        !request.params.has('status'),
    );
    req.flush(resultFor(items));
    fixture.detectChanges();
  }

  function expectListRequest(predicate: (params: HttpParams) => boolean) {
    return httpMock.expectOne(
      (request) =>
        request.url === `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders` &&
        request.method === 'GET' &&
        predicate(request.params),
    );
  }

  function typeInSearch(value: string): void {
    const search = root().querySelector<HTMLInputElement>('[data-testid="admin-orders-search"]')!;
    search.value = value;
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('does not render page-level top bar or layout chrome', () => {
    fixture.detectChanges();
    flushList([]);

    expect(root().querySelector('.topbar')).toBeNull();
    expect(root().querySelector('.profile-console-layout')).toBeNull();
    expect(root().querySelector('.orders-management-page__title')).toBeTruthy();
  });

  it('renders internal header, refresh, status pills, and search', () => {
    const locale = TestBed.inject(LocaleService);
    fixture.detectChanges();
    flushList([createSummary('order-new', OrderStatus.New, 'A-100')]);

    expect(root().textContent).toContain(locale.uiText('adminOrdersEyebrow'));
    expect(root().textContent).toContain(locale.uiText('adminOrdersTitle'));
    expect(root().textContent).toContain(locale.uiText('adminOrdersLead'));
    expect(root().querySelector('[data-testid="admin-orders-refresh"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="admin-orders-filters"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="admin-orders-search"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="admin-orders-filter-all"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="admin-orders-filter-1"]')).toBeTruthy();
  });

  it('asks the server for the selected status instead of filtering only the loaded rows (BUG-005)', () => {
    fixture.detectChanges();
    flushList([
      createSummary('order-new', OrderStatus.New, 'A-100'),
      createSummary('order-done', OrderStatus.Completed, 'A-101'),
    ]);

    root().querySelector<HTMLButtonElement>('[data-testid="admin-orders-filter-4"]')?.click();
    fixture.detectChanges();

    const req = expectListRequest((params) => params.get('status') === String(OrderStatus.Completed));
    req.flush(resultFor([createSummary('order-done', OrderStatus.Completed, 'A-101')]));
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="admin-order-row-order-done"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="admin-order-row-order-new"]')).toBeNull();
  });

  it('searches the whole dataset on the server (debounced), not just the loaded rows (BUG-005)', () => {
    vi.useFakeTimers();
    try {
      fixture.detectChanges();
      flushList([
        createSummary('order-new', OrderStatus.New, 'ORD-100', OrderType.Pickup, 'Ali Guest'),
      ]);

      typeInSearch('ORD-OLD-777');
      httpMock.expectNone((r) => r.params.get('searchTerm') === 'ORD-OLD-777');

      vi.advanceTimersByTime(300);
      const req = expectListRequest((params) => params.get('searchTerm') === 'ORD-OLD-777');
      expect(req.request.params.get('pageNumber')).toBe('1');
      req.flush(
        resultFor([createSummary('order-old', OrderStatus.Completed, 'ORD-OLD-777', OrderType.Pickup, 'Old Guest')]),
      );
      fixture.detectChanges();

      expect(root().querySelector('[data-testid="admin-order-row-order-old"]')).toBeTruthy();
      expect(root().querySelector('[data-testid="admin-order-row-order-new"]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores a leading # when searching by the displayed order number', () => {
    vi.useFakeTimers();
    try {
      fixture.detectChanges();
      flushList([createSummary('order-new', OrderStatus.New, 'ORD-100')]);

      typeInSearch('#7F29134F');
      vi.advanceTimersByTime(300);

      const req = expectListRequest((params) => params.get('searchTerm') === '7F29134F');
      req.flush(resultFor([]));
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the authoritative server total in the counter, not the number of loaded rows (BUG-005)', () => {
    fixture.detectChanges();
    const items = Array.from({ length: 20 }, (_, index) =>
      createSummary(`order-${index}`, OrderStatus.New, `A-${index}`),
    );
    const req = httpMock.expectOne(
      (request) => request.url === `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders`,
    );
    req.flush({ items, totalCount: 23, pageNumber: 1, pageSize: 20 });
    fixture.detectChanges();

    const counter = root().querySelector('[data-testid="admin-orders-result-count"]')!.textContent!;
    expect(counter).toContain('20');
    expect(counter).toContain('23');
    expect(root().querySelector('[data-testid="admin-orders-load-more"]')).toBeTruthy();
  });

  it('loads further pages with the active search and never duplicates a row (BUG-005)', () => {
    vi.useFakeTimers();
    try {
      fixture.detectChanges();
      flushList([]);
      // switch to an active search that has more than one page
      typeInSearch('ali');
      vi.advanceTimersByTime(300);
      const first = expectListRequest((params) => params.get('searchTerm') === 'ali');
      first.flush({
        items: [createSummary('order-1', OrderStatus.New, 'A-1'), createSummary('order-2', OrderStatus.New, 'A-2')],
        totalCount: 3,
        pageNumber: 1,
        pageSize: 20,
      });
      fixture.detectChanges();

      root().querySelector<HTMLButtonElement>('[data-testid="admin-orders-load-more"]')?.click();
      const second = expectListRequest(
        (params) => params.get('searchTerm') === 'ali' && params.get('pageNumber') === '2',
      );
      second.flush({
        // order-2 is returned again (data shifted while paging): it must not be listed twice
        items: [createSummary('order-2', OrderStatus.New, 'A-2'), createSummary('order-3', OrderStatus.New, 'A-3')],
        totalCount: 3,
        pageNumber: 2,
        pageSize: 20,
      });
      fixture.detectChanges();

      const rows = root().querySelectorAll('[data-testid^="admin-order-row-"]');
      expect(Array.from(rows).map((row) => row.getAttribute('data-testid'))).toEqual([
        'admin-order-row-order-1',
        'admin-order-row-order-2',
        'admin-order-row-order-3',
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a stale slow response can never overwrite the result of a newer search', () => {
    vi.useFakeTimers();
    try {
      fixture.detectChanges();
      flushList([createSummary('order-new', OrderStatus.New, 'A-100')]);

      typeInSearch('first');
      vi.advanceTimersByTime(300);
      const stale = httpMock.expectOne((r) => r.params.get('searchTerm') === 'first');

      typeInSearch('second');
      vi.advanceTimersByTime(300);
      const fresh = expectListRequest((params) => params.get('searchTerm') === 'second');

      expect(stale.cancelled).toBe(true);
      fresh.flush(resultFor([createSummary('order-second', OrderStatus.New, 'A-2')]));
      fixture.detectChanges();

      expect(root().querySelector('[data-testid="admin-order-row-order-second"]')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the table of dine-in orders next to the order type (BUG-004)', () => {
    fixture.detectChanges();
    flushList([
      { ...createSummary('order-dine', OrderStatus.New, 'A-300', OrderType.DineIn), tableId: 't1', tableName: 'T-12' },
      createSummary('order-pickup', OrderStatus.New, 'A-301', OrderType.Pickup),
    ]);

    const dine = root().querySelector('[data-testid="admin-order-row-order-dine"]')!.textContent!;
    const pickup = root().querySelector('[data-testid="admin-order-row-order-pickup"]')!.textContent!;
    expect(dine).toContain('T-12');
    expect(pickup).not.toContain('T-12');
  });

  it('renders additional filters toolbar with visible icon and aligned controls', () => {
    fixture.detectChanges();
    flushList([]);

    const row = root().querySelector('.orders-management-page__extra-filters-row') as HTMLElement;
    const label = root().querySelector('[data-testid="admin-orders-extra-filters-label"]') as HTMLElement;
    const icon = label?.querySelector('.orders-management-page__extra-filters-icon') as SVGElement | null;
    const typeTrigger = root().querySelector('[data-testid="admin-orders-type-filter"]') as HTMLElement;
    const clearButton = root().querySelector('[data-testid="admin-orders-clear-filters"]') as HTMLButtonElement;
    const resultCount = root().querySelector('[data-testid="admin-orders-result-count"]') as HTMLElement;

    expect(row).toBeTruthy();
    expect(row.contains(label)).toBe(true);
    expect(row.contains(typeTrigger)).toBe(true);
    expect(row.contains(clearButton)).toBe(true);
    expect(row.contains(resultCount)).toBe(true);
    expect(root().querySelector('.orders-management-page__extra-filters-title')).toBeNull();

    expect(getComputedStyle(row).display).toBe('flex');
    expect(getComputedStyle(label).display).toBe('inline-flex');
    expect(getComputedStyle(label).width).not.toBe('100%');
    expect(getComputedStyle(label).flexGrow).toBe('0');

    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.getAttribute('focusable')).toBe('false');
    expect(icon?.querySelectorAll('path').length).toBeGreaterThanOrEqual(6);

    const iconCss = Array.from(document.styleSheets)
      .flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules).map((rule) => rule.cssText);
        } catch {
          return [];
        }
      })
      .join('\n');
    expect(iconCss).toContain('orders-management-page__extra-filters-icon');
    expect(iconCss).toContain('20px');
    expect(iconCss).toContain('stroke: var(--restaurant-text)');
    expect(iconCss).toContain('height: 46px');
    expect(iconCss).toContain('align-self: center');

    expect(['0px', '']).toContain(getComputedStyle(clearButton).marginTop);
    expect(getComputedStyle(resultCount).marginInlineStart).toBe('auto');
  });

  it('supports additional filters, derived guest options, clear filters, and result count', () => {
    fixture.detectChanges();
    flushList([
      createSummary('order-new', OrderStatus.New, 'A-100', OrderType.Delivery, 'Ali Guest'),
      createSummary('order-pickup', OrderStatus.New, 'A-101', OrderType.Pickup, 'Sara Ahmed'),
    ]);

    expect(root().querySelector('[data-testid="admin-orders-type-filter"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="admin-orders-guest-filter"]')).toBeTruthy();
    expect(root().textContent).toContain('Ali Guest');

    root().querySelector<HTMLButtonElement>('[data-testid="admin-orders-type-filter"]')?.click();
    fixture.detectChanges();
    root().querySelector<HTMLButtonElement>('[data-option-index="2"]')?.click();
    fixture.detectChanges();

    // the order-type filter is applied by the server over the whole dataset
    expectListRequest((params) => params.get('orderType') === String(OrderType.Pickup)).flush(
      resultFor([createSummary('order-pickup', OrderStatus.New, 'A-101', OrderType.Pickup, 'Sara Ahmed')]),
    );
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="admin-order-row-order-pickup"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="admin-order-row-order-new"]')).toBeNull();

    root().querySelector<HTMLButtonElement>('[data-testid="admin-orders-clear-filters"]')?.click();
    fixture.detectChanges();

    expectListRequest((params) => !params.has('orderType') && !params.has('searchTerm')).flush(
      resultFor([
        createSummary('order-new', OrderStatus.New, 'A-100', OrderType.Delivery, 'Ali Guest'),
        createSummary('order-pickup', OrderStatus.New, 'A-101', OrderType.Pickup, 'Sara Ahmed'),
      ]),
    );
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="admin-order-row-order-new"]')).toBeTruthy();
    expect((root().querySelector<HTMLInputElement>('[data-testid="admin-orders-search"]'))!.value).toBe('');
  });

  it('renders production cards with type-first hierarchy, labels, meta corner, total, and details flow', () => {
    fixture.detectChanges();
    flushList([createSummary('order-new', OrderStatus.New, 'ORD-7F29134F948B4E60', OrderType.Delivery, 'Abdallah Hijazi')]);

    expect(root().querySelector('[data-testid="admin-orders-table"]')).toBeNull();
    expect(root().querySelector('[data-testid="admin-orders-cards"]')).toBeTruthy();

    const card = root().querySelector('[data-testid="admin-order-card-order-new"]') as HTMLElement;
    const content = card.querySelector('.orders-management-page__card-content') as HTMLElement;
    const type = card.querySelector('.orders-management-page__card-type') as HTMLElement;
    const number = card.querySelector('.orders-management-page__card-number') as HTMLElement;
    const guest = card.querySelector('.orders-management-page__card-guest') as HTMLElement;
    const labels = card.querySelectorAll('.orders-management-page__card-label');
    const meta = card.querySelector('[data-testid="admin-order-card-meta-order-new"]') as HTMLElement;
    const status = meta.querySelector('.orders-management-page__card-status') as HTMLElement;
    const time = meta.querySelector('.orders-management-page__card-time') as HTMLElement;
    const contentChildren = Array.from(content.children);

    expect(card.textContent).toContain('#7F29134F');
    expect(card.textContent).toContain('Abdallah Hijazi');
    expect(labels.length).toBe(2);
    expect(contentChildren[0]).toBe(type);
    expect(contentChildren[1].classList.contains('orders-management-page__card-field')).toBe(true);
    expect(contentChildren[2].classList.contains('orders-management-page__card-field')).toBe(true);
    expect(number.tagName.toLowerCase()).toBe('h3');
    expect(guest.tagName.toLowerCase()).toBe('p');
    expect(Number(getComputedStyle(number).fontWeight)).toBeGreaterThan(Number(getComputedStyle(guest).fontWeight));
    expect(getComputedStyle(guest).fontSize).not.toBe(getComputedStyle(number).fontSize);
    expect(meta.contains(status)).toBe(true);
    expect(meta.contains(time)).toBe(true);
    expect(getComputedStyle(meta).flexDirection).toBe('column');
    expect(getComputedStyle(meta).marginInlineStart).toBe('auto');
    expect(card.querySelector('.orders-management-page__avatar')).toBeNull();

    root().querySelector<HTMLButtonElement>('[data-testid="admin-order-details-order-new"]')?.click();
    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders/order-new`)
      .flush(createDetails('order-new', OrderStatus.New));
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="admin-order-details-modal"]')).toBeTruthy();
  });

  it('shows filtered empty state when the server finds no match for the search', () => {
    vi.useFakeTimers();
    try {
      fixture.detectChanges();
      flushList([createSummary('order-new', OrderStatus.New, 'A-100')]);

      typeInSearch('missing-guest');
      vi.advanceTimersByTime(300);
      expectListRequest((params) => params.get('searchTerm') === 'missing-guest').flush(resultFor([]));
      fixture.detectChanges();

      expect(root().querySelector('[data-testid="admin-orders-filtered-empty"]')).toBeTruthy();
      expect(root().querySelector('[data-testid="admin-orders-empty"]')).toBeNull();
      // the search box stays mounted so the user can keep typing / clear it
      expect(root().querySelector('[data-testid="admin-orders-search"]')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows API empty state when there are no orders', () => {
    fixture.detectChanges();
    flushList([]);

    expect(root().querySelector('[data-testid="admin-orders-empty"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="admin-orders-filtered-empty"]')).toBeNull();
  });

  it('shows loading skeleton and error retry state', () => {
    fixture.detectChanges();
    expect(root().querySelector('[data-testid="admin-orders-loading"]')).toBeTruthy();

    const req = httpMock.expectOne(
      (request) =>
        request.url === `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders`,
    );
    req.flush('failed', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="admin-orders-error"]')).toBeTruthy();
  });

  it('opens details modal and keeps modal regression behavior', () => {
    fixture.detectChanges();
    flushList([createSummary('order-new', OrderStatus.New, 'A-100')]);

    root()
      .querySelector<HTMLButtonElement>('[data-testid="admin-order-details-order-new"]')!
      .click();
    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders/order-new`)
      .flush(createDetails('order-new', OrderStatus.New));
    fixture.detectChanges();

    const scroll = document.body.querySelector('.order-details-modal__scroll') as HTMLElement;
    const footer = document.body.querySelector('.order-details-modal__footer') as HTMLElement;
    expect(scroll.contains(footer)).toBe(false);
    expect(getComputedStyle(scroll).overflowY).toBe('auto');
    expect(
      (document.body.querySelector('[data-testid="admin-order-details-print"]') as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(document.body.querySelector('[data-testid="admin-order-invoice-print-area"]')).toBeTruthy();
  });

  it('keeps modal status actions working and refreshes details after success', () => {
    fixture.detectChanges();
    flushList([createSummary('order-new', OrderStatus.New, 'A-100')]);

    root()
      .querySelector<HTMLButtonElement>('[data-testid="admin-order-details-order-new"]')!
      .click();
    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders/order-new`)
      .flush(createDetails('order-new', OrderStatus.New));
    fixture.detectChanges();

    document.body
      .querySelector<HTMLButtonElement>('[data-testid="admin-order-modal-action-order-new-2"]')
      ?.click();
    fixture.detectChanges();

    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders/order-new/status`)
      .flush(createSummary('order-new', OrderStatus.Preparing, 'A-100'));
    fixture.detectChanges();

    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders/order-new`)
      .flush(createDetails('order-new', OrderStatus.Preparing));
    fixture.detectChanges();

    expect(document.body.textContent).toContain('قيد التحضير');
  });
});

function resultFor(items: OrderSummary[]): GetOrdersResult {
  return {
    items,
    totalCount: items.length,
    pageNumber: 1,
    pageSize: 20,
  };
}

function createSummary(
  id: string,
  status: OrderStatus,
  orderNumber: string,
  orderType: OrderType = OrderType.Pickup,
  guestName = 'Guest User',
): OrderSummary {
  return {
    id,
    orderNumber,
    restaurantId: RESTAURANT_ID,
    customerId: null,
    guestName,
    guestPhone: '+10000000001',
    orderType,
    orderStatus: status,
    totalAmount: 25,
    currencyCode: 'SAR',
    createdAt: '2026-06-03T10:00:00.000Z',
    updatedAt: null,
  };
}

function createDetails(
  id: string,
  status: OrderStatus,
  orderType: OrderType = OrderType.Pickup,
): OrderDetails {
  return {
    ...createSummary(id, status, 'A-100', orderType),
    deliveryAddress: null,
    deliveryLatitude: null,
    deliveryLongitude: null,
    subtotal: 25,
    discountAmount: 0,
    taxAmount: 0,
    deliveryFee: 0,
    notes: 'No onions',
    items: [
      {
        id: 'item-1',
        menuItemId: null,
        itemNameAr: 'برجر',
        itemNameEn: 'Chicken Burger',
        unitPrice: 25,
        quantity: 1,
        totalPrice: 25,
        notes: 'Extra sauce',
      },
    ],
  };
}
