import { Injectable } from '@angular/core';

export const DEFAULT_RESTAURANT_ACCENT = '#B8663F';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

@Injectable({
  providedIn: 'root',
})
export class RestaurantThemeService {
  private appliedAccent = DEFAULT_RESTAURANT_ACCENT;

  constructor() {
    this.applyAccent(DEFAULT_RESTAURANT_ACCENT);
  }

  sanitizeAccentColor(value: string | null | undefined): string {
    const trimmed = (value ?? '').trim();
    return HEX_COLOR_PATTERN.test(trimmed) ? trimmed : DEFAULT_RESTAURANT_ACCENT;
  }

  applyAccent(value: string | null | undefined): string {
    const sanitized = this.sanitizeAccentColor(value);
    this.appliedAccent = sanitized;
    const root = document.documentElement.style;
    root.setProperty('--restaurant-accent', sanitized);
    root.setProperty(
      '--restaurant-accent-strong',
      `color-mix(in srgb, ${sanitized} 82%, black)`,
    );
    root.setProperty(
      '--restaurant-accent-soft',
      `color-mix(in srgb, ${sanitized} 18%, white)`,
    );
    return sanitized;
  }

  getAppliedAccent(): string {
    return this.appliedAccent;
  }
}

export { HEX_COLOR_PATTERN as RESTAURANT_ACCENT_HEX_PATTERN };

/** @deprecated Use RestaurantThemeService */
export { RestaurantThemeService as RestaurantTheme };
