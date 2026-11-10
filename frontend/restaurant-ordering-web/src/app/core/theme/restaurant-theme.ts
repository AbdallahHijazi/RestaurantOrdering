import { Injectable } from '@angular/core';



export const DEFAULT_RESTAURANT_ACCENT = '#6e7b4e';



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

    // Three-color identity: backend accent is validated/stored but UI always uses Olive.

    this.appliedAccent = DEFAULT_RESTAURANT_ACCENT;

    const root = document.documentElement.style;

    root.setProperty('--restaurant-accent', DEFAULT_RESTAURANT_ACCENT);

    root.setProperty(

      '--restaurant-accent-strong',

      'color-mix(in srgb, var(--restaurant-olive) 86%, var(--restaurant-sage))',

    );

    root.setProperty(

      '--restaurant-accent-soft',

      'color-mix(in srgb, var(--restaurant-sage) 32%, transparent)',

    );

    root.setProperty(

      '--restaurant-accent-border',

      'color-mix(in srgb, var(--restaurant-olive) 42%, transparent)',

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


