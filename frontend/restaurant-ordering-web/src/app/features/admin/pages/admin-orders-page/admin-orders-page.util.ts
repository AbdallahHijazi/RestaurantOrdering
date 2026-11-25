import type { SupportedLocale } from '../../../../core/localization/locale';
import {
  OrderStatus,
  OrderType,
  type OrderSummary,
} from '../../../kitchen/data-access/kitchen-orders.models';

export type OrderTypeFilter = 'all' | OrderType;
export type OrderGuestFilter = 'all' | string;

export interface OrderListFilters {
  status: 'all' | OrderStatus;
  search: string;
  orderType: OrderTypeFilter;
  guest: OrderGuestFilter;
}

export function shortenOrderNumber(orderNumber: string): string {
  const trimmed = orderNumber.trim();
  if (!trimmed) {
    return '—';
  }

  const normalized = trimmed.replace(/^ORD-/i, '');
  const suffix = normalized.length > 8 ? normalized.slice(0, 8) : normalized;
  return `#${suffix}`;
}

export function getAvatarInitials(guestName: string | null | undefined): string {
  const name = guestName?.trim();
  if (!name) {
    return '?';
  }

  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]!.charAt(0);
    const second = parts[1]!.charAt(0);
    return `${first}${second}`.toUpperCase();
  }

  return name.slice(0, Math.min(2, name.length)).toUpperCase();
}

export function formatRelativeOrderTime(value: string, locale: SupportedLocale): string {
  const created = new Date(value);
  if (Number.isNaN(created.getTime())) {
    return value;
  }

  const diffMs = Date.now() - created.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (locale === 'ar') {
    if (minutes < 1) {
      return 'الآن';
    }
    if (minutes < 60) {
      return `منذ ${minutes} د`;
    }
    if (hours < 24) {
      return `منذ ${hours} س`;
    }
    return `منذ ${days} ي`;
  }

  if (minutes < 1) {
    return 'Just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${days}d ago`;
}

export function buildGuestFilterOptions(
  orders: readonly OrderSummary[],
  allGuestsLabel: string,
): { value: string; label: string }[] {
  const names = new Set<string>();

  for (const order of orders) {
    const name = order.guestName?.trim();
    if (name) {
      names.add(name);
    }
  }

  return [
    { value: 'all', label: allGuestsLabel },
    ...[...names].sort((a, b) => a.localeCompare(b)).map((name) => ({
      value: name,
      label: name,
    })),
  ];
}

export function filterOrders(
  orders: readonly OrderSummary[],
  filters: OrderListFilters,
): OrderSummary[] {
  const query = filters.search.trim().toLowerCase();

  return orders.filter((order) => {
    if (filters.status !== 'all' && order.orderStatus !== filters.status) {
      return false;
    }

    if (filters.orderType !== 'all' && order.orderType !== filters.orderType) {
      return false;
    }

    if (filters.guest !== 'all') {
      const guestName = order.guestName?.trim() ?? '';
      if (guestName !== filters.guest) {
        return false;
      }
    }

    if (!query) {
      return true;
    }

    const orderNumber = order.orderNumber.toLowerCase();
    const guestName = (order.guestName ?? '').toLowerCase();
    const orderTypeText =
      order.orderType === OrderType.Delivery ? 'delivery توصيل' : 'pickup استلام';

    return (
      orderNumber.includes(query) ||
      guestName.includes(query) ||
      orderTypeText.includes(query)
    );
  });
}

export function hasActiveFilters(filters: OrderListFilters): boolean {
  return (
    filters.status !== 'all' ||
    filters.orderType !== 'all' ||
    filters.guest !== 'all' ||
    filters.search.trim().length > 0
  );
}
