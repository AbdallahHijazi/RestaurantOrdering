import { OrderStatus } from '../../features/kitchen/data-access/kitchen-orders.models';

export type OrderLabelLocale = 'ar' | 'en';

const STATUS_LABELS: Record<OrderLabelLocale, Record<OrderStatus, string>> = {
  ar: {
    [OrderStatus.New]: 'جديد',
    [OrderStatus.Preparing]: 'قيد التحضير',
    [OrderStatus.Ready]: 'جاهز',
    [OrderStatus.Completed]: 'مكتمل',
    [OrderStatus.Cancelled]: 'ملغي',
  },
  en: {
    [OrderStatus.New]: 'New',
    [OrderStatus.Preparing]: 'Preparing',
    [OrderStatus.Ready]: 'Ready',
    [OrderStatus.Completed]: 'Completed',
    [OrderStatus.Cancelled]: 'Cancelled',
  },
};

export function getOrderStatusLabel(
  status: OrderStatus | number,
  locale: OrderLabelLocale,
): string {
  const key = Number(status) as OrderStatus;
  return STATUS_LABELS[locale][key] ?? String(status);
}
