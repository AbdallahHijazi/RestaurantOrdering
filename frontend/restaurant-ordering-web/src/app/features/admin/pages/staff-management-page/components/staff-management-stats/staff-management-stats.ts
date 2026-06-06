import { Component, inject, input } from '@angular/core';
import { LocaleService } from '../../../../../../core/localization/locale';

@Component({
  selector: 'app-staff-management-stats',
  templateUrl: './staff-management-stats.html',
  styleUrl: './staff-management-stats.scss',
})
export class StaffManagementStats {
  protected readonly locale = inject(LocaleService);

  readonly total = input.required<number>();
  readonly active = input.required<number>();
  readonly roles = input.required<number>();
  readonly loading = input(false);
}
