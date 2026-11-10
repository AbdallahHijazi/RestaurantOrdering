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
