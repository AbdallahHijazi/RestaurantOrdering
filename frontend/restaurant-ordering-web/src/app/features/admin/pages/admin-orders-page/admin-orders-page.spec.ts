import { provideHttpClient } from '@angular/common/http';
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
    document.querySelectorAll('app-order-modal-shell').forEach((node) => node.remove());
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
        request.method === 'GET',
    );
    req.flush(resultFor(items));
    fixture.detectChanges();
  }

  it('shows loading, translated statuses, and actions for New orders', () => {
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('en');

    fixture.detectChanges();
    expect(root().querySelector('[data-testid="admin-orders-loading"]')).toBeTruthy();

    flushList([createSummary('order-new', OrderStatus.New, 'A-100')]);

    expect(root().querySelector('[data-testid="admin-orders-table"]')).toBeTruthy();
    expect(root().textContent).toContain(locale.uiText('adminOrdersStatusNew'));
    expect(
      root().querySelector('[data-testid="admin-order-action-order-new-2"]'),
    ).toBeTruthy();
    expect(
      root().querySelector('[data-testid="admin-order-action-order-new-5"]'),
    ).toBeTruthy();
  });

  it('shows Mark Ready and Cancel for Preparing orders', () => {
    fixture.detectChanges();
    flushList([createSummary('order-prep', OrderStatus.Preparing, 'A-101')]);

    expect(root().querySelector('[data-testid="admin-order-action-order-prep-3"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="admin-order-action-order-prep-5"]')).toBeTruthy();
  });

  it('shows Complete and Cancel for Ready orders', () => {
    fixture.detectChanges();
    flushList([createSummary('order-ready', OrderStatus.Ready, 'A-102')]);

    expect(root().querySelector('[data-testid="admin-order-action-order-ready-4"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="admin-order-action-order-ready-5"]')).toBeTruthy();
  });

  it('does not show actions for Completed or Cancelled orders', () => {
    fixture.detectChanges();
    flushList([
      createSummary('order-done', OrderStatus.Completed, 'A-103'),
      createSummary('order-cancelled', OrderStatus.Cancelled, 'A-104'),
    ]);

    expect(root().querySelector('[data-testid="admin-order-action-order-done-2"]')).toBeNull();
    expect(root().querySelector('[data-testid="admin-order-action-order-cancelled-5"]')).toBeNull();
  });

  it('opens centered details modal with items and totals', () => {
    TestBed.inject(LocaleService).setLocale('ar');
    fixture.detectChanges();
    flushList([createSummary('order-new', OrderStatus.New, 'A-100')]);

    root()
      .querySelector<HTMLButtonElement>('[data-testid="admin-order-details-order-new"]')!
      .click();

    const detailsReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders/order-new`,
    );
    detailsReq.flush(createDetails('order-new', OrderStatus.New));
    fixture.detectChanges();

    expect(root().querySelector('.kitchen-details__panel')).toBeNull();
    expect(document.body.querySelector('[data-testid="admin-order-details-modal"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="admin-orders-details-body"]')).toBeTruthy();
    expect(document.body.textContent).toContain('برجر');
  });

  it('falls back from itemNameEn to itemNameAr when English name is missing', () => {
    fixture.detectChanges();
    flushList([createSummary('order-new', OrderStatus.New, 'A-100')]);

    root()
      .querySelector<HTMLButtonElement>('[data-testid="admin-order-details-order-new"]')!
      .click();

    const detailsReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders/order-new`,
    );
    const details = createDetails('order-new', OrderStatus.New);
    details.items = [
      {
        id: 'item-1',
        menuItemId: null,
        itemNameAr: 'سلطة',
        itemNameEn: null,
        unitPrice: 10,
        quantity: 1,
        totalPrice: 10,
        notes: null,
      },
    ];
    detailsReq.flush(details);

    TestBed.inject(LocaleService).setLocale('en');
    fixture.detectChanges();

    expect(document.body.textContent).toContain('سلطة');
  });

  it('shows conflict feedback and refreshes on 409', () => {
    const locale = TestBed.inject(LocaleService);

    fixture.detectChanges();
    flushList([createSummary('order-new', OrderStatus.New, 'A-100')]);

    root()
      .querySelector<HTMLButtonElement>('[data-testid="admin-order-action-order-new-2"]')!
      .click();

    const patchReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders/order-new/status`,
    );
    patchReq.flush({ title: 'Conflict.' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="admin-orders-feedback"]')?.textContent).toContain(
      locale.uiText('adminOrdersErrorConflict'),
    );

    const refreshReq = httpMock.expectOne(
      (request) =>
        request.url === `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders`,
    );
    refreshReq.flush(resultFor([]));
    fixture.detectChanges();
  });

  it('shows not-found feedback and refreshes on details 404', () => {
    const locale = TestBed.inject(LocaleService);

    fixture.detectChanges();
    flushList([createSummary('order-new', OrderStatus.New, 'A-100')]);

    root()
      .querySelector<HTMLButtonElement>('[data-testid="admin-order-details-order-new"]')!
      .click();

    const detailsReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders/order-new`,
    );
    detailsReq.flush({ title: 'Not found.' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(
      document.body.querySelector('[data-testid="admin-orders-details-error"]')?.textContent,
    ).toContain(locale.uiText('adminOrdersErrorNotFound'));
  });

  it('shows empty state when there are no orders', () => {
    fixture.detectChanges();
    flushList([]);

    expect(root().querySelector('[data-testid="admin-orders-empty"]')).toBeTruthy();
  });

  it('shows error state with retry', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(
      (request) =>
        request.url === `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders`,
    );
    req.flush('failed', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="admin-orders-error"]')).toBeTruthy();
  });

  it('renders mobile cards without breaking the page markup', () => {
    fixture.detectChanges();
    flushList([createSummary('order-new', OrderStatus.New, 'A-100')]);

    expect(root().querySelector('[data-testid="admin-orders-cards"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="admin-order-card-order-new"]')).toBeTruthy();
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

function createSummary(id: string, status: OrderStatus, orderNumber: string): OrderSummary {
  return {
    id,
    orderNumber,
    restaurantId: RESTAURANT_ID,
    customerId: null,
    guestName: 'Guest User',
    guestPhone: '+10000000001',
    orderType: OrderType.Pickup,
    orderStatus: status,
    totalAmount: 25,
    currencyCode: 'SAR',
    createdAt: '2026-06-03T10:00:00.000Z',
    updatedAt: null,
  };
}

function createDetails(id: string, status: OrderStatus): OrderDetails {
  return {
    ...createSummary(id, status, 'A-100'),
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
