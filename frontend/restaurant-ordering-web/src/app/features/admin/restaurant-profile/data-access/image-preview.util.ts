export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export type ImageValidationResult =
  | { valid: true; mimeType: (typeof ALLOWED_IMAGE_MIME_TYPES)[number] }
  | { valid: false; reason: 'type' | 'size' | 'empty' };

export function validateImageFile(file: File | null | undefined): ImageValidationResult {
  if (!file || file.size === 0) {
    return { valid: false, reason: 'empty' };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, reason: 'size' };
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    return { valid: false, reason: 'type' };
  }

  return { valid: true, mimeType: file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number] };
}

export function createImagePreviewUrl(file: File): string | null {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return null;
  }

  return URL.createObjectURL(file);
}

export function revokeImagePreviewUrl(url: string | null | undefined): void {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeSlugInput(value: string): string {
  return value.trim().toLowerCase();
}
