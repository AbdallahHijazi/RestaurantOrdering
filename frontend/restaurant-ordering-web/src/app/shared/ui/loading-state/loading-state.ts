import { Component, input } from '@angular/core';
import { LocaleService } from '../../../core/localization/locale';

@Component({
  selector: 'app-loading-state',
  templateUrl: './loading-state.html',
  styleUrl: './loading-state.scss',
})
export class LoadingState {
  readonly message = input<string | null>(null);
  readonly locale = input<LocaleService | null>(null);

  protected resolveMessage(localeService: LocaleService | null, custom: string | null): string {
    return custom ?? localeService?.uiText('loading') ?? 'Loading…';
  }
}
