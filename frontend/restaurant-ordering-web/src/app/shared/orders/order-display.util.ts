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
