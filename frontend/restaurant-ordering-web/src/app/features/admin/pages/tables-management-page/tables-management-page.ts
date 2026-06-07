import { HttpErrorResponse } from '@angular/common/http';
import {
  ApplicationRef,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, switchMap } from 'rxjs';
import { ModalShell } from '../../../../shared/components/order-modal-shell/order-modal-shell';
import { LocaleService } from '../../../../core/localization/locale';
import { resolveApiAssetUrl } from '../../../../core/config/resolve-api-asset-url';
import { AdminBrandingService } from '../../../../core/layouts/admin-layout/admin-branding.service';
import { RestaurantProfileApiService } from '../../restaurant-profile/data-access/restaurant-profile-api';
import { RestaurantTablesService } from '../../data-access/restaurant-tables.service';
import type { RestaurantTable } from '../../data-access/restaurant-tables.models';
import { StaffModalActions } from '../staff-management-page/components/staff-modal-actions/staff-modal-actions';
import { TableCard } from './components/table-card/table-card';
import { TableConfirmModal, type TableConfirmKind } from './components/table-confirm-modal/table-confirm-modal';
import { TableFormModal } from './components/table-form-modal/table-form-modal';
import { TablePrintCard } from './components/table-print-card/table-print-card';
import {
  TablesManagementSelect,
  type TablesSelectOption,
} from './components/tables-management-select/tables-management-select';
import {
  buildTableMenuUrl,
  downloadSvgFile,
  generateTableQrSvg,
} from './utils/table-qr.util';

type PageState = 'loading' | 'ready' | 'error' | 'missing-context';
type ModalKind = 'create' | 'edit' | 'confirm' | null;
type StatusFilterValue = 'all' | 'active' | 'inactive';

interface PrintEntry {
  table: RestaurantTable;
  qrSvg: string;
  menuUrl: string;
}

@Component({
  selector: 'app-tables-management-page',
  imports: [
    ReactiveFormsModule,
    ModalShell,
    StaffModalActions,
    TablesManagementSelect,
    TableCard,
    TablePrintCard,
    TableFormModal,
    TableConfirmModal,
  ],
  templateUrl: './tables-management-page.html',
  styleUrls: ['./tables-management-page.scss', './tables-management-page.print.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class TablesManagementPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly tablesService = inject(RestaurantTablesService);
  private readonly profileApi = inject(RestaurantProfileApiService);
  private readonly branding = inject(AdminBrandingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly appRef = inject(ApplicationRef);

  @ViewChild('printArea', { read: ElementRef })
  private printAreaRef?: ElementRef<HTMLElement>;

  @ViewChild('printAreaHost', { read: ElementRef })
  private printAreaHostRef?: ElementRef<HTMLElement>;

  protected readonly locale = inject(LocaleService);

  protected readonly pageState = signal<PageState>('loading');
  protected readonly tables = signal<RestaurantTable[]>([]);
  protected readonly restaurantSlug = signal('');
  protected readonly successMessage = signal<string | null>(null);
  protected readonly listErrorMessage = signal<string | null>(null);

  protected readonly searchQuery = signal('');
  protected readonly zoneFilter = signal('all');
  protected readonly statusFilter = signal<StatusFilterValue>('all');

  protected readonly modalKind = signal<ModalKind>(null);
  protected readonly confirmKind = signal<TableConfirmKind>('deactivate');
  protected readonly selectedTable = signal<RestaurantTable | null>(null);

  protected readonly createSubmitting = signal(false);
  protected readonly createErrorMessage = signal<string | null>(null);
  protected readonly editSubmitting = signal(false);
  protected readonly editErrorMessage = signal<string | null>(null);
  protected readonly confirmSubmitting = signal(false);
  protected readonly confirmErrorMessage = signal<string | null>(null);

  protected readonly qrSvgByTableId = signal<Record<string, string>>({});
  protected readonly qrLoadingByTableId = signal<Record<string, boolean>>({});

  protected readonly printEntries = signal<PrintEntry[]>([]);
  protected readonly printMode = signal<'single' | 'all' | null>(null);

  protected readonly totalTables = computed(() => this.tables().length);
  protected readonly activeTables = computed(
    () => this.tables().filter((table) => table.isActive).length,
  );
  protected readonly distinctZoneCount = computed(
    () =>
      new Set(
        this.tables()
          .map((table) => table.zone?.trim())
          .filter((zone): zone is string => Boolean(zone)),
      ).size,
  );

  protected readonly zoneFilterOptions = computed<TablesSelectOption[]>(() => {
    const zones = [...new Set(
      this.tables()
        .map((table) => table.zone?.trim())
        .filter((zone): zone is string => Boolean(zone)),
    )].sort((a, b) => a.localeCompare(b));

    return [
      { value: 'all', label: this.locale.uiText('tablesFilterAllZones') },
      ...zones.map((zone) => ({ value: zone, label: zone })),
    ];
  });

  protected readonly statusFilterOptions = computed<TablesSelectOption[]>(() => [
    { value: 'all', label: this.locale.uiText('tablesFilterAllStatuses') },
    { value: 'active', label: this.locale.uiText('tablesStatusActive') },
    { value: 'inactive', label: this.locale.uiText('tablesStatusInactive') },
  ]);

  protected readonly filteredTables = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const zone = this.zoneFilter();
    const status = this.statusFilter();

    return this.tables().filter((table) => {
      if (zone !== 'all' && (table.zone?.trim() ?? '') !== zone) {
        return false;
      }

      if (status === 'active' && !table.isActive) {
        return false;
      }

      if (status === 'inactive' && table.isActive) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [table.name, table.zone ?? '', table.publicToken].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  });

  protected readonly createForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    zone: ['', [Validators.maxLength(100)]],
    isActive: [true],
  });

  protected readonly editForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    zone: ['', [Validators.maxLength(100)]],
  });

  constructor() {
    this.loadTables();
  }

  protected restaurantDisplayName(): string {
    return this.branding.restaurantName();
  }

  protected restaurantLogoUrl(): string | null {
    return this.branding.logoUrl();
  }

  protected restaurantBrandInitial(): string {
    return this.branding.brandInitial();
  }

  protected showingTablesLabel(): string {
    const shown = this.filteredTables().length;
    const total = this.tables().length;
    return this.locale
      .uiText('tablesShowingCount')
      .replace('{shown}', String(shown))
      .replace('{total}', String(total));
  }

  protected loadTables(): void {
    this.successMessage.set(null);

    const restaurantId = this.tablesService.getRestaurantId();
    if (!restaurantId) {
      this.pageState.set('missing-context');
      this.tables.set([]);
      return;
    }

    this.pageState.set('loading');
    this.listErrorMessage.set(null);

    this.profileApi
      .getRestaurant(restaurantId)
      .pipe(
        switchMap((restaurant) => {
          this.restaurantSlug.set(restaurant.slug.trim().toLowerCase());
          this.branding.updateBranding({
            logoUrl: resolveApiAssetUrl(restaurant.logoUrl),
            coverImageUrl: resolveApiAssetUrl(restaurant.coverImageUrl),
            nameAr: restaurant.nameAr,
            nameEn: restaurant.nameEn ?? null,
          });
          return this.tablesService.listTables();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (tables) => {
          const sorted = [...tables].sort(this.compareTables);
          this.tables.set(sorted);
          this.pageState.set('ready');
          void this.refreshQrPreviews(sorted);
        },
        error: (error) => {
          this.tables.set([]);
          this.listErrorMessage.set(this.mapListError(error));
          this.pageState.set('error');
        },
      });
  }

  protected setSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  protected setZoneFilter(value: string): void {
    this.zoneFilter.set(value);
  }

  protected setStatusFilter(value: string): void {
    if (value === 'all' || value === 'active' || value === 'inactive') {
      this.statusFilter.set(value);
    }
  }

  protected qrSvgFor(tableId: string): string | null {
    return this.qrSvgByTableId()[tableId] ?? null;
  }

  protected qrLoadingFor(tableId: string): boolean {
    return this.qrLoadingByTableId()[tableId] ?? false;
  }

  protected openCreateModal(): void {
    this.createForm.reset({ name: '', zone: '', isActive: true });
    this.createErrorMessage.set(null);
    this.createSubmitting.set(false);
    this.modalKind.set('create');
  }

  protected closeCreateModal(): void {
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
    this.createSubmitting.set(true);
    this.createErrorMessage.set(null);

    this.tablesService
      .createTable({
        name: raw.name.trim(),
        zone: raw.zone.trim() || null,
        isActive: raw.isActive,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.createSubmitting.set(false)),
      )
      .subscribe({
        next: (created) => {
          this.tables.update((entries) => [...entries, created].sort(this.compareTables));
          this.closeCreateModal();
          this.successMessage.set(this.locale.uiText('tablesCreateSuccess'));
          void this.ensureQrPreview(created);
        },
        error: (error) => {
          this.createErrorMessage.set(this.mapMutationError(error));
        },
      });
  }

  protected openEditModal(table: RestaurantTable): void {
    this.selectedTable.set(table);
    this.editForm.reset({
      name: table.name,
      zone: table.zone ?? '',
    });
    this.editErrorMessage.set(null);
    this.editSubmitting.set(false);
    this.modalKind.set('edit');
  }

  protected closeEditModal(): void {
    this.modalKind.set(null);
    this.editSubmitting.set(false);
    this.editErrorMessage.set(null);
    this.selectedTable.set(null);
  }

  protected submitEdit(): void {
    const table = this.selectedTable();
    if (!table || this.editSubmitting()) {
      return;
    }

    this.editForm.markAllAsTouched();
    if (this.editForm.invalid) {
      return;
    }

    const raw = this.editForm.getRawValue();
    this.editSubmitting.set(true);
    this.editErrorMessage.set(null);

    this.tablesService
      .updateTable(table.id, {
        name: raw.name.trim(),
        zone: raw.zone.trim() || null,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.editSubmitting.set(false)),
      )
      .subscribe({
        next: (updated) => {
          this.tables.update((entries) =>
            entries.map((entry) => (entry.id === updated.id ? updated : entry)).sort(this.compareTables),
          );
          this.closeEditModal();
          this.successMessage.set(this.locale.uiText('tablesUpdateSuccess'));
        },
        error: (error) => {
          this.editErrorMessage.set(this.mapMutationError(error));
        },
      });
  }

  protected openStatusConfirm(table: RestaurantTable): void {
    this.selectedTable.set(table);
    this.confirmKind.set(table.isActive ? 'deactivate' : 'activate');
    this.confirmErrorMessage.set(null);
    this.confirmSubmitting.set(false);
    this.modalKind.set('confirm');
  }

  protected openRegenerateConfirm(table: RestaurantTable): void {
    this.selectedTable.set(table);
    this.confirmKind.set('regenerateToken');
    this.confirmErrorMessage.set(null);
    this.confirmSubmitting.set(false);
    this.modalKind.set('confirm');
  }

  protected closeConfirmModal(): void {
    this.modalKind.set(null);
    this.confirmSubmitting.set(false);
    this.confirmErrorMessage.set(null);
    this.selectedTable.set(null);
  }

  protected submitConfirm(): void {
    const table = this.selectedTable();
    if (!table || this.confirmSubmitting()) {
      return;
    }

    this.confirmSubmitting.set(true);
    this.confirmErrorMessage.set(null);

    const request$ =
      this.confirmKind() === 'regenerateToken'
        ? this.tablesService.regenerateTableToken(table.id)
        : this.tablesService.updateTableStatus(table.id, {
            isActive: this.confirmKind() === 'activate',
          });

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.confirmSubmitting.set(false)),
      )
      .subscribe({
        next: (updated) => {
          this.tables.update((entries) =>
            entries.map((entry) => (entry.id === updated.id ? updated : entry)).sort(this.compareTables),
          );
          this.closeConfirmModal();
          this.successMessage.set(
            this.confirmKind() === 'regenerateToken'
              ? this.locale.uiText('tablesRegenerateSuccess')
              : updated.isActive
                ? this.locale.uiText('tablesActivateSuccess')
                : this.locale.uiText('tablesDeactivateSuccess'),
          );
          void this.ensureQrPreview(updated, true);
        },
        error: (error) => {
          this.confirmErrorMessage.set(this.mapMutationError(error));
        },
      });
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

    if (this.modalKind() === 'confirm') {
      this.closeConfirmModal();
    }
  }

  protected modalTitle(): string {
    if (this.modalKind() === 'create') {
      return this.locale.uiText('tablesCreateTitle');
    }

    if (this.modalKind() === 'edit') {
      return this.locale.uiText('tablesEditTitle');
    }

    if (this.modalKind() === 'confirm') {
      switch (this.confirmKind()) {
        case 'deactivate':
          return this.locale.uiText('tablesConfirmDeactivateTitle');
        case 'activate':
          return this.locale.uiText('tablesConfirmActivateTitle');
        case 'regenerateToken':
          return this.locale.uiText('tablesConfirmRegenerateTitle');
      }
    }

    return '';
  }

  protected async downloadQr(table: RestaurantTable): Promise<void> {
    const slug = this.restaurantSlug();
    if (!slug) {
      return;
    }

    const menuUrl = buildTableMenuUrl(slug, table.publicToken);
    const svg = await generateTableQrSvg(menuUrl);
    downloadSvgFile(svg, `${table.name.trim() || 'table'}-qr.svg`);
  }

  protected async printTable(table: RestaurantTable): Promise<void> {
    const entry = await this.buildPrintEntry(table);
    if (!entry) {
      return;
    }

    await this.runPrint([entry], 'single');
  }

  protected async printAllTables(): Promise<void> {
    const activeTables = this.filteredTables().filter((table) => table.isActive);
    if (activeTables.length === 0) {
      return;
    }

    const entries = (
      await Promise.all(activeTables.map((table) => this.buildPrintEntry(table)))
    ).filter((entry): entry is PrintEntry => entry !== null);

    await this.runPrint(entries, 'all');
  }

  private async runPrint(entries: PrintEntry[], mode: 'single' | 'all'): Promise<void> {
    this.printEntries.set(entries);
    this.printMode.set(mode);
    this.appRef.tick();
    await this.waitForNextPaint();

    const printArea = this.printAreaRef?.nativeElement;
    const printHost = this.printAreaHostRef?.nativeElement;
    if (!printArea || !printHost) {
      return;
    }

    const restoreParent = printArea.parentElement;
    const restoreNextSibling = printArea.nextSibling;

    document.body.classList.add('tables-print-active');
    document.body.appendChild(printArea);
    this.appRef.tick();
    await this.waitForNextPaint();

    const cleanup = (): void => {
      document.body.classList.remove('tables-print-active');
      if (restoreParent) {
        restoreParent.insertBefore(printArea, restoreNextSibling);
      } else {
        printHost.appendChild(printArea);
      }
      this.printMode.set(null);
      this.printEntries.set([]);
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();

    // Fallback when afterprint is not fired (some browsers / cancel).
    window.setTimeout(() => {
      if (document.body.classList.contains('tables-print-active')) {
        cleanup();
      }
    }, 1000);
  }

  private waitForNextPaint(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }

  protected modalTestId(): string {
    if (this.modalKind() === 'create') {
      return 'tables-create-modal';
    }

    if (this.modalKind() === 'edit') {
      return 'tables-edit-modal';
    }

    return 'tables-confirm-modal';
  }

  private async buildPrintEntry(table: RestaurantTable): Promise<PrintEntry | null> {
    const slug = this.restaurantSlug();
    if (!slug) {
      return null;
    }

    const menuUrl = buildTableMenuUrl(slug, table.publicToken);
    const qrSvg = await generateTableQrSvg(menuUrl);
    return { table, qrSvg, menuUrl };
  }

  private async refreshQrPreviews(tables: RestaurantTable[]): Promise<void> {
    await Promise.all(tables.map((table) => this.ensureQrPreview(table)));
  }

  private async ensureQrPreview(table: RestaurantTable, force = false): Promise<void> {
    const slug = this.restaurantSlug();
    if (!slug) {
      return;
    }

    if (!force && this.qrSvgByTableId()[table.id]) {
      return;
    }

    this.qrLoadingByTableId.update((state) => ({ ...state, [table.id]: true }));

    try {
      const menuUrl = buildTableMenuUrl(slug, table.publicToken);
      const svg = await generateTableQrSvg(menuUrl);
      this.qrSvgByTableId.update((state) => ({ ...state, [table.id]: svg }));
    } finally {
      this.qrLoadingByTableId.update((state) => ({ ...state, [table.id]: false }));
    }
  }

  private compareTables(a: RestaurantTable, b: RestaurantTable): number {
    const zoneA = a.zone?.trim() ?? '';
    const zoneB = b.zone?.trim() ?? '';
    const byZone = zoneA.localeCompare(zoneB);
    if (byZone !== 0) {
      return byZone;
    }

    return a.name.localeCompare(b.name);
  }

  private mapListError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 429) {
      return this.locale.uiText('tablesErrorTooManyRequests');
    }

    return this.locale.uiText('tablesListError');
  }

  private mapMutationError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400) {
        return this.readProblemDetail(error) ?? this.locale.uiText('tablesErrorValidation');
      }

      if (error.status === 409) {
        return this.locale.uiText('tablesErrorConflict');
      }

      if (error.status === 429) {
        return this.locale.uiText('tablesErrorTooManyRequests');
      }
    }

    return this.locale.uiText('tablesErrorGeneric');
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
