/**
 * Customer phone validation for checkout. Mirrors the backend rule
 * (`CustomerPhoneValidation` in the API) so the browser and the server agree:
 *  - optional leading '+' (or the international "00" prefix),
 *  - separators allowed: space, '-', '.', '(' and ')',
 *  - Latin or Arabic-Indic digits,
 *  - 7 to 15 digits (E.164 maximum), at most 20 characters in total.
 */
export const CUSTOMER_PHONE_MIN_DIGITS = 7;
export const CUSTOMER_PHONE_MAX_DIGITS = 15;
export const CUSTOMER_PHONE_MAX_LENGTH = 20;

const ALLOWED_CHARACTERS = /^\+?[0-9٠-٩۰-۹\s().-]+$/;

function toAsciiDigit(char: string): string {
  const code = char.charCodeAt(0);
  if (code >= 0x0660 && code <= 0x0669) {
    return String(code - 0x0660);
  }
  if (code >= 0x06f0 && code <= 0x06f9) {
    return String(code - 0x06f0);
  }
  return char;
}

export function isValidCustomerPhone(value: string | null | undefined): boolean {
  const phone = value?.trim() ?? '';

  if (!phone || phone.length > CUSTOMER_PHONE_MAX_LENGTH || !ALLOWED_CHARACTERS.test(phone)) {
    return false;
  }

  let digits = Array.from(phone)
    .filter((char) => /[0-9٠-٩۰-۹]/.test(char))
    .map(toAsciiDigit);

  // A leading "00" is the international call prefix, not part of the subscriber number.
  if (!phone.startsWith('+') && digits[0] === '0' && digits[1] === '0') {
    digits = digits.slice(2);
  }

  return digits.length >= CUSTOMER_PHONE_MIN_DIGITS && digits.length <= CUSTOMER_PHONE_MAX_DIGITS;
}
