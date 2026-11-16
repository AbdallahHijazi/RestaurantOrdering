import { isValidCustomerPhone } from './customer-phone.util';

describe('isValidCustomerPhone (mirrors the backend rule)', () => {
  it.each([
    '+962791234567',
    '+962 79 123 4567',
    '0791234567',
    '079-123-4567',
    '(555) 010-1010',
    '555.010.1010',
    '00962791234567',
    '1234567',
    '٠٧٩١٢٣٤٥٦٧',
    '  0791234567  ',
  ])('accepts %s', (phone) => {
    expect(isValidCustomerPhone(phone)).toBe(true);
  });

  it.each([
    'abc',
    'phone',
    '',
    '   ',
    '123',
    '123456',
    '1234567890123456',
    '++962791234567',
    '96279+1234567',
    '0791234567abc',
    '079<script>',
    '123456789012345678901',
  ])('rejects "%s"', (phone) => {
    expect(isValidCustomerPhone(phone)).toBe(false);
  });

  it('rejects null and undefined', () => {
    expect(isValidCustomerPhone(null)).toBe(false);
    expect(isValidCustomerPhone(undefined)).toBe(false);
  });
});
