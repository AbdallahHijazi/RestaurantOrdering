import { Component, computed, inject, input, output } from '@angular/core';
import { LocaleService } from '../../../core/localization/locale';
import { IconButton } from '../icon-button/icon-button';

/**
 * THE load-failure / retry pattern for every page: a centered card with an alert icon, title,
 * helper text and one retry button. Pages only supply text and handle (retry); layout, spacing,
 * icon and button style live here so all failure states look identical.
 *
 * `compact` is the same pattern, scaled down for use inside a card/widget (e.g. dashboard panels).
 */
@Component({
  imports: [IconButton],
  selector: 'app-error-state',
  templateUrl: './error-state.html',
  styleUrl: './error-state.scss',
  host: { '[class.app-error-state--compact]': 'compact()' },
})
export class ErrorState {
  private readonly localeService = inject(LocaleService);

  readonly title = input<string | null>(null);
  readonly message = input<string | null>(null);
  readonly retryLabel = input<string | null>(null);
  /** Optional data-testid for the retry button (existing page tests target these). */
  readonly retryTestId = input<string | null>(null);
  readonly showRetry = input(true);
  readonly retrying = input(false);
  readonly compact = input(false);
  /** @deprecated No longer needed: the component injects LocaleService itself. */
  readonly locale = input<LocaleService | null>(null);

  readonly retry = output<void>();

  protected readonly resolvedTitle = computed(
    () => this.title() ?? this.localeService.uiText('errorLoadTitle'),
  );
  protected readonly resolvedMessage = computed(() => {
    const message = this.message();
    if (message !== null) {
      return message;
    }
    return this.compact() ? null : this.localeService.uiText('errorLoadDescription');
  });
  protected readonly resolvedRetryLabel = computed(
    () => this.retryLabel() ?? this.localeService.uiText('errorRetry'),
  );
}
