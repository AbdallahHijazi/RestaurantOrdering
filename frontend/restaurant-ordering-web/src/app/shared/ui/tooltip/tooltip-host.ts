import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  inject,
  signal,
} from '@angular/core';

export type TooltipPlacement = 'top' | 'bottom';

/**
 * The single, shared tooltip bubble. It lives on <body> (so no ancestor can clip it) and is moved to
 * whichever anchor is active by TooltipService. Styles are global (ViewEncapsulation.None) because
 * the element is rendered outside the owning component's DOM.
 */
@Component({
  selector: 'app-tooltip-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './tooltip.scss',
  template: `<div
    class="app-tooltip"
    role="tooltip"
    [id]="id"
    [class.is-visible]="visible()"
    [attr.data-placement]="placement()"
  >
    {{ text() }}
  </div>`,
})
export class TooltipHost {
  readonly id = 'app-tooltip-bubble';
  readonly text = signal('');
  readonly visible = signal(false);
  readonly placement = signal<TooltipPlacement>('top');

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  get bubble(): HTMLElement {
    return this.element.querySelector<HTMLElement>('.app-tooltip')!;
  }
}
