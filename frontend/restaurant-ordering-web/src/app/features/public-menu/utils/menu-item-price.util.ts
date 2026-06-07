export function hasValidDiscount(
  originalPrice: number,
  discountPrice?: number | null,
): discountPrice is number {
  return (
    discountPrice != null &&
    discountPrice > 0 &&
    discountPrice < originalPrice
  );
}

export function effectiveUnitPrice(
  originalPrice: number,
  discountPrice?: number | null,
): number {
  return hasValidDiscount(originalPrice, discountPrice) ? discountPrice : originalPrice;
}
