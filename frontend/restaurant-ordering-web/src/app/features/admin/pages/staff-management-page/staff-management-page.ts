import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ModalShell } from '../../../../shared/components/order-modal-shell/order-modal-shell';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import {
  ApplicationRoles,
  AssignableStaffRoles,
  isAssignableStaffRole,
  type AssignableStaffRole,
} from '../../../../core/auth/application-roles';
import { LocaleService } from '../../../../core/localization/locale';
import { RestaurantStaffService } from '../../data-access/restaurant-staff.service';
import type { RestaurantStaffUser } from '../../data-access/restaurant-staff.models';
import { StaffManagementRoster } from './components/staff-management-roster/staff-management-roster';
import { StaffManagementStats } from './components/staff-management-stats/staff-management-stats';
import {
  StaffManagementSelect,
  type StaffSelectOption,
} from './components/staff-management-select/staff-management-select';
import { StaffModalActions } from './components/staff-modal-actions/staff-modal-actions';
import { IconButton } from '../../../../shared/ui/icon-button/icon-button';
import { FloatingNotificationPill } from '../../../../shared/ui/floating-notification-pill/floating-notification-pill';

type PageState = 'loading' | 'ready' | 'error' | 'missing-context';
type ModalKind = 'create' | 'changeRole' | 'edit' | 'status' | null;
type StaffFilterValue = 'all' | AssignableStaffRole;
type StatusFilterValue = 'all' | 'active' | 'inactive';

import { ErrorState } from '../../../../shared/ui/error-state/error-state';

@Component({
  selector: 'app-staff-management-page',
  imports: [ErrorState, ReactiveFormsModule, ModalShell, StaffManagementRoster, StaffManagementStats, StaffManagementSelect, StaffModalActions, IconButton, FloatingNotificationPill],
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

  protected readonly searchQuery = signal('');
  protected readonly roleFilter = signal<StaffFilterValue>('all');
  protected readonly statusFilter = signal<StatusFilterValue>('all');

  protected readonly modalKind = signal<ModalKind>(null);
  protected readonly createSubmitting = signal(false);
  protected readonly createErrorMessage = signal<string | null>(null);
  protected readonly changeRoleSubmitting = signal(false);
  protected readonly changeRoleErrorMessage = signal<string | null>(null);
  protected readonly selectedStaff = signal<RestaurantStaffUser | null>(null);
  protected readonly editSubmitting = signal(false);
  protected readonly editErrorMessage = signal<string | null>(null);
  protected readonly statusSubmitting = signal(false);
  protected readonly statusErrorMessage = signal<string | null>(null);

  protected readonly totalEmployees = computed(() => this.staff().length);
  protected readonly activeEmployees = computed(
    () => this.staff().filter((member) => member.isActive).length,
  );
  protected readonly distinctRoleCount = computed(
    () => new Set(this.staff().map((member) => member.role)).size,
  );

  protected readonly roleSelectOptions = computed<StaffSelectOption[]>(() =>
    this.assignableRoles.map((role) => ({
      value: role,
      label: this.roleLabel(role),
    })),
  );

  protected readonly roleFilterOptions = computed<StaffSelectOption[]>(() => [
    { value: 'all', label: this.locale.uiText('staffFilterAllRoles') },
    ...this.roleSelectOptions(),
  ]);

  protected readonly statusFilterOptions = computed<StaffSelectOption[]>(() => [
    { value: 'all', label: this.locale.uiText('staffFilterAllStatuses') },
    { value: 'active', label: this.locale.uiText('staffStatusActive') },
    { value: 'inactive', label: this.locale.uiText('staffStatusInactive') },
  ]);

  protected readonly filteredStaff = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const role = this.roleFilter();
    const status = this.statusFilter();

    return this.staff().filter((member) => {
      if (role !== 'all' && member.role !== role) {
        return false;
      }

      if (status === 'active' && !member.isActive) {
        return false;
      }

      if (status === 'inactive' && member.isActive) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        member.fullName ?? '',
        member.email,
        member.phoneNumber ?? '',
        this.roleLabel(member.role),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  });

  protected readonly createForm = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    password: ['', [Validators.required, Validators.maxLength(200)]],
    fullName: ['', [Validators.maxLength(150)]],
    phoneNumber: ['', [Validators.maxLength(32)]],
    role: [ApplicationRoles.RestaurantManager as AssignableStaffRole, [Validators.required]],
  });

  protected readonly editForm = this.fb.group({
    fullName: ['', [Validators.maxLength(150)]],
    phoneNumber: ['', [Validators.maxLength(32)]],
  });

  protected readonly changeRoleForm = this.fb.group({
    role: [ApplicationRoles.RestaurantManager as AssignableStaffRole, [Validators.required]],
  });

  constructor() {
    this.loadStaff();
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

  protected setSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  protected setRoleFilter(value: string): void {
    if (value === 'all' || isAssignableStaffRole(value)) {
      this.roleFilter.set(value);
    }
  }

  protected setStatusFilter(value: string): void {
    if (value === 'all' || value === 'active' || value === 'inactive') {
      this.statusFilter.set(value);
    }
  }

  protected showingEmployeesLabel(): string {
    const shown = this.filteredStaff().length;
    const total = this.staff().length;
    return this.locale
      .uiText('staffShowingCount')
      .replace('{shown}', String(shown))
      .replace('{total}', String(total));
  }

  protected openCreateModal(): void {
    this.resetCreateForm();
    this.createErrorMessage.set(null);
    this.createSubmitting.set(false);
    this.modalKind.set('create');
  }

  protected closeCreateModal(): void {
    this.createForm.controls.password.setValue('');
    this.modalKind.set(null);
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
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.createSubmitting.set(false)),
      )
      .subscribe({
        next: (created) => {
          this.staff.update((users) => [...users, created].sort(this.compareStaff));
          this.closeCreateModal();
          this.pageState.set('ready');
          this.successMessage.set(this.locale.uiText('staffCreateSuccess'));
        },
        error: (error) => {
          this.createErrorMessage.set(this.mapMutationError(error));
        },
      });
  }

  protected openChangeRoleModal(member: RestaurantStaffUser): void {
    this.selectedStaff.set(member);
    this.changeRoleForm.reset({ role: member.role });
    this.changeRoleErrorMessage.set(null);
    this.changeRoleSubmitting.set(false);
    this.modalKind.set('changeRole');
  }

  protected closeChangeRoleModal(): void {
    this.modalKind.set(null);
    this.changeRoleSubmitting.set(false);
    this.changeRoleErrorMessage.set(null);
    this.selectedStaff.set(null);
  }

  protected openEditModal(member: RestaurantStaffUser): void {
    this.selectedStaff.set(member);
    this.editForm.reset({ fullName: member.fullName ?? '', phoneNumber: member.phoneNumber ?? '' });
    this.editErrorMessage.set(null);
    this.editSubmitting.set(false);
    this.modalKind.set('edit');
  }

  protected closeEditModal(): void {
    this.modalKind.set(null);
    this.editSubmitting.set(false);
    this.editErrorMessage.set(null);
    this.selectedStaff.set(null);
  }

  protected submitEdit(): void {
    const member = this.selectedStaff();
    if (!member || this.editSubmitting()) {
      return;
    }

    this.editForm.markAllAsTouched();
    if (this.editForm.invalid) {
      return;
    }

    const raw = this.editForm.getRawValue();
    this.editSubmitting.set(true);
    this.editErrorMessage.set(null);

    this.staffService
      .updateStaff(member.id, {
        fullName: raw.fullName.trim() || null,
        phoneNumber: raw.phoneNumber.trim() || null,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.editSubmitting.set(false)),
      )
      .subscribe({
        next: (updated) => {
          this.replaceStaffMember(updated);
          this.closeEditModal();
          this.successMessage.set(this.locale.uiText('staffUpdateSuccess'));
        },
        error: (error) => this.editErrorMessage.set(this.mapMutationError(error)),
      });
  }

  /** Activation/deactivation is confirmed first: it blocks or restores the employee's sign-in. */
  protected openStatusModal(member: RestaurantStaffUser): void {
    this.selectedStaff.set(member);
    this.statusErrorMessage.set(null);
    this.statusSubmitting.set(false);
    this.modalKind.set('status');
  }

  protected closeStatusModal(): void {
    this.modalKind.set(null);
    this.statusSubmitting.set(false);
    this.statusErrorMessage.set(null);
    this.selectedStaff.set(null);
  }

  protected confirmStatusChange(): void {
    const member = this.selectedStaff();
    if (!member || this.statusSubmitting()) {
      return;
    }

    this.statusSubmitting.set(true);
    this.statusErrorMessage.set(null);

    this.staffService
      .setStaffActive(member.id, !member.isActive)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.statusSubmitting.set(false)),
      )
      .subscribe({
        next: (updated) => {
          this.replaceStaffMember(updated);
          this.closeStatusModal();
          this.successMessage.set(this.locale.uiText('staffStatusUpdateSuccess'));
        },
        error: (error) => this.statusErrorMessage.set(this.mapMutationError(error)),
      });
  }

  protected dismissSuccess(): void {
    this.successMessage.set(null);
  }

  /** Per-dialog width (the shell default of 44rem is far too wide for a 2-5 field form). */
  protected modalWidth(): string {
    switch (this.modalKind()) {
      case 'create':
        return '34rem';
      case 'edit':
        return '30rem';
      default:
        return '28rem';
    }
  }

  protected modalTitleId(): string {
    return `staff-${this.modalKind() ?? 'modal'}-title`;
  }

  protected modalTestId(): string {
    const kind = this.modalKind();
    return kind === 'changeRole' ? 'staff-change-role-modal' : `staff-${kind ?? 'modal'}-modal`;
  }

  private replaceStaffMember(updated: RestaurantStaffUser): void {
    this.staff.update((users) =>
      users.map((user) => (user.id === updated.id ? updated : user)).sort(this.compareStaff),
    );
  }

  protected dismissModal(): void {
    if (this.modalKind() === 'create') {
      this.closeCreateModal();
      return;
    }

    if (this.modalKind() === 'edit') {
      this.closeEditModal();
      return;
    }

    if (this.modalKind() === 'status') {
      this.closeStatusModal();
      return;
    }

    if (this.modalKind() === 'changeRole') {
      this.closeChangeRoleModal();
    }
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
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.changeRoleSubmitting.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.staff.update((users) =>
            users
              .map((user) =>
                user.id === result.id ? { ...user, role: result.role } : user,
              )
              .sort(this.compareStaff),
          );
          this.closeChangeRoleModal();
          this.successMessage.set(this.locale.uiText('staffRoleUpdateSuccess'));
        },
        error: (error) => {
          this.changeRoleErrorMessage.set(this.mapMutationError(error));
        },
      });
  }

  protected modalTitle(): string {
    if (this.modalKind() === 'create') {
      return this.locale.uiText('staffCreateTitle');
    }

    if (this.modalKind() === 'changeRole') {
      return this.locale.uiText('staffChangeRoleTitle');
    }

    if (this.modalKind() === 'edit') {
      return this.locale.uiText('staffEditTitle');
    }

    if (this.modalKind() === 'status') {
      return this.locale.uiText(
        this.selectedStaff()?.isActive ? 'staffDeactivateTitle' : 'staffActivateTitle',
      );
    }

    return '';
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

  protected displayName(member: RestaurantStaffUser): string {
    return member.fullName?.trim() || member.email;
  }

  private resetCreateForm(): void {
    this.createForm.reset({
      email: '',
      password: '',
      fullName: '',
      phoneNumber: '',
      role: ApplicationRoles.RestaurantManager,
    });
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

      if (error.status === 403 || error.status === 404) {
        return this.locale.uiText('staffErrorForbiddenAction');
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
