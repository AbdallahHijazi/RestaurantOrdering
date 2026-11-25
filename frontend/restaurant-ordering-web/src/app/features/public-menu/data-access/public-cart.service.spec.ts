import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PublicCartService } from './public-cart.service';
import type { PublicMenuItem } from '../models/public-menu.models';

const sampleItem: PublicMenuItem = {
  id: 'item-a',
  categoryId: 'cat-1',
  nameAr: 'طبق',
  nameEn: 'Dish',
  price: 25,
  discountPrice: 20,
  isAvailable: true,
};

const unavailableItem: PublicMenuItem = {
  ...sampleItem,
  id: 'item-b',
  isAvailable: false,
};

describe('PublicCartService', () => {
  let service: PublicCartService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(PublicCartService);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('stores resolved name when adding item', () => {
    service.initForRestaurant('cafe-a');
    expect(
      service.addMenuItem({
        ...sampleItem,
        name: 'Plat du jour',
        nameAr: 'طبق',
        nameEn: 'Dish',
        resolvedLocale: 'fr',
      }),
    ).toBe(true);
    expect(service.cartItems()[0]?.name).toBe('Plat du jour');
    expect(service.cartItems()[0]?.resolvedLocale).toBe('fr');
  });

  it('adds an item', () => {
    service.initForRestaurant('cafe-a');
    expect(service.addMenuItem(sampleItem)).toBe(true);
    expect(service.itemCount()).toBe(1);
  });

  it('aggregates quantity when adding the same item', () => {
    service.initForRestaurant('cafe-a');
    service.addMenuItem(sampleItem);
    service.addMenuItem(sampleItem);
    expect(service.cartItems()).toHaveLength(1);
    expect(service.quantityFor('item-a')).toBe(2);
  });

  it('keeps sizes separate, merges the same size, and restores size lines from storage', () => {
    service.initForRestaurant('cafe-a');
    const sized = {
      ...sampleItem, usesSizes: true,
      sizes: [
        { id: 'small', name: 'Small', price: 10, isAvailable: true, displayOrder: 1 },
        { id: 'large', name: 'Large', price: 30, isAvailable: true, displayOrder: 2 },
        { id: 'family', name: 'Family', price: 40, isAvailable: false, displayOrder: 3 },
      ],
    };
    expect(service.addMenuItem(sized)).toBe(false);
    expect(service.addMenuItem(sized, 'missing')).toBe(false);
    expect(service.addMenuItem(sized, 'family')).toBe(false);
    expect(service.addMenuItem(sized, 'small')).toBe(true);
    expect(service.addMenuItem(sized, 'large', 2)).toBe(true);
    expect(service.addMenuItem(sized, 'small', 3)).toBe(true);

    service.initForRestaurant('cafe-b');
    service.initForRestaurant('cafe-a');
    expect(service.cartItems()).toMatchObject([
      { menuItemSizeId: 'small', sizeName: 'Small', quantity: 4, price: 10, discountPrice: null },
      { menuItemSizeId: 'large', sizeName: 'Large', quantity: 2, price: 30, discountPrice: null },
    ]);
    service.setStoredLineQuantity(service.cartItems()[1]!, 1);
    expect(service.quantityFor(sized.id, 'large')).toBe(1);
    expect(service.quantityFor(sized.id, 'small')).toBe(4);
    service.removeItem('item-a:large');
    expect(service.cartItems()).toHaveLength(1);
  });

  it('does not allow quantity above 99', () => {
    service.initForRestaurant('cafe-a');
    service.setQuantity(sampleItem, 99);
    service.addMenuItem(sampleItem);
    expect(service.quantityFor('item-a')).toBe(99);
  });

  it('removes item when quantity decreases to zero', () => {
    service.initForRestaurant('cafe-a');
    service.setQuantity(sampleItem, 1);
    service.setQuantity(sampleItem, 0);
    expect(service.isEmpty()).toBe(true);
  });

  it('removes item explicitly', () => {
    service.initForRestaurant('cafe-a');
    service.addMenuItem(sampleItem);
    service.removeItem('item-a');
    expect(service.isEmpty()).toBe(true);
  });

  it('clears the cart', () => {
    service.initForRestaurant('cafe-a');
    service.addMenuItem(sampleItem);
    service.clearCart();
    expect(service.isEmpty()).toBe(true);
  });

  it('restores cart from sessionStorage', () => {
    service.initForRestaurant('cafe-a');
    service.addMenuItem(sampleItem);
    service.updateItemNotes('item-a', 'no onion');

    const fresh = TestBed.inject(PublicCartService);
    fresh.initForRestaurant('cafe-a');
    expect(fresh.quantityFor('item-a')).toBe(1);
    expect(fresh.cartItems()[0]?.notes).toBe('no onion');
  });

  it('clears malformed sessionStorage', () => {
    sessionStorage.setItem('restaurant-ordering.cart.cafe-a', '{not-json');
    service.initForRestaurant('cafe-a');
    expect(service.isEmpty()).toBe(true);
    expect(sessionStorage.getItem('restaurant-ordering.cart.cafe-a')).toBeNull();
  });

  it('isolates carts per slug', () => {
    service.initForRestaurant('cafe-a');
    service.addMenuItem(sampleItem);

    service.initForRestaurant('cafe-b');
    expect(service.isEmpty()).toBe(true);

    service.initForRestaurant('cafe-a');
    expect(service.quantityFor('item-a')).toBe(1);
  });

  it('does not add unavailable items', () => {
    service.initForRestaurant('cafe-a');
    expect(service.addMenuItem(unavailableItem)).toBe(false);
    expect(service.isEmpty()).toBe(true);
  });
});
