import type { MenuItemSize } from '../../../shared/models/menu-item-size';
import type { PublicMenuItem } from '../models/public-menu.models';

export function hasValidDiscount(
  originalPrice: number,
  discountPrice?: number | null,
): discountPrice is number {
  return (
    discountPrice != null &&
    discountPrice >= 0 &&
    discountPrice < originalPrice
  );
}

export function effectiveUnitPrice(
  originalPrice: number,
  discountPrice?: number | null,
): number {
  return hasValidDiscount(originalPrice, discountPrice) ? discountPrice : originalPrice;
}

export function menuItemPrice(item: PublicMenuItem, size?: MenuItemSize) {
  const pricing = size ? item.sizePrices?.[size.id] : item.pricing;
  const basePrice = pricing?.basePrice ?? size?.price ?? item.price;
  const finalPrice = pricing?.finalPrice ?? (size ? basePrice : effectiveUnitPrice(basePrice, item.discountPrice));
  return { basePrice, finalPrice };
}
