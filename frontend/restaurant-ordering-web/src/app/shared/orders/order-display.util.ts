/** Visibility rules for optional order detail rows. */

export function shouldShowFinancialAmount(
  value: number | null | undefined,
): boolean {
  return value != null && value > 0;
}

export function hasOrderText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function hasItemNotes(value: string | null | undefined): boolean {
  return hasOrderText(value);
}

export function orderItemDisplayName(item: {
  displayedItemName?: string | null;
  itemNameAr: string;
  itemNameEn?: string | null;
}): string {
  const displayed = item.displayedItemName?.trim();
  if (displayed) {
    return displayed;
  }

  const ar = item.itemNameAr?.trim();
  if (ar) {
    return ar;
  }

  const en = item.itemNameEn?.trim();
  if (en) {
    return en;
  }

  return '—';
}
