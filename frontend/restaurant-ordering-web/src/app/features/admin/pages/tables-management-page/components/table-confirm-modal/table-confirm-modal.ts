import { Component, inject, input, output } from '@angular/core';
import { LocaleService, type UiTextKey } from '../../../../../../core/localization/locale';
import { StaffModalActions } from '../../../staff-management-page/components/staff-modal-actions/staff-modal-actions';

export type TableConfirmKind = 'deactivate' | 'activate' | 'regenerateToken';

@Component({
  selector: 'app-table-confirm-modal',
  imports: [StaffModalActions],
  templateUrl: './table-confirm-modal.html',
  styleUrl: './table-confirm-modal.scss',
})
export class TableConfirmModal {
  protected readonly locale = inject(LocaleService);

  readonly kind = input.required<TableConfirmKind>();
  readonly tableName = input.required<string>();
  readonly submitting = input(false);
  readonly errorMessage = input<string | null>(null);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected titleKey(): UiTextKey {
    switch (this.kind()) {
      case 'deactivate':
        return 'tablesConfirmDeactivateTitle';
      case 'activate':
        return 'tablesConfirmActivateTitle';
      case 'regenerateToken':
        return 'tablesConfirmRegenerateTitle';
    }
  }

  protected messageKey(): UiTextKey {
    switch (this.kind()) {
      case 'deactivate':
        return 'tablesConfirmDeactivateMessage';
      case 'activate':
        return 'tablesConfirmActivateMessage';
      case 'regenerateToken':
        return 'tablesConfirmRegenerateMessage';
    }
  }

  protected confirmKey(): UiTextKey {
    switch (this.kind()) {
      case 'deactivate':
        return 'tablesConfirmDeactivateSubmit';
      case 'activate':
        return 'tablesConfirmActivateSubmit';
      case 'regenerateToken':
        return 'tablesConfirmRegenerateSubmit';
    }
  }

  protected destructive(): boolean {
    return this.kind() === 'deactivate' || this.kind() === 'regenerateToken';
  }
}
