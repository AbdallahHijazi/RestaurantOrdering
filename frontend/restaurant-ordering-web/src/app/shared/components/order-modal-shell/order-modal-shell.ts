import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  PLATFORM_ID,
} from '@angular/core';
import { attachElementToBody } from '../../utils/overlay-body-portal';

@Component({
  selector: 'app-modal-shell, app-order-modal-shell',
  templateUrl: './order-modal-shell.html',
  styleUrl: './order-modal-shell.scss',
  host: {
    '[class.modal-shell-host--open]': 'open()',
  },
})
export class ModalShell {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private triggerElement: HTMLElement | null = null;
  private detachFromBody: (() => void) | null = null;

  readonly open = input(false);
  readonly title = input.required<string>();
  readonly closeLabel = input.required<string>();
  readonly titleId = input('order-modal-title');
  readonly testId = input<string | null>(null);
  readonly wide = input(false);
  readonly blockCloseWhileBusy = input(false);

  readonly closed = output<void>();

  constructor() {
    effect((onCleanup) => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      const isOpen = this.open();
      const host = this.elementRef.nativeElement;

      if (isOpen) {
        this.triggerElement = document.activeElement as HTMLElement | null;
        if (host.parentElement !== document.body) {
          this.detachFromBody?.();
          this.detachFromBody = attachElementToBody(host);
        }
        document.body.classList.add('order-modal-scroll-lock');
      } else {
        document.body.classList.remove('order-modal-scroll-lock');
        this.detachFromBody?.();
        this.detachFromBody = null;
        queueMicrotask(() => this.triggerElement?.focus?.());
      }

      onCleanup(() => {
        document.body.classList.remove('order-modal-scroll-lock');
        this.detachFromBody?.();
        this.detachFromBody = null;
      });
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open() && !this.blockCloseWhileBusy()) {
      this.closed.emit();
    }
  }

  protected requestClose(): void {
    if (!this.blockCloseWhileBusy()) {
      this.closed.emit();
    }
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.blockCloseWhileBusy()) {
      this.closed.emit();
    }
  }
}

/** @deprecated Import ModalShell instead. */
export { ModalShell as OrderModalShell };
