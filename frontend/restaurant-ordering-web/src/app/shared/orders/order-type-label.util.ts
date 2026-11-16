import { OrderType } from '../../features/kitchen/data-access/kitchen-orders.models';

export type OrderLabelLocale = 'ar' | 'en';

const TYPE_LABELS: Record<OrderLabelLocale, Record<OrderType, string>> = {
  ar: {
    [OrderType.Pickup]: 'استلام',
    [OrderType.Delivery]: 'توصيل',
    [OrderType.DineIn]: 'تناول في المطعم',
  },
  en: {
    [OrderType.Pickup]: 'Pickup',
    [OrderType.Delivery]: 'Delivery',
    [OrderType.DineIn]: 'Dine in',
  },
};

export function getOrderTypeLabel(
  orderType: OrderType | number,
  locale: OrderLabelLocale,
): string {
  const key = Number(orderType) as OrderType;
  return TYPE_LABELS[locale][key] ?? String(orderType);
}

/**
 * Order type label that also names the table for dine-in orders ("Dine in · T1").
 * Pickup/delivery orders and legacy dine-in rows without a table keep the plain label.
 */
export function getOrderTypeLabelWithTable(
  orderType: OrderType | number,
  locale: OrderLabelLocale,
  tableName?: string | null,
): string {
  const label = getOrderTypeLabel(orderType, locale);
  const table = tableName?.trim();
  return Number(orderType) === OrderType.DineIn && table ? `${label} · ${table}` : label;
}
