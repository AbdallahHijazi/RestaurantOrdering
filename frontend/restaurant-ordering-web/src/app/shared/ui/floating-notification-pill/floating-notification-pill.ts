import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { IconButton } from '../icon-button/icon-button';

export type FloatingNotificationTone = 'success' | 'error' | 'warning';

@Component({
  imports: [IconButton],
  selector: 'app-floating-notification-pill',
  templateUrl: './floating-notification-pill.html',
  styleUrl: './floating-notification-pill.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingNotificationPill {
  readonly message = input.required<string>();
  readonly closeLabel = input.required<string>();
  readonly tone = input<FloatingNotificationTone>('success');
  readonly dismissed = output<void>();
  /** True during the last moments of the toast's life: drives the exit fade (state, so a new message restarts it). */
  protected readonly leaving = signal(false);

  constructor() {
    effect((onCleanup) => {
      const message = this.message();

      if (!message) {
        return;
      }

      this.leaving.set(false);
      const leaveTimer = window.setTimeout(() => this.leaving.set(true), 1800);
      const timer = window.setTimeout(() => {
        this.dismissed.emit();
      }, 2000);

      onCleanup(() => {
        window.clearTimeout(leaveTimer);
        window.clearTimeout(timer);
      });
    });
  }
}