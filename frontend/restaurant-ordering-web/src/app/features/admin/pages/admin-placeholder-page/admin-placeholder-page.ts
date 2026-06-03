import { Component, inject } from '@angular/core';
import { LocaleService } from '../../../../core/localization/locale';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-admin-placeholder-page',
  imports: [],
  templateUrl: './admin-placeholder-page.html',
  styleUrl: './admin-placeholder-page.scss',
})
export class AdminPlaceholderPage {
  protected readonly locale = inject(LocaleService);
  protected readonly auth = inject(AuthService);

  protected logout(): void {
    this.auth.logout();
  }
}
