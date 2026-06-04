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
