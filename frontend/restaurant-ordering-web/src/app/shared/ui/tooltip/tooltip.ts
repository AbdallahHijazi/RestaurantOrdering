import {
  ApplicationRef,
  ComponentRef,
  Directive,
  ElementRef,
  EnvironmentInjector,
  Injectable,
  computed,
  createComponent,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { TooltipHost } from './tooltip-host';

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 10;

/** Owns the one shared bubble and positions it next to the active anchor. */
@Injectable({ providedIn: 'root' })
export class TooltipService {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);
  private host: ComponentRef<TooltipHost> | null = null;
  private owner: unknown = null;
  private anchor: HTMLElement | null = null;
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly dismiss = () => this.hide(this.owner);
  private readonly onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.hide(this.owner);
    }
  };

  show(owner: unknown, anchor: HTMLElement, text: string, autoHideMs = 0): void {
    const host = this.ensureHost();
    this.clearTimer();
    if (this.owner && this.owner !== owner) {
      this.anchor?.removeAttribute('aria-describedby');
    }
    this.owner = owner;
    this.anchor = anchor;
    host.instance.text.set(text);
    host.changeDetectorRef.detectChanges();
    this.position();
    host.instance.visible.set(true);
    host.changeDetectorRef.detectChanges();
    anchor.setAttribute('aria-describedby', host.instance.id);
    window.addEventListener('scroll', this.dismiss, { capture: true, passive: true });
    window.addEventListener('resize', this.dismiss, { passive: true });
    document.addEventListener('keydown', this.onKey);
    if (autoHideMs > 0) {
      this.dismissTimer = setTimeout(() => this.hide(owner), autoHideMs);
    }
  }

  /** Re-renders the text of the currently shown bubble (e.g. the explanation changed while open). */
  refresh(owner: unknown, text: string): void {
    if (this.owner !== owner || !this.host || !this.anchor) {
      return;
    }
    this.host.instance.text.set(text);
    this.host.changeDetectorRef.detectChanges();
    this.position();
  }

  isShownFor(owner: unknown): boolean {
    return this.owner === owner && !!this.host?.instance.visible();
  }

  hide(owner: unknown): void {
    if (!this.host || !owner || this.owner !== owner) {
      return;
    }
    this.clearTimer();
    this.anchor?.removeAttribute('aria-describedby');
    this.host.instance.visible.set(false);
    this.host.changeDetectorRef.detectChanges();
    window.removeEventListener('scroll', this.dismiss, { capture: true });
    window.removeEventListener('resize', this.dismiss);
    document.removeEventListener('keydown', this.onKey);
    this.owner = null;
    this.anchor = null;
  }

  private clearTimer(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
  }

  private ensureHost(): ComponentRef<TooltipHost> {
    if (!this.host) {
      this.host = createComponent(TooltipHost, { environmentInjector: this.injector });
      this.appRef.attachView(this.host.hostView);
      document.body.appendChild(this.host.location.nativeElement);
    }
    return this.host;
  }

  private position(): void {
    const host = this.host;
    const anchor = this.anchor;
    if (!host || !anchor) {
      return;
    }

    const bubble = host.instance.bubble;
    const anchorRect = anchor.getBoundingClientRect();
    const width = bubble.offsetWidth;
    const height = bubble.offsetHeight;

    let placement: 'top' | 'bottom' = 'top';
    let top = anchorRect.top - height - ANCHOR_GAP;
    if (top < VIEWPORT_MARGIN) {
      placement = 'bottom';
      top = anchorRect.bottom + ANCHOR_GAP;
    }

    const rtl = getComputedStyle(bubble).direction === 'rtl';
    const center = anchorRect.left + anchorRect.width / 2;
    const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
    const left = Math.min(Math.max(center - width / 2, VIEWPORT_MARGIN), maxLeft);

    // `inset-inline-start` flips in RTL, so convert the physical position to the logical one.
    const inlineStart = rtl ? window.innerWidth - left - width : left;
    const arrow = rtl ? left + width - center : center - left;

    host.instance.placement.set(placement);
    bubble.style.insetInlineStart = `${Math.round(inlineStart)}px`;
    bubble.style.insetBlockStart = `${Math.round(top)}px`;
    bubble.style.setProperty('--app-tooltip-arrow-x', `${Math.round(arrow)}px`);
    host.changeDetectorRef.detectChanges();
  }
}

/**
 * `<span appTooltip="Explanation" tabindex="0">` (or any element / appIconButton).
 * Shows on mouse hover (short intent delay), keyboard focus and touch press; hides on leave, blur,
 * Escape, scroll or resize. Wrap *disabled* controls in a focusable element so they can still explain
 * themselves (disabled controls never receive hover/focus).
 */
@Directive({
  selector: '[appTooltip]',
  host: {
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'hide()',
    '(pointerdown)': 'onPointerDown($event)',
    '(focusin)': 'showNow()',
    '(focusout)': 'hide()',
  },
})
export class AppTooltip {
  readonly appTooltip = input('');
  /** Lets a host component (e.g. appIconButton) supply the text programmatically. */
  readonly tooltipOverride = signal('');

  private readonly service = inject(TooltipService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private hoverTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly text = computed(() => (this.appTooltip() || this.tooltipOverride()).trim());

  constructor() {
    effect(() => {
      const text = this.text();
      if (!this.service.isShownFor(this)) {
        return;
      }
      if (text) {
        this.service.refresh(this, text);
      } else {
        this.service.hide(this);
      }
    });
  }

  protected onPointerEnter(event: PointerEvent): void {
    // A disabled control defers to its focusable wrapper (which carries the real explanation).
    if (event.pointerType === 'touch' || !this.text() || this.host.matches(':disabled')) {
      return;
    }
    this.clearHover();
    this.hoverTimer = setTimeout(() => this.showNow(), 220);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.pointerType !== 'touch' || !this.text()) {
      return;
    }
    // An enabled button already acts on tap: only non-actionable anchors (wrappers) explain on touch.
    if (this.host.matches('button:not(:disabled), a[href]')) {
      return;
    }
    this.service.show(this, this.host, this.text(), 3000);
  }

  protected showNow(): void {
    this.clearHover();
    const text = this.text();
    if (text) {
      this.service.show(this, this.host, text);
    }
  }

  protected hide(): void {
    this.clearHover();
    this.service.hide(this);
  }

  private clearHover(): void {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
  }
}
