import { describe, expect, it } from 'vitest';
import { OrderStatus, OrderType } from '../../features/kitchen/data-access/kitchen-orders.models';
import { shouldShowFinancialAmount } from './order-display.util';
import { formatOrderDateTime } from './order-date-time.util';
import { formatOrderCurrency } from './order-money.util';
import { getOrderStatusLabel } from './order-status-label.util';
import { getOrderTypeLabel } from './order-type-label.util';

describe('order presentation utils', () => {
  it('formats USD with narrow symbol and Latin digits', () => {
    const formatted = formatOrderCurrency(10.5, 'USD');
    expect(formatted).toBe('$10.50');
    expect(formatted).not.toMatch(/[٠-٩]/);
  });

  it('formats EUR with symbol and falls back for invalid codes', () => {
    expect(formatOrderCurrency(1, 'EUR')).toMatch(/€/);
    expect(formatOrderCurrency(2, 'NOTREAL')).toBe('NOTREAL 2.00');
  });

  it('formats date/time with Latin digits', () => {
    const formatted = formatOrderDateTime('2026-06-04T12:23:00.000Z');
    expect(formatted).not.toMatch(/[٠-٩]/);
    expect(formatted).toMatch(/\d/);
  });

  it('maps order status labels without raw enum numbers', () => {
    expect(getOrderStatusLabel(OrderStatus.New, 'en')).toBe('New');
    expect(getOrderStatusLabel(OrderStatus.Preparing, 'ar')).toBe('قيد التحضير');
    expect(getOrderStatusLabel(99, 'en')).toBe('99');
  });

  it('maps order type labels without raw enum numbers', () => {
    expect(getOrderTypeLabel(OrderType.Pickup, 'en')).toBe('Pickup');
    expect(getOrderTypeLabel(OrderType.Delivery, 'ar')).toBe('توصيل');
  });

  it('hides zero-value financial rows', () => {
    expect(shouldShowFinancialAmount(0)).toBe(false);
    expect(shouldShowFinancialAmount(0.0)).toBe(false);
    expect(shouldShowFinancialAmount(null)).toBe(false);
    expect(shouldShowFinancialAmount(2.5)).toBe(true);
  });
});
