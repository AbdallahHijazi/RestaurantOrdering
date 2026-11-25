import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICON_PATHS, type IconName } from './icons';

/** Decorative outline icon (always aria-hidden); the owning control carries the accessible name. */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="app-icon__svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @for (d of paths(); track d) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      inline-size: var(--icon-size-md);
      block-size: var(--icon-size-md);
      flex: 0 0 auto;
    }
    .app-icon__svg {
      inline-size: 100%;
      block-size: 100%;
      stroke-width: var(--icon-stroke);
    }
  `,
})
export class AppIcon {
  readonly name = input.required<IconName>();

  protected readonly paths = computed<readonly string[]>(() => ICON_PATHS[this.name()]);
}
