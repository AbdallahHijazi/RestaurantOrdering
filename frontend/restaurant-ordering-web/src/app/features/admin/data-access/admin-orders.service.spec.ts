import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '../../../core/config/api-config';
import { AuthService } from '../../../core/auth/auth.service';
import { ApplicationRoles } from '../../../core/auth/application-roles';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { createTestSession } from '../../../core/auth/test-jwt.util';
import {
  OrderStatus,
  type GetOrdersResult,
  type OrderSummary,
} from '../../kitchen/data-access/kitchen-orders.models';
import { ADMIN_ORDERS_PAGE_SIZE, AdminOrdersService } from './admin-orders.service';

const RESTAURANT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('AdminOrdersService', () => {
  let service: AdminOrdersService;
  let httpMock: HttpTestingController;
  let session: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner, RESTAURANT_ID));
    TestBed.inject(AuthService).restoreSessionFromStorage();
    service = TestBed.inject(AdminOrdersService);
  });

  afterEach(() => {
    httpMock.verify();
    session.clearSession();
  });

  it('reads restaurantId from the central session', () => {
    expect(service.getRestaurantId()).toBe(RESTAURANT_ID);
  });

  it('sends list requests with filters and pagination', () => {
    service.listOrders(OrderStatus.New, 2, 20).subscribe();
    const req = httpMock.expectOne((request) => {
      return (
        request.url === `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders` &&
        request.params.get('status') === String(OrderStatus.New) &&
        request.params.get('pageNumber') === '2' &&
        request.params.get('pageSize') === String(ADMIN_ORDERS_PAGE_SIZE)
      );
    });
    req.flush(emptyResult());
  });

  it('omits status filter when listing all orders', () => {
    service.listOrders(null).subscribe();
    const req = httpMock.expectOne((request) => {
      return (
        request.url === `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders` &&
        request.params.has('status') === false &&
        request.params.get('pageNumber') === '1'
      );
    });
    req.flush(emptyResult());
  });

  it('loads order details with the correct order id', () => {
    const orderId = 'aaaaaaaa-8888-8888-8888-888888888888';
    service.getOrderDetails(orderId).subscribe();

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders/${orderId}`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('patches order status with numeric newStatus', () => {
    const orderId = 'aaaaaaaa-8888-8888-8888-888888888888';
    service.updateOrderStatus(orderId, { newStatus: OrderStatus.Completed }).subscribe();

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders/${orderId}/status`,
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ newStatus: OrderStatus.Completed });
    req.flush({} as OrderSummary);
  });
});

function emptyResult(): GetOrdersResult {
  return {
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: ADMIN_ORDERS_PAGE_SIZE,
  };
}
