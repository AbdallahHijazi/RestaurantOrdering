import { Component, input } from '@angular/core';
import { LocaleService } from '../../../core/localization/locale';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  readonly title = input<string>('—');
  readonly message = input<string | null>(null);
  readonly locale = input<LocaleService | null>(null);
}
