import { Component, inject } from '@angular/core';
import { LocaleService, type AdminUiLocale } from '../../../core/localization/locale';

@Component({
  selector: 'app-language-switcher',
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.scss',
})
export class LanguageSwitcher {
  protected readonly localeService = inject(LocaleService);

  protected setLocale(locale: AdminUiLocale): void {
    this.localeService.setLocale(locale);
  }
}
