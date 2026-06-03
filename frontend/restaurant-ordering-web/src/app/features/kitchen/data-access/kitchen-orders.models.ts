export enum OrderStatus {
  New = 1,
  Preparing = 2,
  Ready = 3,
  Completed = 4,
  Cancelled = 5,
}

export enum OrderType {
  Pickup = 1,
  Delivery = 2,
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  restaurantId: string;
  customerId: string | null;
  guestName: string | null;
  guestPhone: string | null;
  orderType: OrderType;
  orderStatus: OrderStatus;
  totalAmount: number;
  currencyCode: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface OrderDetailsItem {
  id: string;
  menuItemId: string | null;
  itemNameAr: string;
  itemNameEn: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  notes: string | null;
}

export interface OrderDetails extends OrderSummary {
  deliveryAddress: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  deliveryFee: number;
  notes: string | null;
  items: OrderDetailsItem[];
}

export interface GetOrdersResult {
  items: OrderSummary[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface UpdateOrderStatusRequest {
  newStatus: OrderStatus;
}

export type KitchenBoardColumnKey = 'new' | 'preparing' | 'ready';

export const KITCHEN_BOARD_STATUSES: readonly {
  key: KitchenBoardColumnKey;
  status: OrderStatus;
}[] = [
  { key: 'new', status: OrderStatus.New },
  { key: 'preparing', status: OrderStatus.Preparing },
  { key: 'ready', status: OrderStatus.Ready },
] as const;

export const KITCHEN_ORDERS_PAGE_SIZE = 20;
