import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '../../../core/config/api-config';
import { AuthService } from '../../../core/auth/auth.service';
import { ApplicationRoles } from '../../../core/auth/application-roles';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { createTestSession } from '../../../core/auth/test-jwt.util';
import {
  KITCHEN_ORDERS_PAGE_SIZE,
  OrderStatus,
  type GetOrdersResult,
  type OrderSummary,
} from './kitchen-orders.models';
import { KitchenOrdersService } from './kitchen-orders.service';

const RESTAURANT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('KitchenOrdersService', () => {
  let service: KitchenOrdersService;
  let httpMock: HttpTestingController;
  let session: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.KitchenManager, RESTAURANT_ID));
    TestBed.inject(AuthService).restoreSessionFromStorage();
    service = TestBed.inject(KitchenOrdersService);
  });

  afterEach(() => {
    httpMock.verify();
    session.clearSession();
  });

  it('reads restaurantId from the central session', () => {
    expect(service.getRestaurantId()).toBe(RESTAURANT_ID);
  });

  it('sends list requests for New, Preparing, and Ready statuses', () => {
    const statuses = [OrderStatus.New, OrderStatus.Preparing, OrderStatus.Ready];

    statuses.forEach((status) => {
      service.listOrders(status).subscribe();
      const req = httpMock.expectOne((request) => {
        return (
          request.url === `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders` &&
          request.params.get('status') === String(status) &&
          request.params.get('pageNumber') === '1' &&
          request.params.get('pageSize') === String(KITCHEN_ORDERS_PAGE_SIZE)
        );
      });
      req.flush(emptyResult());
    });
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

  it('patches order status with the correct newStatus value', () => {
    const orderId = 'aaaaaaaa-8888-8888-8888-888888888888';
    service.updateOrderStatus(orderId, { newStatus: OrderStatus.Preparing }).subscribe();

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/orders/${orderId}/status`,
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ newStatus: OrderStatus.Preparing });
    req.flush({} as OrderSummary);
  });
});

function emptyResult(): GetOrdersResult {
  return {
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: KITCHEN_ORDERS_PAGE_SIZE,
  };
}
