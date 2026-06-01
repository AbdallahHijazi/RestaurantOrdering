import { Injectable } from '@angular/core';

export const DEFAULT_RESTAURANT_ACCENT = '#B8663F';

export const RESTAURANT_THEME_DEFAULTS = {
  accent: DEFAULT_RESTAURANT_ACCENT,
  background: '#F6F0E7',
  surface: '#FFFDFC',
  alternateSurface: '#EEE3D6',
  text: '#2A211C',
  mutedText: '#796B61',
  border: '#E3D6C8',
  footer: '#2E2925',
  footerText: '#F7F1E8',
} as const;

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

@Injectable({
  providedIn: 'root',
})
export class RestaurantThemeService {
  private appliedAccent = DEFAULT_RESTAURANT_ACCENT;

  constructor() {
    this.applyAccent(DEFAULT_RESTAURANT_ACCENT);
    this.applyStaticThemeVariables();
  }

  sanitizeAccentColor(value: string | null | undefined): string {
    const trimmed = (value ?? '').trim();
    return HEX_COLOR_PATTERN.test(trimmed) ? trimmed : DEFAULT_RESTAURANT_ACCENT;
  }

  applyAccent(value: string | null | undefined): string {
    const sanitized = this.sanitizeAccentColor(value);
    this.appliedAccent = sanitized;
    document.documentElement.style.setProperty('--restaurant-accent', sanitized);
    return sanitized;
  }

  getAppliedAccent(): string {
    return this.appliedAccent;
  }

  private applyStaticThemeVariables(): void {
    const root = document.documentElement.style;
    root.setProperty('--restaurant-background', RESTAURANT_THEME_DEFAULTS.background);
    root.setProperty('--restaurant-surface', RESTAURANT_THEME_DEFAULTS.surface);
    root.setProperty('--restaurant-alternate-surface', RESTAURANT_THEME_DEFAULTS.alternateSurface);
    root.setProperty('--restaurant-text', RESTAURANT_THEME_DEFAULTS.text);
    root.setProperty('--restaurant-muted-text', RESTAURANT_THEME_DEFAULTS.mutedText);
    root.setProperty('--restaurant-border', RESTAURANT_THEME_DEFAULTS.border);
    root.setProperty('--restaurant-footer', RESTAURANT_THEME_DEFAULTS.footer);
    root.setProperty('--restaurant-footer-text', RESTAURANT_THEME_DEFAULTS.footerText);
  }
}

export { HEX_COLOR_PATTERN as RESTAURANT_ACCENT_HEX_PATTERN };

/** @deprecated Use RestaurantThemeService */
export { RestaurantThemeService as RestaurantTheme };
