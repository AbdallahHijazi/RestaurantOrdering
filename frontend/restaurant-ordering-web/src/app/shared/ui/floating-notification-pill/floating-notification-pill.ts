import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
} from '@angular/core';

export type FloatingNotificationTone = 'success' | 'error' | 'warning';

@Component({
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

  constructor() {
    effect((onCleanup) => {
      const message = this.message();

      if (!message) {
        return;
      }

      const timer = window.setTimeout(() => {
        this.dismissed.emit();
      }, 2000);

      onCleanup(() => {
        window.clearTimeout(timer);
      });
    });
  }
}