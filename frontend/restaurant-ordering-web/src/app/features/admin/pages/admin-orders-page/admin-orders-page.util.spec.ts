import { OrderStatus, OrderType, type OrderSummary } from '../../../kitchen/data-access/kitchen-orders.models';
import {
  filterOrders,
  formatRelativeOrderTime,
  getAvatarInitials,
  shortenOrderNumber,
} from './admin-orders-page.util';

describe('admin-orders-page.util', () => {
  it('shortens order numbers from the real suffix', () => {
    expect(shortenOrderNumber('ORD-7F29134F948B4E60')).toBe('#7F29134F');
    expect(shortenOrderNumber('A-100')).toBe('#A-100');
  });

  it('derives avatar initials from guest names', () => {
    expect(getAvatarInitials('Abdallah Hijazi')).toBe('AH');
    expect(getAvatarInitials(null)).toBe('?');
    expect(getAvatarInitials('سلطة')).toBe('سل');
  });

  it('filters orders locally by status, search, type, and guest', () => {
    const orders = [
      createSummary('1', OrderStatus.New, 'ORD-100', OrderType.Delivery, 'Ali'),
      createSummary('2', OrderStatus.Completed, 'ORD-200', OrderType.Pickup, 'Sara'),
    ];

    expect(
      filterOrders(orders, {
        status: OrderStatus.New,
        search: '',
        orderType: 'all',
        guest: 'all',
      }),
    ).toHaveLength(1);

    expect(
      filterOrders(orders, {
        status: 'all',
        search: 'sara',
        orderType: 'all',
        guest: 'all',
      }),
    ).toHaveLength(1);

    expect(
      filterOrders(orders, {
        status: 'all',
        search: '',
        orderType: OrderType.Delivery,
        guest: 'Ali',
      }),
    ).toHaveLength(1);
  });

  it('formats relative time in Arabic and English', () => {
    const recent = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatRelativeOrderTime(recent, 'ar')).toContain('منذ');
    expect(formatRelativeOrderTime(recent, 'en')).toContain('m ago');
  });
});

function createSummary(
  id: string,
  status: OrderStatus,
  orderNumber: string,
  orderType: OrderType,
  guestName: string,
): OrderSummary {
  return {
    id,
    orderNumber,
    restaurantId: 'restaurant',
    customerId: null,
    guestName,
    guestPhone: null,
    orderType,
    orderStatus: status,
    totalAmount: 10,
    currencyCode: 'SAR',
    createdAt: '2026-06-03T10:00:00.000Z',
    updatedAt: null,
  };
}
