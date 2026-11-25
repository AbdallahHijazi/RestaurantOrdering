import { Component, inject, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LocaleService } from '../../../../../../core/localization/locale';

@Component({
  selector: 'app-table-form-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './table-form-modal.html',
  styleUrl: './table-form-modal.scss',
})
export class TableFormModal {
  protected readonly locale = inject(LocaleService);

  readonly form = input.required<FormGroup>();
  readonly mode = input.required<'create' | 'edit'>();
  readonly submitting = input(false);
  readonly errorMessage = input<string | null>(null);

  readonly submitted = output<void>();
  readonly cancelled = output<void>();

  protected formId(): string {
    return this.mode() === 'create' ? 'tables-create-form' : 'tables-edit-form';
  }
}
