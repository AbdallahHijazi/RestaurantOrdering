export interface PublicCartLineItem {
  menuItemId: string;
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
  return pickResolved(
    contentLocale,
    line.name,
    { ar: line.nameAr, en: line.nameEn },
    line.nameAr,
  );
}
