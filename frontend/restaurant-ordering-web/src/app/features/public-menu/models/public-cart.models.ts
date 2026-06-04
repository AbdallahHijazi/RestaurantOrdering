export interface PublicCartLineItem {
  menuItemId: string;
  nameAr: string;
  nameEn?: string | null;
  imageUrl?: string | null;
  price: number;
  discountPrice?: number | null;
  quantity: number;
  notes?: string | null;
}

export interface PublicCartSnapshot {
  items: PublicCartLineItem[];
}
