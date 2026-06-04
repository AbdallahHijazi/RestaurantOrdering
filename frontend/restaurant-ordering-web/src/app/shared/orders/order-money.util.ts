/** Latin-digit money formatting (locale-independent UI digits). */

const FALLBACK_AMOUNT_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatOrderAmount(amount: number): string {
  return FALLBACK_AMOUNT_FORMATTER.format(amount);
}

function isValidCurrencyCode(currencyCode: string): boolean {
  const code = currencyCode?.trim().toUpperCase();
  if (!code || !/^[A-Z]{3}$/.test(code)) {
    return false;
  }

  try {
    new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats money with narrow currency symbol when supported (e.g. USD → $0.10).
 * Falls back to `USD 0.10` for invalid codes.
 */
export function formatOrderCurrency(amount: number, currencyCode: string): string {
  const code = (currencyCode?.trim() || 'USD').toUpperCase();

  if (!isValidCurrencyCode(code)) {
    return `${code} ${formatOrderAmount(amount)}`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
