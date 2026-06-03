import { Component, inject } from '@angular/core';
import { LocaleService } from '../../../../core/localization/locale';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-kitchen-placeholder-page',
  imports: [],
  templateUrl: './kitchen-placeholder-page.html',
  styleUrl: './kitchen-placeholder-page.scss',
})
export class KitchenPlaceholderPage {
  protected readonly locale = inject(LocaleService);
  protected readonly auth = inject(AuthService);

  protected logout(): void {
    this.auth.logout();
  }
}
