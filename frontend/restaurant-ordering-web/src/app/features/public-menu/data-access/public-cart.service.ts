import { Injectable, computed, signal } from '@angular/core';
import type { PublicCartLineItem, PublicCartSnapshot } from '../models/public-cart.models';
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
    typeof line.nameAr === 'string' &&
    typeof line.price === 'number' &&
    Number.isFinite(line.price) &&
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

  quantityFor(menuItemId: string): number {
    return this.items().find((line) => line.menuItemId === menuItemId)?.quantity ?? 0;
  }

  addMenuItem(item: PublicMenuItem): boolean {
    if (!item.isAvailable) {
      return false;
    }

    const existing = this.items().find((line) => line.menuItemId === item.id);
    if (existing) {
      return this.setQuantity(item, Math.min(PUBLIC_CART_MAX_QUANTITY, existing.quantity + 1));
    }

    this.items.update((lines) => [
      ...lines,
      {
        menuItemId: item.id,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        imageUrl: item.imageUrl,
        price: item.price,
        discountPrice: item.discountPrice,
        quantity: PUBLIC_CART_MIN_QUANTITY,
        notes: null,
      },
    ]);
    this.persist();
    return true;
  }

  setQuantity(item: PublicMenuItem, quantity: number): boolean {
    if (!item.isAvailable && quantity > 0) {
      return false;
    }

    if (quantity <= 0) {
      this.removeItem(item.id);
      return true;
    }

    const clamped = Math.min(PUBLIC_CART_MAX_QUANTITY, Math.max(PUBLIC_CART_MIN_QUANTITY, quantity));
    const existingIndex = this.items().findIndex((line) => line.menuItemId === item.id);

    if (existingIndex === -1) {
      this.items.update((lines) => [
        ...lines,
        {
          menuItemId: item.id,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          imageUrl: item.imageUrl,
          price: item.price,
          discountPrice: item.discountPrice,
          quantity: clamped,
          notes: null,
        },
      ]);
    } else {
      this.items.update((lines) =>
        lines.map((line, index) =>
          index === existingIndex
            ? {
                ...line,
                nameAr: item.nameAr,
                nameEn: item.nameEn,
                imageUrl: item.imageUrl,
                price: item.price,
                discountPrice: item.discountPrice,
                quantity: clamped,
              }
            : line,
        ),
      );
    }

    this.persist();
    return true;
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

  removeItem(menuItemId: string): void {
    const next = this.items().filter((line) => line.menuItemId !== menuItemId);
    if (next.length === this.items().length) {
      return;
    }

    this.items.set(next);
    this.persist();
  }

  updateItemNotes(menuItemId: string, notes: string | null): void {
    const trimmed = notes?.trim() ? notes.trim() : null;
    this.items.update((lines) =>
      lines.map((line) =>
        line.menuItemId === menuItemId ? { ...line, notes: trimmed } : line,
      ),
    );
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
