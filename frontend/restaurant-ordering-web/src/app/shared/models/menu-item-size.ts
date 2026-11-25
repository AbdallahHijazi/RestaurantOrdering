export type MenuDiscountType = 1 | 2 | 3;
export type SizeDiscountMode = 0 | 1 | 2;

export interface MenuDiscount {
  type: MenuDiscountType;
  value: number;
}

export interface MenuPrice {
  basePrice: number;
  finalPrice: number;
  discountAmount: number;
}

export interface MenuItemSize {
  discount?: MenuDiscount | null;
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  displayOrder: number;
}
