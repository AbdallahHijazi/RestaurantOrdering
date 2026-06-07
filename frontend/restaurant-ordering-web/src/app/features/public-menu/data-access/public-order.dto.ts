import type { PublicOrderType } from '../models/public-menu.models';

/** Backend: CreatePublicOrderRequest */
export interface CreatePublicOrderApiRequest {
  guestName: string;
  guestPhone: string;
  orderType: PublicOrderType;
  tableToken?: string | null;
  deliveryAddress?: string | null;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  notes?: string | null;
  items: CreatePublicOrderItemApiRequest[];
}

/** Backend: CreatePublicOrderItemRequest */
export interface CreatePublicOrderItemApiRequest {
  menuItemId: string;
  quantity: number;
  notes?: string | null;
}

/** Backend: PublicOrderConfirmationDto */
export interface PublicOrderConfirmationApiDto {
  orderId: string;
  orderNumber: string;
  orderType: PublicOrderType;
  orderStatus: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
  currencyCode: string;
  createdAt: string;
  items: PublicOrderConfirmationItemApiDto[];
}

/** Backend: PublicOrderConfirmationItemDto */
export interface PublicOrderConfirmationItemApiDto {
  menuItemId?: string | null;
  itemNameAr: string;
  itemNameEn?: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  notes?: string | null;
}
