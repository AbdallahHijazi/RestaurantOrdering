import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  ApplicationRoles,
  AssignableStaffRoles,
  isAssignableStaffRole,
  type AssignableStaffRole,
} from '../../../../core/auth/application-roles';
import { LocaleService } from '../../../../core/localization/locale';
import { RestaurantStaffService } from '../../data-access/restaurant-staff.service';
import type { RestaurantStaffUser } from '../../data-access/restaurant-staff.models';

type PageState = 'loading' | 'ready' | 'error' | 'missing-context';

@Component({
  selector: 'app-staff-management-page',
  imports: [ReactiveFormsModule],
  templateUrl: './staff-management-page.html',
  styleUrl: './staff-management-page.scss',
})
export class StaffManagementPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly staffService = inject(RestaurantStaffService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly locale = inject(LocaleService);
  protected readonly assignableRoles = AssignableStaffRoles;

  protected readonly pageState = signal<PageState>('loading');
  protected readonly staff = signal<RestaurantStaffUser[]>([]);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly listErrorMessage = signal<string | null>(null);

  protected readonly createOpen = signal(false);
  protected readonly createSubmitting = signal(false);
  protected readonly createErrorMessage = signal<string | null>(null);

  protected readonly changeRoleOpen = signal(false);
  protected readonly changeRoleSubmitting = signal(false);
  protected readonly changeRoleErrorMessage = signal<string | null>(null);
  protected readonly selectedStaff = signal<RestaurantStaffUser | null>(null);

  protected readonly createForm = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    password: ['', [Validators.required, Validators.maxLength(200)]],
    fullName: ['', [Validators.maxLength(150)]],
    phoneNumber: ['', [Validators.maxLength(32)]],
    role: [ApplicationRoles.RestaurantManager as AssignableStaffRole, [Validators.required]],
  });

  protected readonly changeRoleForm = this.fb.group({
    role: [ApplicationRoles.RestaurantManager as AssignableStaffRole, [Validators.required]],
  });

  constructor() {
    this.loadStaff();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.createOpen()) {
      this.closeCreateModal();
    } else if (this.changeRoleOpen()) {
      this.closeChangeRoleModal();
    }
  }

  protected loadStaff(): void {
    this.successMessage.set(null);

    if (!this.staffService.getRestaurantId()) {
      this.pageState.set('missing-context');
      this.staff.set([]);
      return;
    }

    this.pageState.set('loading');
    this.listErrorMessage.set(null);

    this.staffService
      .listStaff()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.staff.set(users);
          this.pageState.set('ready');
        },
        error: (error) => {
          this.staff.set([]);
          this.listErrorMessage.set(this.mapListError(error));
          this.pageState.set('error');
        },
      });
  }

  protected openCreateModal(): void {
    this.createForm.reset({
      email: '',
      password: '',
      fullName: '',
      phoneNumber: '',
      role: ApplicationRoles.RestaurantManager,
    });
    this.createErrorMessage.set(null);
    this.createOpen.set(true);
  }

  protected closeCreateModal(): void {
    this.createForm.controls.password.setValue('');
    this.createOpen.set(false);
    this.createSubmitting.set(false);
    this.createErrorMessage.set(null);
  }

  protected submitCreate(): void {
    if (this.createSubmitting()) {
      return;
    }

    this.createForm.markAllAsTouched();
    if (this.createForm.invalid) {
      return;
    }

    const raw = this.createForm.getRawValue();
    const role = raw.role;
    if (!isAssignableStaffRole(role)) {
      return;
    }

    this.createSubmitting.set(true);
    this.createErrorMessage.set(null);

    this.staffService
      .createStaff({
        email: raw.email.trim(),
        password: raw.password,
        fullName: raw.fullName.trim() || null,
        phoneNumber: raw.phoneNumber.trim() || null,
        role,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.staff.update((users) => [...users, created].sort(this.compareStaff));
          this.createSubmitting.set(false);
          this.closeCreateModal();
          this.pageState.set('ready');
          this.successMessage.set(this.locale.uiText('staffCreateSuccess'));
        },
        error: (error) => {
          this.createSubmitting.set(false);
          this.createErrorMessage.set(this.mapMutationError(error));
        },
      });
  }

  protected openChangeRoleModal(member: RestaurantStaffUser): void {
    this.selectedStaff.set(member);
    this.changeRoleForm.reset({ role: member.role });
    this.changeRoleErrorMessage.set(null);
    this.changeRoleOpen.set(true);
  }

  protected closeChangeRoleModal(): void {
    this.changeRoleOpen.set(false);
    this.changeRoleSubmitting.set(false);
    this.changeRoleErrorMessage.set(null);
    this.selectedStaff.set(null);
  }

  protected submitChangeRole(): void {
    const member = this.selectedStaff();
    if (!member || this.changeRoleSubmitting()) {
      return;
    }

    this.changeRoleForm.markAllAsTouched();
    if (this.changeRoleForm.invalid) {
      return;
    }

    const role = this.changeRoleForm.controls.role.value;
    if (!isAssignableStaffRole(role)) {
      return;
    }

    this.changeRoleSubmitting.set(true);
    this.changeRoleErrorMessage.set(null);

    this.staffService
      .updateStaffRole(member.id, { role })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.staff.update((users) =>
            users
              .map((user) =>
                user.id === result.id ? { ...user, role: result.role } : user,
              )
              .sort(this.compareStaff),
          );
          this.changeRoleSubmitting.set(false);
          this.closeChangeRoleModal();
          this.successMessage.set(this.locale.uiText('staffRoleUpdateSuccess'));
        },
        error: (error) => {
          this.changeRoleSubmitting.set(false);
          this.changeRoleErrorMessage.set(this.mapMutationError(error));
        },
      });
  }

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

  private compareStaff(a: RestaurantStaffUser, b: RestaurantStaffUser): number {
    const nameA = (a.fullName ?? a.email).toLocaleLowerCase();
    const nameB = (b.fullName ?? b.email).toLocaleLowerCase();
    const byName = nameA.localeCompare(nameB);
    return byName !== 0 ? byName : a.email.localeCompare(b.email);
  }

  private mapListError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 429) {
        return this.locale.uiText('staffErrorTooManyRequests');
      }
    }

    return this.locale.uiText('staffListError');
  }

  private mapMutationError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400) {
        return this.readProblemDetail(error) ?? this.locale.uiText('staffErrorValidation');
      }

      if (error.status === 409) {
        return this.locale.uiText('staffErrorDuplicateEmail');
      }

      if (error.status === 429) {
        return this.locale.uiText('staffErrorTooManyRequests');
      }
    }

    return this.locale.uiText('staffErrorGeneric');
  }

  private readProblemDetail(error: HttpErrorResponse): string | null {
    const body = error.error;
    if (!body || typeof body !== 'object') {
      return null;
    }

    const detail = (body as Record<string, unknown>)['detail'];
    return typeof detail === 'string' && detail.trim() ? detail : null;
  }
}
