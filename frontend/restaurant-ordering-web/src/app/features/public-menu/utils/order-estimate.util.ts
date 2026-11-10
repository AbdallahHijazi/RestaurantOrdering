import {
  ORDER_TYPE_DELIVERY,
  type PublicOrderType,
} from '../models/public-menu.models';
import type { PublicRestaurantOrderSettings } from '../models/public-menu.models';

export interface EstimatableLine {
  price: number;
  discountPrice?: number | null;
  quantity: number;
}

export function displayUnitPrice(line: Pick<EstimatableLine, 'price' | 'discountPrice'>): number {
  return line.discountPrice ?? line.price;
}

export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export interface OrderEstimate {
  subtotal: number;
  estimatedTax: number;
  deliveryFee: number;
  estimatedTotal: number;
}

export function estimateOrderTotals(
  lines: EstimatableLine[],
  settings: Pick<PublicRestaurantOrderSettings, 'taxRate' | 'deliveryFee'>,
  orderType: PublicOrderType,
): OrderEstimate {
  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + displayUnitPrice(line) * line.quantity, 0),
  );
  const estimatedTax = roundMoney((subtotal * settings.taxRate) / 100);
  const deliveryFee =
    orderType === ORDER_TYPE_DELIVERY ? roundMoney(settings.deliveryFee) : 0;
  const estimatedTotal = roundMoney(subtotal + estimatedTax + deliveryFee);

  return { subtotal, estimatedTax, deliveryFee, estimatedTotal };
}
