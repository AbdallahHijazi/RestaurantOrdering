import { API_BASE_URL } from './api-config';
import { resolveApiAssetUrl } from './resolve-api-asset-url';

describe('resolveApiAssetUrl', () => {
  it('returns null for empty values', () => {
    expect(resolveApiAssetUrl(null)).toBeNull();
    expect(resolveApiAssetUrl('')).toBeNull();
  });

  it('keeps blob URLs unchanged', () => {
    const blobUrl = 'blob:http://localhost/preview';
    expect(resolveApiAssetUrl(blobUrl)).toBe(blobUrl);
  });

  it('keeps safe absolute URLs unchanged', () => {
    const url = 'https://cdn.example.com/menu/item.png';
    expect(resolveApiAssetUrl(url)).toBe(url);
  });

  it('prefixes relative API paths with API origin', () => {
    expect(resolveApiAssetUrl('/uploads/test/item.png')).toBe(
      `${API_BASE_URL}/uploads/test/item.png`,
    );
  });

  it('rejects unsafe protocols', () => {
    expect(resolveApiAssetUrl('javascript:alert(1)')).toBeNull();
  });
});
