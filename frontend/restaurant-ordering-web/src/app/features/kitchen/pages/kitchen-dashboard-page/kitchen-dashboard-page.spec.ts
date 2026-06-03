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
} from '../../data-access/kitchen-orders.models';
import { KitchenDashboardPage } from './kitchen-dashboard-page';

const RESTAURANT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('KitchenDashboardPage', () => {
  let fixture: ComponentFixture<KitchenDashboardPage>;
  let httpMock: HttpTestingController;
  let session: AuthSessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KitchenDashboardPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.KitchenManager, RESTAURANT_ID));
    TestBed.inject(AuthService).restoreSessionFromStorage();

    fixture = TestBed.createComponent(KitchenDashboardPage);
  });

  afterEach(() => {
    httpMock.verify({ ignoreCancelled: true });
    session.clearSession();
  });

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function flushBoard(options?: {
    newOrders?: OrderSummary[];
    preparingOrders?: OrderSummary[];
    readyOrders?: OrderSummary[];
  }): void {
    const requests = httpMock.match(
      (req) =>
        req.url === `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders` &&
        req.method === 'GET',
    );
    expect(requests.length).toBe(3);

    const byStatus = new Map(
      requests.map((req) => [Number(req.request.params.get('status')), req]),
    );

    byStatus.get(OrderStatus.New)!.flush(resultFor(options?.newOrders ?? []));
    byStatus.get(OrderStatus.Preparing)!.flush(resultFor(options?.preparingOrders ?? []));
    byStatus.get(OrderStatus.Ready)!.flush(resultFor(options?.readyOrders ?? []));
    fixture.detectChanges();
  }

  it('shows loading then the three board columns', () => {
    fixture.detectChanges();
    expect(root().querySelector('[data-testid="kitchen-board-loading"]')).toBeTruthy();

    flushBoard();
    expect(root().querySelector('[data-testid="kitchen-board"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="kitchen-column-new"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="kitchen-column-preparing"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="kitchen-column-ready"]')).toBeTruthy();
  });

  it('shows empty state for each column when there are no orders', () => {
    fixture.detectChanges();
    flushBoard();

    expect(root().querySelector('[data-testid="kitchen-empty-new"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="kitchen-empty-preparing"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="kitchen-empty-ready"]')).toBeTruthy();
  });

  it('shows board error with retry when initial load fails', () => {
    fixture.detectChanges();
    const requests = httpMock.match(
      (req) =>
        req.url === `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders`,
    );
    expect(requests.length).toBe(3);
    requests[0].flush('failed', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="kitchen-board-error"]')).toBeTruthy();
  });

  it('shows Start Preparing only on New cards', () => {
    fixture.detectChanges();
    flushBoard({
      newOrders: [createSummary('order-new', OrderStatus.New, 'A-100')],
      preparingOrders: [createSummary('order-prep', OrderStatus.Preparing, 'A-101')],
      readyOrders: [createSummary('order-ready', OrderStatus.Ready, 'A-102')],
    });

    const newCard = root().querySelector('[data-testid="kitchen-order-order-new"]')!;
    const preparingCard = root().querySelector('[data-testid="kitchen-order-order-prep"]')!;
    const readyCard = root().querySelector('[data-testid="kitchen-order-order-ready"]')!;

    expect(newCard.querySelector('[data-testid="kitchen-action-start-preparing"]')).toBeTruthy();
    expect(preparingCard.querySelector('[data-testid="kitchen-action-start-preparing"]')).toBeNull();
    expect(readyCard.querySelector('[data-testid="kitchen-action-start-preparing"]')).toBeNull();
  });

  it('shows Mark as Ready only on Preparing cards', () => {
    fixture.detectChanges();
    flushBoard({
      preparingOrders: [createSummary('order-prep', OrderStatus.Preparing, 'A-101')],
    });

    expect(
      root().querySelector('[data-testid="kitchen-action-mark-ready"]'),
    ).toBeTruthy();
  });

  it('does not show Cancel or Complete actions on Ready cards', () => {
    fixture.detectChanges();
    flushBoard({
      readyOrders: [createSummary('order-ready', OrderStatus.Ready, 'A-102')],
    });

    const readyCard = root().querySelector('[data-testid="kitchen-order-order-ready"]')!;
    expect(readyCard.querySelector('[data-testid="kitchen-action-start-preparing"]')).toBeNull();
    expect(readyCard.querySelector('[data-testid="kitchen-action-mark-ready"]')).toBeNull();
    expect(readyCard.textContent).not.toContain('Cancel');
    expect(readyCard.textContent).not.toContain('Complete');
    expect(readyCard.querySelector('[data-testid="kitchen-ready-waiting"]')).toBeTruthy();
  });

  it('moves a card after a successful status update', () => {
    fixture.detectChanges();
    flushBoard({
      newOrders: [createSummary('order-new', OrderStatus.New, 'A-100')],
    });

    root()
      .querySelector<HTMLButtonElement>('[data-testid="kitchen-action-start-preparing"]')!
      .click();

    const patchReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders/order-new/status`,
    );
    expect(patchReq.request.body).toEqual({ newStatus: OrderStatus.Preparing });
    patchReq.flush(createSummary('order-new', OrderStatus.Preparing, 'A-100'));
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="kitchen-order-order-new"]')).toBeTruthy();
    expect(
      root().querySelector('[data-testid="kitchen-column-preparing"] [data-testid="kitchen-order-order-new"]'),
    ).toBeTruthy();
    expect(
      root().querySelector('[data-testid="kitchen-column-new"] [data-testid="kitchen-order-order-new"]'),
    ).toBeNull();
  });

  it('reloads the board and shows conflict feedback on 409', () => {
    const locale = TestBed.inject(LocaleService);

    fixture.detectChanges();
    flushBoard({
      newOrders: [createSummary('order-new', OrderStatus.New, 'A-100')],
    });

    root()
      .querySelector<HTMLButtonElement>('[data-testid="kitchen-action-start-preparing"]')!
      .click();

    const patchReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders/order-new/status`,
    );
    patchReq.flush({ title: 'Conflict.' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="kitchen-feedback"]')?.textContent).toContain(
      locale.uiText('kitchenErrorConflict'),
    );

    flushBoard();
  });

  it('opens details drawer with items and localized item names', () => {
    fixture.detectChanges();
    flushBoard({
      newOrders: [createSummary('order-new', OrderStatus.New, 'A-100')],
    });

    root()
      .querySelector<HTMLButtonElement>('[data-testid="kitchen-details-order-new"]')!
      .click();

    const detailsReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders/order-new`,
    );
    detailsReq.flush(createDetails('order-new', OrderStatus.New));
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="kitchen-details-drawer"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="kitchen-details-body"]')).toBeTruthy();
    expect(root().textContent).toContain('برجر');
  });

  it('falls back from itemNameEn to itemNameAr when English name is missing', () => {
    fixture.detectChanges();
    flushBoard({
      newOrders: [createSummary('order-new', OrderStatus.New, 'A-100')],
    });

    root()
      .querySelector<HTMLButtonElement>('[data-testid="kitchen-details-order-new"]')!
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

    expect(root().textContent).toContain('سلطة');
  });

  it('renders mobile tabs without breaking the board markup', () => {
    fixture.detectChanges();
    flushBoard();

    expect(root().querySelector('[data-testid="kitchen-mobile-tabs"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="kitchen-board"]')).toBeTruthy();
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
