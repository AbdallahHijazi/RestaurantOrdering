import { Component, input, output } from '@angular/core';
import { LocaleService } from '../../../core/localization/locale';

@Component({
  selector: 'app-error-state',
  templateUrl: './error-state.html',
  styleUrl: './error-state.scss',
})
export class ErrorState {
  readonly title = input<string | null>(null);
  readonly message = input<string | null>(null);
  readonly locale = input<LocaleService | null>(null);
  readonly showRetry = input(true);
  readonly retry = output<void>();

  protected resolveTitle(localeService: LocaleService | null, custom: string | null): string {
    return custom ?? localeService?.uiText('errorTitle') ?? 'Something went wrong';
  }

  protected resolveMessage(localeService: LocaleService | null, custom: string | null): string {
    return custom ?? localeService?.uiText('errorGeneric') ?? 'Please try again later.';
  }
}
