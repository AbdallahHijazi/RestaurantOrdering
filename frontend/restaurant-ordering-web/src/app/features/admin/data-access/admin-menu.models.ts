/** Backend contract: CategoryDto */
export interface AdminCategory {
  id: string;
  restaurantId: string;
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  displayOrder: number;
  isActive: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt?: string | null;
}

/** Backend contract: CreateCategoryRequest / UpdateCategoryRequest */
export interface SaveCategoryRequest {
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  displayOrder: number;
  isActive: boolean;
}

/** Backend contract: MenuItemDto */
export interface AdminMenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  imageFileId?: string | null;
  imageUrl?: string | null;
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  price: number;
  discountPrice?: number | null;
  displayOrder: number;
  isAvailable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

/** Backend contract: CreateMenuItemRequest / UpdateMenuItemRequest */
export interface SaveMenuItemRequest {
  categoryId: string;
  imageFileId?: string | null;
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  price: number;
  discountPrice?: number | null;
  displayOrder: number;
  isAvailable: boolean;
  isActive: boolean;
}

/** Backend contract: UploadedMediaFileResponse */
export interface UploadedMediaFile {
  id: string;
  restaurantId: string;
  fileName: string;
  fileUrl: string;
  contentType: string;
  fileSizeBytes: number;
  createdAt: string;
}

export const ALL_MENU_ITEMS_FILTER = '__all__' as const;
export type MenuItemsFilter = typeof ALL_MENU_ITEMS_FILTER | string;
