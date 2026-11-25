import type { MenuDiscount, MenuDiscountType, MenuPrice } from '../../../../shared/models/menu-item-size';

export function discountRule(type: MenuDiscountType | 0, value: number | null): MenuDiscount | null {
  return type && value !== null ? { type, value } : null;
}

export function previewMenuPrice(
  base: number | null,
  type: MenuDiscountType | 0,
  value: number | null,
): MenuPrice | null {
  if (!isMoney(base) || (type && (!isMoney(value) || value > (type === 1 ? 100 : base)))) {
    return null;
  }

  const cents = Math.round(base * 100);
  const discountValue = Math.round((value ?? 0) * 100);
  const finalCents = type === 1 ? Math.round(cents * (10_000 - discountValue) / 10_000) :
    type === 2 ? cents - discountValue : type === 3 ? discountValue : cents;
  return { basePrice: base, finalPrice: finalCents / 100, discountAmount: (cents - finalCents) / 100 };
}

function isMoney(value: number | null): value is number {
  return value !== null && Number.isFinite(value) &&
    value >= 0 && value <= 99_999_999.99 && Number(value.toFixed(2)) === value;
}
