import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { AppIcon } from '../icon/app-icon';
import type { IconName } from '../icon/icons';
import { AppTooltip } from '../tooltip/tooltip';

export type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type IconButtonSize = 'sm' | 'md' | 'lg';

/**
 * Shared icon-only action button: `<button appIconButton icon="edit" [label]="ui.edit" (click)="…">`.
 * - `label` is REQUIRED: it becomes the localized `aria-label` and the desktop tooltip (`title`).
 * - `showLabel` keeps the text visible next to the icon for ambiguous / high-impact actions.
 * - `tooltip` replaces the browser's native `title` bubble with the shared styled tooltip.
 * - `loading` swaps the icon for a spinner and marks the control busy.
 * Disabled / focus / hover styles come from the shared `.button-*` classes (see app-buttons.scss).
 */
@Component({
  selector: 'button[appIconButton]',
  imports: [AppIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [AppTooltip],
  host: {
    '[class]': 'hostClass()',
    '[attr.aria-label]': 'label()',
    '[attr.title]': 'tooltip() ? null : label()',
    '[attr.aria-busy]': 'loading() ? "true" : null',
    '[attr.type]': 'type()',
  },
  template: `
    @if (loading()) {
      <span class="app-icon-btn__spinner" aria-hidden="true"></span>
    } @else {
      <app-icon [name]="icon()" />
    }
    @if (showLabel()) {
      <span class="app-icon-btn__text">{{ label() }}</span>
    }
  `,
})
export class IconButton {
  readonly icon = input.required<IconName>();
  readonly label = input.required<string>();
  readonly variant = input<IconButtonVariant>('secondary');
  readonly size = input<IconButtonSize>('md');
  readonly loading = input(false);
  readonly showLabel = input(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  /** Show the label through the shared styled tooltip instead of the native browser one. */
  readonly tooltip = input(false);

  private readonly tooltipDirective = inject(AppTooltip, { self: true });

  constructor() {
    effect(() => this.tooltipDirective.tooltipOverride.set(this.tooltip() ? this.label() : ''));
  }

  protected readonly hostClass = computed(
    () =>
      `app-icon-btn app-icon-btn--${this.size()} button-${this.variant()}` +
      (this.showLabel() ? ' app-icon-btn--with-label' : ''),
  );
}
