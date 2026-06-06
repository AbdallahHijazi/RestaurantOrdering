import { Component, inject, input, output } from '@angular/core';
import { ApplicationRoles } from '../../../../../../core/auth/application-roles';
import { LocaleService } from '../../../../../../core/localization/locale';
import type { RestaurantStaffUser } from '../../../../data-access/restaurant-staff.models';

@Component({
  selector: 'app-staff-management-roster',
  templateUrl: './staff-management-roster.html',
  styleUrl: './staff-management-roster.scss',
})
export class StaffManagementRoster {
  protected readonly locale = inject(LocaleService);

  readonly employees = input.required<RestaurantStaffUser[]>();
  readonly changeRole = output<RestaurantStaffUser>();

  protected roleLabel(role: string): string {
    if (role === ApplicationRoles.RestaurantManager) {
      return this.locale.uiText('staffRoleManager');
    }
    if (role === ApplicationRoles.KitchenManager) {
      return this.locale.uiText('staffRoleKitchen');
    }
    return role;
  }

  protected statusLabel(isActive: boolean): string {
    return isActive
      ? this.locale.uiText('staffStatusActive')
      : this.locale.uiText('staffStatusInactive');
  }

  protected displayName(member: RestaurantStaffUser): string {
    return member.fullName?.trim() || member.email;
  }

  protected avatarInitials(member: RestaurantStaffUser): string {
    const name = member.fullName?.trim();
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }

    const email = member.email.trim();
    if (email.length >= 2) {
      return email.slice(0, 2).toUpperCase();
    }

    return '?';
  }

  protected avatarVariant(member: RestaurantStaffUser): 'green' | 'terra' {
    return member.role === ApplicationRoles.KitchenManager ? 'terra' : 'green';
  }

  protected onChangeRole(member: RestaurantStaffUser): void {
    this.changeRole.emit(member);
  }
}
