import type { UpdatedOrderPrice } from './public-order.dto';
import { menuItemPrice } from '../utils/menu-item-price.util';
import { Injectable, computed, signal } from '@angular/core';
import { cartLineKey, type PublicCartLineItem, type PublicCartSnapshot } from '../models/public-cart.models';
import type { MenuItemSize } from '../../../shared/models/menu-item-size';
import type { PublicMenuItem } from '../models/public-menu.models';
import { ORDER_TYPE_DINE_IN } from '../models/public-menu.models';
import type { ResolvedPublicTable } from './public-tables.models';
import { PUBLIC_CART_MAX_QUANTITY, PUBLIC_CART_MIN_QUANTITY } from '../models/public-menu.models';

const STORAGE_PREFIX = 'restaurant-ordering.cart.';

function storageKey(slug: string): string {
  return `${STORAGE_PREFIX}${slug.trim().toLowerCase()}`;
}

function isValidLine(raw: unknown): raw is PublicCartLineItem {
  if (!raw || typeof raw !== 'object') {
    return false;
  }

  const line = raw as Partial<PublicCartLineItem>;
  return (
    typeof line.menuItemId === 'string' &&
    line.menuItemId.length > 0 &&
    (line.menuItemSizeId == null || (typeof line.menuItemSizeId === 'string' &&
      line.menuItemSizeId.length > 0 && typeof line.sizeName === 'string')) &&
    (typeof line.nameAr === 'string' || typeof line.name === 'string') &&
    typeof line.price === 'number' &&
    Number.isFinite(line.price) && line.price >= 0 &&
    (line.discountPrice == null || (Number.isFinite(line.discountPrice) &&
      line.discountPrice >= 0 && line.discountPrice <= line.price)) &&
    typeof line.quantity === 'number' &&
    Number.isInteger(line.quantity) &&
    line.quantity >= PUBLIC_CART_MIN_QUANTITY &&
    line.quantity <= PUBLIC_CART_MAX_QUANTITY
  );
}

function parseSnapshot(raw: string): PublicCartLineItem[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const items = (parsed as PublicCartSnapshot).items;
    if (!Array.isArray(items) || items.length === 0) {
      return items?.length === 0 ? [] : null;
    }

    if (!items.every(isValidLine)) {
      return null;
    }

    return items;
  } catch {
    return null;
  }
}

export interface PublicTableSession {
  token: string;
  tableId: string;
  tableName: string;
  zone: string | null;
}

function createCartLineFromItem(
  item: PublicMenuItem, quantity: number, size?: MenuItemSize,
): PublicCartLineItem {
  const { basePrice, finalPrice } = menuItemPrice(item, size);
  return {
    menuItemId: item.id,
    ...(size ? { menuItemSizeId: size.id, sizeName: size.name } : {}),
    name: item.name ?? null,
    nameAr: item.nameAr || item.name || '',
    nameEn: item.nameEn,
    resolvedLocale: item.resolvedLocale ?? null,
    imageUrl: item.imageUrl,
    price: basePrice,
    discountPrice: finalPrice < basePrice ? finalPrice : null,
    quantity,
    notes: null,
  };
}

@Injectable({
  providedIn: 'root',
})
export class PublicCartService {
  private readonly activeSlug = signal<string | null>(null);
  private readonly items = signal<PublicCartLineItem[]>([]);
  private readonly tableSession = signal<PublicTableSession | null>(null);

  readonly cartItems = this.items.asReadonly();
  readonly restaurantSlug = this.activeSlug.asReadonly();
  readonly resolvedTable = this.tableSession.asReadonly();
  readonly hasTableSession = computed(() => this.tableSession() !== null);
  readonly dineInOrderType = ORDER_TYPE_DINE_IN;

  readonly itemCount = computed(() =>
    this.items().reduce((total, line) => total + line.quantity, 0),
  );

  readonly isEmpty = computed(() => this.items().length === 0);

  initForRestaurant(slug: string): void {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) {
      return;
    }

    if (this.activeSlug() !== normalized) {
      this.activeSlug.set(normalized);
      this.items.set(this.readStorage(normalized));
      this.tableSession.set(null);
    }
  }

  setTableSession(table: ResolvedPublicTable, token: string): void {
    this.tableSession.set({
      token: token.trim(),
      tableId: table.tableId,
      tableName: table.tableName,
      zone: table.zone,
    });
  }

  clearTableSession(): void {
    this.tableSession.set(null);
  }

  tableToken(): string | null {
    return this.tableSession()?.token ?? null;
  }

  quantityFor(menuItemId: string, menuItemSizeId?: string): number {
    const key = cartLineKey(menuItemId, menuItemSizeId);
    return this.items().find((line) => cartLineKey(line.menuItemId, line.menuItemSizeId) === key)?.quantity ?? 0;
  }

  addMenuItem(item: PublicMenuItem, sizeId?: string, quantity = PUBLIC_CART_MIN_QUANTITY): boolean {
    return this.setQuantity(item, this.quantityFor(item.id, sizeId) + quantity, sizeId);
  }

  setQuantity(item: PublicMenuItem, quantity: number, sizeId?: string): boolean {
    if (quantity <= 0) {
      this.removeItem(cartLineKey(item.id, sizeId));
      return true;
    }

    const size = item.usesSizes && sizeId
      ? item.sizes?.find((option) => option.id === sizeId && option.isAvailable)
      : undefined;
    if (!item.isAvailable || (item.usesSizes ? !size : !!sizeId)) {
      return false;
    }

    this.setLineQuantity(createCartLineFromItem(item, quantity, size), quantity);
    return true;
  }

  setStoredLineQuantity(line: PublicCartLineItem, quantity: number): void {
    this.setLineQuantity(line, quantity);
  }

  private setLineQuantity(line: PublicCartLineItem, quantity: number): void {
    const key = cartLineKey(line.menuItemId, line.menuItemSizeId);
    if (quantity <= 0) {
      this.removeItem(key);
      return;
    }

    const clamped = Math.min(PUBLIC_CART_MAX_QUANTITY, Math.max(PUBLIC_CART_MIN_QUANTITY, quantity));
    this.items.update((lines) => {
      const index = lines.findIndex((existing) => cartLineKey(existing.menuItemId, existing.menuItemSizeId) === key);
      if (index < 0) return [...lines, { ...line, quantity: clamped }];

      return lines.map((existing, current) => current === index
        ? {
            ...line,
            // Keep the quoted price until the server explicitly reports a price change.
            price: existing.price,
            discountPrice: existing.discountPrice,
            quantity: clamped,
            notes: existing.notes,
            name: line.name ?? existing.name ?? null,
            resolvedLocale: line.resolvedLocale ?? existing.resolvedLocale ?? null,
          }
        : existing);
    });
    this.persist();
  }

  incrementItem(item: PublicMenuItem): boolean {
    const current = this.quantityFor(item.id);
    if (current === 0) {
      return this.addMenuItem(item);
    }

    return this.setQuantity(item, current + 1);
  }

  decrementItem(item: PublicMenuItem): void {
    const current = this.quantityFor(item.id);
    if (current <= 1) {
      this.removeItem(item.id);
      return;
    }

    this.setQuantity(item, current - 1);
  }

  removeItem(key: string): void {
    const next = this.items().filter((line) => cartLineKey(line.menuItemId, line.menuItemSizeId) !== key);
    if (next.length === this.items().length) {
      return;
    }

    this.items.set(next);
    this.persist();
  }

  updateItemNotes(key: string, notes: string | null): void {
    const trimmed = notes?.trim() ? notes.trim() : null;
    this.items.update((lines) =>
      lines.map((line) =>
        cartLineKey(line.menuItemId, line.menuItemSizeId) === key ? { ...line, notes: trimmed } : line,
      ),
    );
    this.persist();
  }

  applyPriceUpdates(prices: readonly UpdatedOrderPrice[]): void {
    const byLine = new Map(prices.map((price) => [cartLineKey(price.menuItemId, price.menuItemSizeId), price]));
    this.items.update((lines) => lines.map((line) => {
      const updated = byLine.get(cartLineKey(line.menuItemId, line.menuItemSizeId));
      return updated
        ? { ...line, price: updated.basePrice, discountPrice: updated.finalPrice < updated.basePrice ? updated.finalPrice : null }
        : line;
    }));
    this.persist();
  }

  clearCart(): void {
    if (this.items().length === 0) {
      return;
    }

    this.items.set([]);
    this.persist();
  }

  private readStorage(slug: string): PublicCartLineItem[] {
    try {
      const raw = sessionStorage.getItem(storageKey(slug));
      if (!raw) {
        return [];
      }

      const parsed = parseSnapshot(raw);
      if (parsed === null) {
        sessionStorage.removeItem(storageKey(slug));
        return [];
      }

      return parsed;
    } catch {
      return [];
    }
  }

  private persist(): void {
    const slug = this.activeSlug();
    if (!slug) {
      return;
    }

    try {
      const key = storageKey(slug);
      if (this.items().length === 0) {
        sessionStorage.removeItem(key);
        return;
      }

      const snapshot: PublicCartSnapshot = { items: this.items() };
      sessionStorage.setItem(key, JSON.stringify(snapshot));
    } catch {
      // sessionStorage may be unavailable; keep in-memory cart only.
    }
  }
}
