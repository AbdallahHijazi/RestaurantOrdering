import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApplicationRoles } from '../../../../core/auth/application-roles';
import { AuthService } from '../../../../core/auth/auth.service';
import { LocaleService } from '../../../../core/localization/locale';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  protected readonly localeService = inject(LocaleService);
  protected readonly authService = inject(AuthService);

  protected readonly roleLabel = computed(() => {
    const role = this.authService.currentRole();
    if (role === ApplicationRoles.RestaurantOwner) {
      return this.localeService.uiText('adminRoleOwner');
    }
    if (role === ApplicationRoles.RestaurantManager) {
      return this.localeService.uiText('adminRoleManager');
    }
    return role ?? '—';
  });
}
