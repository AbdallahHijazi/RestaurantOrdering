import { Injectable } from '@angular/core';

/**
 * Last-resort fallback ONLY (used when the stylesheet is not available, e.g. unit tests / SSR).
 * The single source of truth for the palette is `src/styles.scss` (`--restaurant-olive`, …).
 * Change colours there; do not rely on this constant.
 */
export const DEFAULT_RESTAURANT_ACCENT = '#9c3d2e';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/** Reads the central accent from the live stylesheet (resolved custom property). */
function readCentralAccent(): string {
  try {
    if (typeof document === 'undefined') {
      return DEFAULT_RESTAURANT_ACCENT;
    }
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--restaurant-olive')
      .trim();
    return HEX_COLOR_PATTERN.test(value) ? value : DEFAULT_RESTAURANT_ACCENT;
  } catch {
    return DEFAULT_RESTAURANT_ACCENT;
  }
}

/**
 * Validates restaurant accent values coming from the API.
 *
 * Theme variables (`--restaurant-accent`, `-strong`, `-soft`, `-border`, …) are defined centrally in
 * `src/styles.scss` and derived from the three palette colours. This service deliberately does NOT
 * write them to the document: a per-restaurant accent is applied locally by the public menu page
 * (see `[style.--restaurant-accent]` in menu-page.html), and the admin UI always follows the palette.
 */
@Injectable({
  providedIn: 'root',
})
export class RestaurantThemeService {
  sanitizeAccentColor(value: string | null | undefined): string {
    const trimmed = (value ?? '').trim();
    return HEX_COLOR_PATTERN.test(trimmed) ? trimmed : readCentralAccent();
  }

  /** Validates the backend accent; the UI itself keeps following the central palette. */
  applyAccent(value: string | null | undefined): string {
    return this.sanitizeAccentColor(value);
  }

  getAppliedAccent(): string {
    return readCentralAccent();
  }
}

export { HEX_COLOR_PATTERN as RESTAURANT_ACCENT_HEX_PATTERN };

/** @deprecated Use RestaurantThemeService */
export { RestaurantThemeService as RestaurantTheme };
