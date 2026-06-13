import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { AuthService } from '../../../../../core/auth/auth.service';
import { DirectionService } from '../../../../../core/localization/direction.service';
import { LocaleApiService } from '../../../../../core/localization/locale-api.service';
import { LocaleService } from '../../../../../core/localization/locale';
import type {
  LocaleMetadata,
  RestaurantLocaleSettings,
} from '../../../../../core/localization/locale.types';
import {
  buildLocaleSettingsPayload,
  createEditorStateFromSettings,
  ensureDefaultLocaleEnabled,
  formatLocaleOptionLabel,
  hasMissingTranslationErrors,
  normalizeTranslationMode,
  parseMissingTranslationCounts,
  TRANSLATION_MODE_OPTIONS,
  type LocaleSettingsEditorState,
  type MissingTranslationErrorCounts,
  type TranslationModeOption,
} from '../../data-access/restaurant-locale-settings.util';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-restaurant-locale-settings-panel',
  imports: [FormsModule],
  templateUrl: './restaurant-locale-settings-panel.html',
  styleUrl: './restaurant-locale-settings-panel.scss',
})
export class RestaurantLocaleSettingsPanel {
  readonly active = input(false);

  private readonly localeApi = inject(LocaleApiService);
  private readonly authService = inject(AuthService);
  protected readonly localeService = inject(LocaleService);
  private readonly directionService = inject(DirectionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loadState = signal<LoadState>('idle');
  protected readonly saving = signal(false);
  protected readonly settings = signal<RestaurantLocaleSettings | null>(null);
  protected readonly editor = signal<LocaleSettingsEditorState | null>(null);
  protected readonly saveNotice = signal<string | null>(null);
  protected readonly errorNotice = signal<string | null>(null);
  protected readonly missingCounts = signal<MissingTranslationErrorCounts | null>(null);

  protected readonly translationModeOptions = TRANSLATION_MODE_OPTIONS;

  protected readonly canManage = computed(
    () => this.settings()?.canManageLocales ?? false,
  );

  protected readonly isReadOnly = computed(() => !this.canManage());

  protected readonly availableLocales = computed(
    () => this.settings()?.availableLocales ?? [],
  );

  protected readonly supportedLocaleRows = computed(() => {
    const settings = this.settings();
    const editor = this.editor();
    if (!settings || !editor) {
      return [];
    }

    return settings.availableLocales.map((locale) => ({
      locale,
      enabled: editor.enabledByCode[locale.code] ?? false,
      isDefault: locale.code === editor.defaultLocale,
      directionLabel: this.directionBadge(locale),
    }));
  });

  constructor() {
    effect(() => {
      if (this.active()) {
        this.ensureLoaded();
      }
    });
  }

  protected ensureLoaded(): void {
    if (!this.active()) {
      return;
    }

    if (this.loadState() === 'loading' || this.loadState() === 'ready') {
      return;
    }

    this.loadSettings();
  }

  protected loadSettings(): void {
    const restaurantId = this.authService.restaurantId();
    this.saveNotice.set(null);
    this.errorNotice.set(null);
    this.missingCounts.set(null);

    if (!restaurantId) {
      this.loadState.set('ready');
      this.settings.set(null);
      this.editor.set(null);
      return;
    }

    this.loadState.set('loading');

    this.localeApi
      .getRestaurantLocaleSettings(restaurantId)
      .pipe(
        catchError(() => {
          this.loadState.set('error');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((settings) => {
        if (!settings) {
          return;
        }

        this.applySettings(settings);
        this.loadState.set('ready');
      });
  }

  protected retryLoad(): void {
    this.loadState.set('idle');
    this.loadSettings();
  }

  protected onDefaultLocaleChange(value: string): void {
    const editor = this.editor();
    const settings = this.settings();
    if (!editor || !settings || this.isReadOnly()) {
      return;
    }

    const defaultLocale = value.trim().toLowerCase();
    const enabledByCode = { ...editor.enabledByCode };
    ensureDefaultLocaleEnabled(defaultLocale, enabledByCode);

    this.editor.set({
      ...editor,
      defaultLocale,
      enabledByCode,
    });
  }

  protected onTranslationModeChange(value: string): void {
    const editor = this.editor();
    if (!editor || this.isReadOnly()) {
      return;
    }

    this.editor.set({
      ...editor,
      translationMode: normalizeTranslationMode(value),
    });
  }

  protected toggleSupportedLocale(locale: LocaleMetadata, enabled: boolean): void {
    const editor = this.editor();
    if (!editor || this.isReadOnly()) {
      return;
    }

    if (locale.code === editor.defaultLocale && !enabled) {
      return;
    }

    this.editor.set({
      ...editor,
      enabledByCode: {
        ...editor.enabledByCode,
        [locale.code]: enabled,
      },
    });
  }

  protected saveSettings(): void {
    const restaurantId = this.authService.restaurantId();
    const settings = this.settings();
    const editor = this.editor();

    if (!restaurantId || !settings || !editor || this.isReadOnly()) {
      return;
    }

    this.saving.set(true);
    this.saveNotice.set(null);
    this.errorNotice.set(null);
    this.missingCounts.set(null);

    const payload = buildLocaleSettingsPayload(editor, settings.availableLocales);

    this.localeApi
      .updateRestaurantLocaleSettings(restaurantId, payload)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          this.applySettings(updated);
          this.saveNotice.set(this.localeService.uiText('profileLocaleSaved'));
        },
        error: (error: unknown) => {
          this.handleSaveError(error);
        },
      });
  }

  protected localeOptionLabel(locale: LocaleMetadata): string {
    return formatLocaleOptionLabel(locale);
  }

  protected directionBadge(locale: LocaleMetadata): string {
    const direction = this.directionService.getDirection(locale.code);
    return direction === 'rtl'
      ? this.localeService.uiText('profileLocaleDirectionRtl')
      : this.localeService.uiText('profileLocaleDirectionLtr');
  }

  protected primaryLocaleBadge(): string {
    return this.localeService.uiText('profileLocalePrimaryBadge');
  }

  protected isTranslationModeSelected(mode: TranslationModeOption): boolean {
    return this.editor()?.translationMode === mode;
  }

  protected translationModeLabel(mode: TranslationModeOption): string {
    switch (mode) {
      case 'ManualOnly':
        return this.localeService.uiText('profileTranslationModeManualOnly');
      case 'AutoGenerateDrafts':
        return this.localeService.uiText('profileTranslationModeAutoGenerateDrafts');
      case 'AutoPublish':
        return this.localeService.uiText('profileTranslationModeAutoPublish');
    }
  }

  protected translationModeDescription(mode: TranslationModeOption): string {
    switch (mode) {
      case 'ManualOnly':
        return this.localeService.uiText('profileTranslationModeManualOnlyDesc');
      case 'AutoGenerateDrafts':
        return this.localeService.uiText('profileTranslationModeAutoGenerateDraftsDesc');
      case 'AutoPublish':
        return this.localeService.uiText('profileTranslationModeAutoPublishDesc');
    }
  }

  protected missingCountsMessage(): string | null {
    const counts = this.missingCounts();
    if (!counts) {
      return null;
    }

    const parts = [
      `${this.localeService.uiText('profileLocaleMissingCountsRestaurant')}: ${counts.restaurant}`,
      `${this.localeService.uiText('profileLocaleMissingCountsCategories')}: ${counts.categories}`,
      `${this.localeService.uiText('profileLocaleMissingCountsMenuItems')}: ${counts.menuItems}`,
    ];

    return parts.join(' · ');
  }

  private applySettings(settings: RestaurantLocaleSettings): void {
    this.settings.set(settings);
    this.editor.set(createEditorStateFromSettings(settings));
    this.directionService.registerLocales(settings.availableLocales);
  }

  private handleSaveError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorNotice.set(this.localeService.uiText('profileLocaleSaveError'));
      return;
    }

    if (hasMissingTranslationErrors(error)) {
      this.errorNotice.set(this.localeService.uiText('profileLocaleMissingTranslations'));
      this.missingCounts.set(parseMissingTranslationCounts(error));
      return;
    }

    const detail =
      typeof error.error === 'object' &&
      error.error &&
      typeof (error.error as Record<string, unknown>)['detail'] === 'string'
        ? String((error.error as Record<string, unknown>)['detail'])
        : null;

    this.errorNotice.set(detail?.trim() || this.localeService.uiText('profileLocaleSaveError'));
  }
}
