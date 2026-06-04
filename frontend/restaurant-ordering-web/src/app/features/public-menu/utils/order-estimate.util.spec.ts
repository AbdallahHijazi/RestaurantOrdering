import { describe, expect, it } from 'vitest';
import {
  ORDER_TYPE_DELIVERY,
  ORDER_TYPE_PICKUP,
} from '../models/public-menu.models';
import { estimateOrderTotals } from './order-estimate.util';

describe('estimateOrderTotals', () => {
  const settings = { taxRate: 15, deliveryFee: 10 };

  it('calculates pickup totals without delivery fee', () => {
    const result = estimateOrderTotals(
      [{ price: 25, discountPrice: 20, quantity: 2 }],
      settings,
      ORDER_TYPE_PICKUP,
    );

    expect(result.subtotal).toBe(40);
    expect(result.estimatedTax).toBe(6);
    expect(result.deliveryFee).toBe(0);
    expect(result.estimatedTotal).toBe(46);
  });

  it('includes delivery fee for delivery orders', () => {
    const result = estimateOrderTotals(
      [{ price: 25, quantity: 2 }],
      settings,
      ORDER_TYPE_DELIVERY,
    );

    expect(result.subtotal).toBe(50);
    expect(result.estimatedTax).toBe(7.5);
    expect(result.deliveryFee).toBe(10);
    expect(result.estimatedTotal).toBe(67.5);
  });
});
