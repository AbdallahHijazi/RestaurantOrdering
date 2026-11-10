import { describe, expect, it } from 'vitest';
import { effectiveUnitPrice, hasValidDiscount } from './menu-item-price.util';

describe('menu-item-price.util', () => {
  it('accepts valid discounts only', () => {
    expect(hasValidDiscount(20, 15)).toBe(true);
    expect(hasValidDiscount(20, 20)).toBe(false);
    expect(hasValidDiscount(20, 0)).toBe(false);
    expect(hasValidDiscount(20, null)).toBe(false);
  });

  it('returns the discounted unit price when valid', () => {
    expect(effectiveUnitPrice(20, 15)).toBe(15);
    expect(effectiveUnitPrice(20, null)).toBe(20);
  });
});
