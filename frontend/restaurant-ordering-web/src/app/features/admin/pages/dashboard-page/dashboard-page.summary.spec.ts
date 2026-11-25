import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApplicationRoles } from '../../../../core/auth/application-roles';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { createTestSession } from '../../../../core/auth/test-jwt.util';
import { API_BASE_URL } from '../../../../core/config/api-config';
import { LocaleService } from '../../../../core/localization/locale';
import { formatOrderDateTime } from '../../../../shared/orders/order-date-time.util';
import {
  OrderStatus,
  OrderType,
  type DashboardSummary,
  type OrderSummary,
} from '../../../kitchen/data-access/kitchen-orders.models';
import { DashboardPage } from './dashboard-page';

const RESTAURANT_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const BASE = `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}`;

/**
 * BUG-001 (server-side statistics), BUG-002 (restaurant currency), BUG-003 (error state, never fake zeros),
 * BUG-007 (localisation) and BUG-008 (consistent date format) for the dashboard.
 */
describe('DashboardPage statistics', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let httpMock: HttpTestingController;
  let session: AuthSessionService;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner, RESTAURANT_ID));
    TestBed.inject(AuthService).restoreSessionFromStorage();
    TestBed.inject(LocaleService).setLocale('en');

    fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
  });

  afterEach(() => {
    // tests that do not care about the weekly chart leave its request open: answer it so verify() stays strict
    httpMock.match(`${BASE}/dashboard/activity?days=7`).forEach((req) => req.flush(createActivity([])));
    TestBed.inject(LocaleService).setLocale('ar');
    httpMock.verify({ ignoreCancelled: true });
    session.clearSession();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const stat = (id: string) =>
    root().querySelector(`[data-testid="dashboard-stat-${id}"]`)!.textContent!.trim();

  function summaryRequest() {
    return httpMock.expectOne(`${BASE}/dashboard/summary`);
  }

  function activityRequest() {
    return httpMock.expectOne(`${BASE}/dashboard/activity?days=7`);
  }

  function ordersRequest() {
    return httpMock.expectOne(
      (request) => request.url === `${BASE}/orders` && request.params.get('pageSize') === '5',
    );
  }

  function flushAll(summary: Partial<DashboardSummary> = {}, orders: OrderSummary[] = []): void {
    summaryRequest().flush(createSummary(summary));
    ordersRequest().flush({ items: orders, totalCount: orders.length, pageNumber: 1, pageSize: 5 });
    fixture.detectChanges();
  }

  it('shows the server aggregates, not figures derived from the five listed rows (BUG-001)', () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      createOrder(`o${i}`, OrderStatus.New, 10, 'JOD'),
    );

    flushAll(
      { todayOrders: 23, activeOrders: 19, todaySales: 314.83, averageOrderValue: 13.69, currencyCode: 'JOD' },
      rows,
    );

    expect(stat('today-orders')).toBe('23');
    expect(stat('active-orders')).toBe('19');
    expect(stat('today-sales')).toContain('314.83');
    expect(stat('average-order')).toContain('13.69');
    // the 5 listed rows would have produced 5 orders / 50.00 sales
    expect(stat('today-orders')).not.toBe('5');
    expect(stat('today-sales')).not.toContain('50.00');
  });

  it('formats money with the restaurant currency instead of a hard-coded dollar (BUG-002)', () => {
    flushAll({ todaySales: 74.8, averageOrderValue: 14.96, currencyCode: 'JOD' });

    expect(stat('today-sales')).toContain('JOD');
    expect(stat('average-order')).toContain('JOD');
    expect(stat('today-sales')).not.toContain('$');
    expect(stat('average-order')).not.toContain('$');
  });

  it('follows another configured currency without any hard-coding (BUG-002)', () => {
    flushAll({ todaySales: 100, averageOrderValue: 25, currencyCode: 'SAR' });

    expect(stat('today-sales')).not.toContain('JOD');
    expect(stat('today-sales')).toMatch(/SAR|SR|ر\.س/);
  });

  it('shows a genuine empty day as zeros without an error (BUG-003)', () => {
    flushAll({ todayOrders: 0, activeOrders: 0, todaySales: 0, averageOrderValue: 0 }, []);

    expect(stat('today-orders')).toBe('0');
    expect(stat('active-orders')).toBe('0');
    expect(root().querySelector('[data-testid="dashboard-stats-error"]')).toBeNull();
    expect(root().textContent).toContain('No recent orders');
  });

  it('shows an error with a retry — and no fake zeros — when the statistics request fails (BUG-003)', () => {
    summaryRequest().flush({ title: 'boom' }, { status: 500, statusText: 'Server Error' });
    ordersRequest().flush({ items: [], totalCount: 0, pageNumber: 1, pageSize: 5 });
    fixture.detectChanges();

    const alert = root().querySelector('[data-testid="dashboard-stats-error"]');
    expect(alert).toBeTruthy();
    expect(alert!.textContent).toContain('Could not load the dashboard statistics');
    expect(stat('today-orders')).toBe('—');
    expect(stat('active-orders')).toBe('—');
    expect(stat('today-sales')).toBe('—');
    expect(stat('average-order')).toBe('—');
    expect(root().querySelector('.admin-dashboard__stats')!.textContent).not.toMatch(/\b0\b|0\.00/);
  });

  it('retry reloads the data once and replaces the error with the real figures (BUG-003)', () => {
    summaryRequest().flush({}, { status: 500, statusText: 'Server Error' });
    ordersRequest().flush({ items: [], totalCount: 0, pageNumber: 1, pageSize: 5 });
    fixture.detectChanges();

    root().querySelector<HTMLButtonElement>('[data-testid="dashboard-stats-retry"]')!.click();
    fixture.detectChanges();

    // a double click while loading must not fire a second request
    root().querySelector<HTMLButtonElement>('[data-testid="dashboard-stats-retry"]')?.click();

    summaryRequest().flush(createSummary({ todayOrders: 7, currencyCode: 'JOD' }));
    ordersRequest().flush({ items: [], totalCount: 0, pageNumber: 1, pageSize: 5 });
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="dashboard-stats-error"]')).toBeNull();
    expect(stat('today-orders')).toBe('7');
  });

  it('keeps the statistics visible and reports a failed recent-orders list separately', () => {
    summaryRequest().flush(createSummary({ todayOrders: 4 }));
    ordersRequest().flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(stat('today-orders')).toBe('4');
    expect(root().querySelector('[data-testid="dashboard-stats-error"]')).toBeNull();
    expect(root().querySelector('[data-testid="dashboard-orders-error"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="dashboard-orders-retry"]')).toBeTruthy();
  });

  it('renders every label in English when the interface language is English (BUG-007)', () => {
    flushAll({}, [createOrder('o1', OrderStatus.Preparing, 12, 'JOD', OrderType.DineIn)]);

    const text = root().textContent!;
    expect(text).not.toMatch(/[؀-ۿ]/);
    expect(text).toContain("Today's orders");
    expect(text).toContain('In progress');
    expect(text).toContain("Today's sales");
    expect(text).toContain('Average order');
    expect(text).toContain('Recent orders');
    expect(root().querySelector('[data-testid="dashboard-refresh"]')!.getAttribute('aria-label')).toBe('Refresh');
    expect(text).toContain('Quick actions');
    expect(text).toContain('Order no.');
    expect(text).toContain('Preparing');
    expect(text).toContain('Dine in');
  });

  it('switches every label to Arabic and back without reloading (BUG-007)', () => {
    flushAll({}, [createOrder('o1', OrderStatus.New, 12, 'JOD')]);
    const locale = TestBed.inject(LocaleService);

    locale.setLocale('ar');
    fixture.detectChanges();
    expect(root().textContent).toContain('طلبات اليوم');
    expect(root().textContent).toContain('مبيعات اليوم');
    expect(root().textContent).toContain('إجراءات سريعة');

    locale.setLocale('en');
    fixture.detectChanges();
    expect(root().textContent).toContain("Today's orders");
    expect(root().textContent).not.toContain('طلبات اليوم');
  });

  it('uses the shared order date format for the recent orders (BUG-008)', () => {
    const order = createOrder('o1', OrderStatus.New, 12, 'JOD');
    flushAll({}, [order]);

    expect(root().querySelector('.orders-table__time')!.textContent!.trim()).toBe(
      formatOrderDateTime(order.createdAt),
    );
    // day/month/year, not the US month/day/yy format of Angular's 'short' date pipe
    expect(root().querySelector('.orders-table__time')!.textContent!.trim()).toMatch(
      /^\d{2}\/\d{2}\/\d{4}/,
    );
  });

  // ───────────────────────── UX-004: real 7-day activity chart ─────────────────────────

  it('draws the weekly chart from real backend data, scaled to the busiest day (UX-004)', () => {
    summaryRequest().flush(createSummary());
    ordersRequest().flush({ items: [], totalCount: 0, pageNumber: 1, pageSize: 5 });
    activityRequest().flush(createActivity([0, 2, 4, 0, 8, 1, 3]));
    fixture.detectChanges();

    const items = root().querySelectorAll('[data-testid^="dashboard-activity-day-"]');
    expect(items).toHaveLength(7);
    const heights = Array.from(root().querySelectorAll<HTMLElement>('.activity-bars__bar')).map((bar) =>
      Number.parseFloat(bar.style.height),
    );
    expect(heights[4]).toBe(100); // busiest day = full height
    expect(heights[2]).toBe(50);
    expect(heights[0]).toBe(0);
    expect(root().querySelector('[data-testid="dashboard-activity-day-2026-11-13"]')!.textContent).toContain('8');
    expect(root().querySelectorAll('.activity-bars__bar--today')).toHaveLength(1);
    expect(root().querySelector('[data-testid="dashboard-activity-empty"]')).toBeNull();
  });

  it('shows an honest empty state — never invented bars — when there were no orders (UX-004)', () => {
    summaryRequest().flush(createSummary());
    ordersRequest().flush({ items: [], totalCount: 0, pageNumber: 1, pageSize: 5 });
    activityRequest().flush(createActivity([0, 0, 0, 0, 0, 0, 0]));
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="dashboard-activity-empty"]')).toBeTruthy();
    expect(root().querySelectorAll('.activity-bars__bar')).toHaveLength(0);
  });

  it('reports a failed activity request with a retry instead of drawing anything (UX-004)', () => {
    summaryRequest().flush(createSummary());
    ordersRequest().flush({ items: [], totalCount: 0, pageNumber: 1, pageSize: 5 });
    activityRequest().flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="dashboard-activity-error"]')).toBeTruthy();
    expect(root().querySelector('[data-testid="dashboard-activity-retry"]')).toBeTruthy();
    expect(root().querySelectorAll('.activity-bars__bar')).toHaveLength(0);
  });
});

function createActivity(counts: number[]) {
  return {
    restaurantId: RESTAURANT_ID,
    currencyCode: 'JOD',
    timeZone: 'Asia/Amman',
    days: counts.map((orders, index) => ({
      date: `2026-11-${String(9 + index).padStart(2, '0')}`,
      orders,
      cancelledOrders: 0,
      sales: orders * 10,
    })),
  };
}

function createSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    restaurantId: RESTAURANT_ID,
    currencyCode: 'JOD',
    timeZone: 'Asia/Amman',
    dayStartUtc: '2026-11-14T21:00:00Z',
    dayEndUtc: '2026-11-15T21:00:00Z',
    todayOrders: 0,
    todayCancelledOrders: 0,
    activeOrders: 0,
    todaySales: 0,
    averageOrderValue: 0,
    ...overrides,
  };
}

function createOrder(
  id: string,
  status: OrderStatus,
  total: number,
  currency: string,
  type: OrderType = OrderType.Pickup,
): OrderSummary {
  return {
    id,
    orderNumber: `ORD-${id}`,
    restaurantId: RESTAURANT_ID,
    customerId: null,
    guestName: 'Guest User',
    guestPhone: '+962791234567',
    orderType: type,
    orderStatus: status,
    totalAmount: total,
    currencyCode: currency,
    createdAt: '2026-11-15T16:37:00.000Z',
    updatedAt: null,
  };
}
