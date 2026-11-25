export interface PublicCartLineItem {
  menuItemId: string;
  menuItemSizeId?: string | null;
  sizeName?: string | null;
  name?: string | null;
  nameAr: string;
  nameEn?: string | null;
  resolvedLocale?: string | null;
  imageUrl?: string | null;
  price: number;
  discountPrice?: number | null;
  quantity: number;
  notes?: string | null;
}

export interface PublicCartSnapshot {
  items: PublicCartLineItem[];
}

export function cartLineKey(menuItemId: string, menuItemSizeId?: string | null): string {
  return menuItemSizeId ? `${menuItemId}:${menuItemSizeId}` : menuItemId;
}

export function cartLineDisplayName(
  line: PublicCartLineItem,
  pickResolved: (
    locale: string,
    resolved: string | null | undefined,
    legacy: { ar: string; en?: string | null },
    fallback: string,
  ) => string,
  contentLocale: string,
): string {
  const name = pickResolved(
    contentLocale,
    line.name,
    { ar: line.nameAr, en: line.nameEn },
    line.nameAr,
  );
  return line.sizeName ? `${name} — ${line.sizeName}` : name;
}
