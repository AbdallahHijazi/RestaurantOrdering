import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, tap, throwError, type Observable } from 'rxjs';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import {
  RESTAURANT_ACCENT_HEX_PATTERN,
  RestaurantThemeService,
} from '../../../../../core/theme/restaurant-theme';
import { LocaleService, type SupportedLocale } from '../../../../../core/localization/locale';
import { AuthService } from '../../../../../core/auth/auth.service';
import { RestaurantLivePreview } from '../../components/restaurant-live-preview/restaurant-live-preview';
import { AdminBrandingService } from '../../../../../core/layouts/admin-layout/admin-branding.service';
import { RestaurantProfileApiService, type BrandingSaveError } from '../../data-access/restaurant-profile-api';
import {
  createSettingsSnapshot,
  isCurrencyCodeValid,
  mapSettingsDtoToFormPatch,
} from '../../data-access/restaurant-profile-settings.util';
import {
  createImagePreviewUrl,
  normalizeSlugInput,
  revokeImagePreviewUrl,
  SLUG_PATTERN,
  validateImageFile,
} from '../../data-access/image-preview.util';
import { resolveApiAssetUrl } from '../../../../../core/config/resolve-api-asset-url';
import type { UploadedMediaFile } from '../../../data-access/admin-menu.models';
import type { RestaurantApiDto } from '../../../../public-menu/data-access/public-menu.dto';
import {
  PublicMenuApiService,
  type PublicMenuLoadError,
} from '../../../../public-menu/data-access/public-menu-api';
import { MOCK_PUBLIC_MENU } from '../../../../public-menu/data-access/public-menu-mock.data';
import type {
  PublicMenuCategory,
  PublicMenuItem,
} from '../../../../public-menu/models/public-menu.models';
import type {
  ProfilePreviewMenuState,
  RestaurantProfileFormValue,
  RestaurantProfilePreviewData,
  RestaurantSettingsSnapshot,
} from '../../models/restaurant-profile.models';

type PageLoadState = 'loading' | 'ready' | 'settings-error' | 'demo';
type ProfileSavePhase = 'idle' | 'uploading-logo' | 'uploading-cover' | 'saving';
type WorkspaceTab = 'identity' | 'localization' | 'contact' | 'delivery';

const WORKSPACE_TABS: WorkspaceTab[] = ['identity', 'localization', 'contact', 'delivery'];

const CURRENCY_CODE_PATTERN = /^[A-Za-z]{3}$/;

const PROFILE_CONTROL_NAMES = [
  'nameAr',
  'nameEn',
  'descriptionAr',
  'descriptionEn',
  'slug',
  'primaryAccentColor',
  'countryCode',
  'defaultLocale',
  'supportedLocales',
  'phoneCountryCode',
  'phoneNumber',
  'whatsAppNumber',
  'email',
  'city',
  'addressAr',
  'addressEn',
] as const;

const SETTINGS_CONTROL_NAMES = [
  'currencyCode',
  'timeZone',
  'isPickupEnabled',
  'isDeliveryEnabled',
  'deliveryFee',
  'minimumOrderAmount',
  'taxRate',
] as const;

function orderingMethodsValidator(control: AbstractControl): ValidationErrors | null {
  const pickup = control.get('isPickupEnabled')?.value === true;
  const delivery = control.get('isDeliveryEnabled')?.value === true;
  return pickup || delivery ? null : { orderingMethodRequired: true };
}

@Component({
  selector: 'app-restaurant-profile-setup-page',
  imports: [ReactiveFormsModule, RestaurantLivePreview],
  templateUrl: './restaurant-profile-setup-page.html',
  styleUrl: './restaurant-profile-setup-page.scss',
})
export class RestaurantProfileSetupPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly profileApi = inject(RestaurantProfileApiService);
  private readonly publicMenuApi = inject(PublicMenuApiService);
  private readonly authService = inject(AuthService);
  private readonly branding = inject(AdminBrandingService);
  protected readonly localeService = inject(LocaleService);
  private readonly themeService = inject(RestaurantThemeService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pageState = signal<PageLoadState>('loading');
  protected readonly profileSaveNotice = signal<string | null>(null);
  protected readonly settingsSaveNotice = signal<string | null>(null);
  protected readonly savingProfile = signal(false);
  protected readonly savingSettings = signal(false);
  protected readonly profileSavePhase = signal<ProfileSavePhase>('idle');
  protected readonly logoFileName = signal<string | null>(null);
  protected readonly coverFileName = signal<string | null>(null);
  protected readonly logoPreviewUrl = signal<string | null>(null);
  protected readonly coverPreviewUrl = signal<string | null>(null);
  private readonly pendingLogoFile = signal<File | null>(null);
  private readonly pendingCoverFile = signal<File | null>(null);
  private readonly uploadedLogoMedia = signal<UploadedMediaFile | null>(null);
  private readonly uploadedCoverMedia = signal<UploadedMediaFile | null>(null);
  private readonly persistedLogoFileId = signal<string | null>(null);

  private readonly settingsSnapshot = signal<RestaurantSettingsSnapshot>({
    workingHoursJson: null,
  });

  private readonly catalogSlug = signal('');

  protected readonly previewMenuState = signal<ProfilePreviewMenuState>('idle');
  protected readonly previewMenuCategories = signal<PublicMenuCategory[]>([]);
  protected readonly previewMenuItems = signal<PublicMenuItem[]>([]);

  protected readonly activeWorkspaceTab = signal<WorkspaceTab>('identity');
  /** No backend publish endpoint exists in the current API surface. */
  protected readonly publishAvailable = false;

  protected readonly hasUnsavedProfileChanges = computed(() => {
    this.formRevision();
    return (
      this.form.dirty ||
      this.pendingLogoFile() !== null ||
      this.pendingCoverFile() !== null ||
      this.uploadedLogoMedia() !== null ||
      this.uploadedCoverMedia() !== null
    );
  });

  protected readonly previewSyncStatus = computed<'synced' | 'unsaved'>(() =>
    this.hasUnsavedProfileChanges() ? 'unsaved' : 'synced',
  );

  protected readonly canSaveSettings = computed(
    () => this.pageState() === 'ready' || this.pageState() === 'demo',
  );

  protected readonly settingsLoadFailed = computed(
    () => this.pageState() === 'settings-error',
  );

  protected readonly workspaceTabs = WORKSPACE_TABS;

  protected workspaceTabLabel(tab: WorkspaceTab): string {
    switch (tab) {
      case 'identity':
        return this.localeService.uiText('profileTabIdentity');
      case 'localization':
        return this.localeService.uiText('profileTabLocalization');
      case 'contact':
        return this.localeService.uiText('profileTabContact');
      case 'delivery':
        return this.localeService.uiText('profileTabDelivery');
    }
  }

  protected workspaceTabPanelId(tab: WorkspaceTab): string {
    return `profile-tabpanel-${tab}`;
  }

  protected selectWorkspaceTab(tab: WorkspaceTab): void {
    this.activeWorkspaceTab.set(tab);
  }

  protected onWorkspaceTabKeydown(event: KeyboardEvent, tab: WorkspaceTab, index: number): void {
    const tabs = WORKSPACE_TABS;
    let nextIndex = index;

    switch (event.key) {
      case 'ArrowRight': {
        const step = this.localeService.direction() === 'rtl' ? -1 : 1;
        nextIndex = (index + step + tabs.length) % tabs.length;
        break;
      }
      case 'ArrowLeft': {
        const step = this.localeService.direction() === 'rtl' ? 1 : -1;
        nextIndex = (index + step + tabs.length) % tabs.length;
        break;
      }
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.selectWorkspaceTab(tabs[nextIndex]);
    const nextTabId = `profile-tab-${tabs[nextIndex]}`;
    document.getElementById(nextTabId)?.focus();
  }

  protected onAccentColorPicked(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toUpperCase();
    this.form.controls.primaryAccentColor.setValue(value);
    this.form.controls.primaryAccentColor.markAsDirty();
  }

  protected accentColorPickerValue(): string {
    return this.themeService.sanitizeAccentColor(this.form.controls.primaryAccentColor.value);
  }

  protected isUploadingBranding(): boolean {
    const phase = this.profileSavePhase();
    return phase === 'uploading-logo' || phase === 'uploading-cover';
  }

  /**
   * Backend validation and ownership enforcement are required when wiring real saves.
   * Frontend validators below are UX-only.
   */
  readonly form = this.fb.group(
    {
      nameAr: this.fb.control(MOCK_PUBLIC_MENU.restaurant.nameAr, [
        Validators.required,
        Validators.maxLength(120),
      ]),
      nameEn: this.fb.control(MOCK_PUBLIC_MENU.restaurant.nameEn ?? '', [
        Validators.maxLength(120),
      ]),
      descriptionAr: this.fb.control(MOCK_PUBLIC_MENU.restaurant.descriptionAr ?? '', [
        Validators.maxLength(500),
      ]),
      descriptionEn: this.fb.control(MOCK_PUBLIC_MENU.restaurant.descriptionEn ?? '', [
        Validators.maxLength(500),
      ]),
      slug: this.fb.control(MOCK_PUBLIC_MENU.restaurant.slug, [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(80),
        Validators.pattern(SLUG_PATTERN),
      ]),
      primaryAccentColor: this.fb.control(
        MOCK_PUBLIC_MENU.restaurant.primaryAccentColor ?? '#B8663F',
        [Validators.required, Validators.pattern(RESTAURANT_ACCENT_HEX_PATTERN)],
      ),
      countryCode: this.fb.control(MOCK_PUBLIC_MENU.restaurant.countryCode, [
        Validators.required,
        Validators.maxLength(2),
      ]),
      defaultLocale: this.fb.control<'ar' | 'en'>('ar', Validators.required),
      supportedLocales: this.fb.control<SupportedLocale[]>(
        ['ar', 'en'] as SupportedLocale[],
        Validators.required,
      ),
      currencyCode: this.fb.control(MOCK_PUBLIC_MENU.orderSettings.currencyCode, [
        Validators.required,
        Validators.pattern(CURRENCY_CODE_PATTERN),
      ]),
      timeZone: this.fb.control(MOCK_PUBLIC_MENU.restaurant.timeZone ?? 'Asia/Riyadh', [
        Validators.required,
        Validators.maxLength(80),
      ]),
      phoneCountryCode: this.fb.control('+966', [Validators.required, Validators.maxLength(5)]),
      phoneNumber: this.fb.control(MOCK_PUBLIC_MENU.restaurant.phoneNumber ?? '', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(20),
      ]),
      whatsAppNumber: this.fb.control(MOCK_PUBLIC_MENU.restaurant.whatsAppNumber ?? '', [
        Validators.maxLength(20),
      ]),
      email: this.fb.control('', [Validators.email, Validators.maxLength(120)]),
      city: this.fb.control('', [Validators.maxLength(80)]),
      addressAr: this.fb.control(MOCK_PUBLIC_MENU.restaurant.addressAr ?? '', [
        Validators.maxLength(200),
      ]),
      addressEn: this.fb.control(MOCK_PUBLIC_MENU.restaurant.addressEn ?? '', [
        Validators.maxLength(200),
      ]),
      isPickupEnabled: this.fb.control(MOCK_PUBLIC_MENU.orderSettings.isPickupEnabled),
      isDeliveryEnabled: this.fb.control(MOCK_PUBLIC_MENU.orderSettings.isDeliveryEnabled),
      deliveryFee: this.fb.control(MOCK_PUBLIC_MENU.orderSettings.deliveryFee, [
        Validators.min(0),
      ]),
      minimumOrderAmount: this.fb.control(MOCK_PUBLIC_MENU.orderSettings.minimumOrderAmount, [
        Validators.min(0),
      ]),
      taxRate: this.fb.control(MOCK_PUBLIC_MENU.orderSettings.taxRate, [
        Validators.min(0),
        Validators.max(100),
      ]),
    },
    { validators: [orderingMethodsValidator] },
  );

  private readonly formRevision = signal(0);

  protected readonly previewData = computed<RestaurantProfilePreviewData>(() => {
    this.formRevision();
    const value = this.form.getRawValue();
    return {
      slug: normalizeSlugInput(value.slug),
      nameAr: value.nameAr.trim(),
      nameEn: value.nameEn.trim() || null,
      descriptionAr: value.descriptionAr.trim() || null,
      descriptionEn: value.descriptionEn.trim() || null,
      logoUrl: this.logoPreviewUrl(),
      coverImageUrl: this.coverPreviewUrl(),
      primaryAccentColor: value.primaryAccentColor.trim(),
      countryCode: value.countryCode.trim().toUpperCase(),
      currencyCode: value.currencyCode.trim().toUpperCase(),
      timeZone: value.timeZone.trim(),
      phoneNumber: value.phoneNumber.trim(),
      whatsAppNumber: value.whatsAppNumber.trim() || null,
      addressAr: value.addressAr.trim() || null,
      addressEn: value.addressEn.trim() || null,
    };
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.formRevision.update((value) => value + 1);
    });

    effect(() => {
      this.themeService.applyAccent(this.previewData().primaryAccentColor);
    });

    effect(() => {
      const data = this.previewData();
      this.branding.updateBranding({
        logoUrl: data.logoUrl ?? null,
        coverImageUrl: data.coverImageUrl ?? null,
        nameAr: data.nameAr,
        nameEn: data.nameEn ?? null,
      });
    });

    this.destroyRef.onDestroy(() => {
      revokeImagePreviewUrl(this.logoPreviewUrl());
      revokeImagePreviewUrl(this.coverPreviewUrl());
      document.body.style.overflow = '';
    });

    this.loadProfile();
  }

  protected retryLoadSettings(): void {
    this.loadProfile();
  }

  protected refreshPreviewMenu(): void {
    if (this.pageState() === 'demo') {
      this.applyDemoPreviewCatalog();
      return;
    }

    const slug = this.catalogSlug().trim();
    if (slug) {
      this.loadPreviewMenu(slug);
    }
  }

  protected onSlugBlur(): void {
    const control = this.form.controls.slug;
    control.setValue(normalizeSlugInput(control.value));
  }

  protected onLogoSelected(event: Event): void {
    this.handleImageSelection(event, 'logo', (url, fileName) => {
      revokeImagePreviewUrl(this.logoPreviewUrl());
      this.logoPreviewUrl.set(url);
      this.logoFileName.set(fileName);
    });
  }

  protected onCoverSelected(event: Event): void {
    this.handleImageSelection(event, 'cover', (url, fileName) => {
      revokeImagePreviewUrl(this.coverPreviewUrl());
      this.coverPreviewUrl.set(url);
      this.coverFileName.set(fileName);
    });
  }

  protected profileSaveLabel(): string {
    switch (this.profileSavePhase()) {
      case 'uploading-logo':
        return this.localeService.uiText('profileUploadingLogo');
      case 'uploading-cover':
        return this.localeService.uiText('profileUploadingCoverImage');
      case 'saving':
        return this.localeService.uiText('profileSavingRestaurant');
      default:
        return this.savingProfile()
          ? this.localeService.uiText('profileSavingRestaurant')
          : this.localeService.uiText('profileSaveRestaurant');
    }
  }

  protected chooseImageLabel(): string {
    return this.localeService.locale() === 'ar' ? 'اختر صورة' : 'Choose image';
  }

  protected noFileChosenLabel(): string {
    return this.localeService.locale() === 'ar' ? 'لم يتم اختيار ملف' : 'No file chosen';
  }

  protected fieldError(controlName: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[controlName];
    if (!control.touched && !this.form.touched) {
      return null;
    }

    if (controlName === 'taxRate' && (control.hasError('min') || control.hasError('max'))) {
      return this.localeService.uiText('profileValidationTaxRate');
    }

    if (
      (controlName === 'deliveryFee' || controlName === 'minimumOrderAmount') &&
      control.hasError('min')
    ) {
      return this.localeService.uiText('profileValidationNonNegative');
    }

    if (controlName === 'currencyCode' && control.invalid) {
      const raw = String(control.value ?? '');
      if (/[$€£¥]/.test(raw) || /[^A-Za-z]/.test(raw.trim())) {
        return this.localeService.uiText('profileValidationCurrencySymbol');
      }

      return this.localeService.uiText('profileValidationCurrency');
    }

    return null;
  }

  protected orderingMethodError(): boolean {
    return this.form.hasError('orderingMethodRequired');
  }

  protected saveRestaurantProfile(): void {
    this.markControlsTouched(PROFILE_CONTROL_NAMES);

    if (!this.canSaveSettings() || !this.isControlGroupValid(PROFILE_CONTROL_NAMES)) {
      return;
    }

    const payload = this.buildFormValue();
    const restaurantId = this.authService.restaurantId();
    if (!restaurantId) {
      this.profileApi
        .saveRestaurantProfile(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.profileSaveNotice.set(this.localeService.uiText('demoSaveNotice'));
          },
        });
      return;
    }

    this.savingProfile.set(true);
    this.profileSavePhase.set(
      this.pendingLogoFile() ? 'uploading-logo' : this.pendingCoverFile() ? 'uploading-cover' : 'saving',
    );
    this.profileSaveNotice.set(null);

    this.ensureLogoUploaded(restaurantId)
      .pipe(
        switchMap((uploadedLogo) =>
          this.ensureCoverUploaded(restaurantId).pipe(
            map((uploadedCover) => ({ uploadedLogo, uploadedCover })),
          ),
        ),
        switchMap(({ uploadedLogo, uploadedCover }) => {
          this.profileSavePhase.set('saving');
          return this.profileApi.updateRestaurant(
            restaurantId,
            this.profileApi.toUpdateRestaurantRequest(payload),
          ).pipe(
            switchMap((restaurant) => {
              const logoLink$ = uploadedLogo
                ? this.profileApi.setRestaurantLogo(restaurantId, uploadedLogo.id)
                : of(restaurant);
              return logoLink$.pipe(
                switchMap((afterLogo) => {
                  if (!uploadedCover) {
                    return of({ restaurant: afterLogo, uploadedLogo, uploadedCover });
                  }

                  return this.profileApi
                    .setRestaurantCoverImage(restaurantId, uploadedCover.id)
                    .pipe(
                      map((afterCover) => ({
                        restaurant: afterCover,
                        uploadedLogo,
                        uploadedCover,
                      })),
                    );
                }),
              );
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          if (result.uploadedLogo) {
            this.uploadedLogoMedia.set(result.uploadedLogo);
            this.pendingLogoFile.set(null);
          }
          if (result.uploadedCover) {
            this.uploadedCoverMedia.set(result.uploadedCover);
            this.pendingCoverFile.set(null);
          }

          this.applyBrandingAfterSave(result);
          this.catalogSlug.set(payload.slug);
          this.savingProfile.set(false);
          this.profileSavePhase.set('idle');
          this.form.markAsPristine();
          this.uploadedLogoMedia.set(null);
          this.uploadedCoverMedia.set(null);
          this.profileSaveNotice.set(this.localeService.uiText('profileRestaurantSaved'));
          this.reloadProfileAfterSave(payload.slug);
        },
        error: (error: { type?: BrandingSaveError }) => {
          this.savingProfile.set(false);
          this.profileSavePhase.set('idle');
          this.profileSaveNotice.set(this.brandingErrorMessage(error?.type));
        },
      });
  }

  private ensureLogoUploaded(restaurantId: string): Observable<UploadedMediaFile | null> {
    const cached = this.uploadedLogoMedia();
    if (cached) {
      return of(cached);
    }

    const pending = this.pendingLogoFile();
    if (!pending) {
      return of(null);
    }

    this.profileSavePhase.set('uploading-logo');
    return this.profileApi.uploadMedia(restaurantId, pending).pipe(
      tap((media) => this.uploadedLogoMedia.set(media)),
      catchError(() => throwError(() => ({ type: 'logo-upload' satisfies BrandingSaveError }))),
    );
  }

  private ensureCoverUploaded(restaurantId: string): Observable<UploadedMediaFile | null> {
    const cached = this.uploadedCoverMedia();
    if (cached) {
      return of(cached);
    }

    const pending = this.pendingCoverFile();
    if (!pending) {
      return of(null);
    }

    this.profileSavePhase.set('uploading-cover');
    return this.profileApi.uploadMedia(restaurantId, pending).pipe(
      tap((media) => this.uploadedCoverMedia.set(media)),
      catchError(() => throwError(() => ({ type: 'cover-upload' satisfies BrandingSaveError }))),
    );
  }

  private brandingErrorMessage(type?: BrandingSaveError): string {
    switch (type) {
      case 'logo-upload':
        return this.localeService.uiText('profileLogoUploadFailed');
      case 'cover-upload':
        return this.localeService.uiText('profileCoverUploadFailed');
      default:
        return this.localeService.uiText('adminMenuErrorGeneric');
    }
  }

  private applyBrandingAfterSave(
    result: {
      restaurant: RestaurantApiDto;
      uploadedLogo: UploadedMediaFile | null;
      uploadedCover: UploadedMediaFile | null;
    },
  ): void {
    this.applyBrandingFromRestaurant(result.restaurant);
  }

  private reloadProfileAfterSave(slug: string): void {
    const restaurantId = this.authService.restaurantId();
    if (!restaurantId) {
      return;
    }

    this.profileApi
      .loadProfile(restaurantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ restaurant, settings }) => {
          this.form.patchValue({
            nameAr: restaurant.nameAr,
            nameEn: restaurant.nameEn ?? '',
            descriptionAr: restaurant.descriptionAr ?? '',
            descriptionEn: restaurant.descriptionEn ?? '',
            slug: restaurant.slug,
            phoneNumber: restaurant.phoneNumber,
            whatsAppNumber: restaurant.whatsAppNumber ?? '',
            addressAr: restaurant.addressAr ?? '',
            addressEn: restaurant.addressEn ?? '',
            ...mapSettingsDtoToFormPatch(settings),
          });
          this.settingsSnapshot.set(createSettingsSnapshot(settings));
          this.applyBrandingFromRestaurant(restaurant);
          this.form.markAsPristine();
          this.loadPreviewMenu(slug);
        },
        error: () => {
          this.profileSaveNotice.set(this.localeService.uiText('profileReloadFailed'));
          this.loadPreviewMenu(slug);
        },
      });
  }

  protected saveOrderingSettings(): void {
    this.markControlsTouched(SETTINGS_CONTROL_NAMES);

    if (!this.canSaveSettings() || this.pageState() === 'settings-error') {
      return;
    }

    if (!this.isControlGroupValid(SETTINGS_CONTROL_NAMES) || this.orderingMethodError()) {
      return;
    }

    const payload = this.buildFormValue();
    if (!isCurrencyCodeValid(payload.currencyCode)) {
      return;
    }

    this.savingSettings.set(true);
    this.settingsSaveNotice.set(null);

    this.profileApi
      .saveOrderingSettings(payload, this.settingsSnapshot())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.savingSettings.set(false);
          this.settingsSaveNotice.set(
            result.mode === 'api'
              ? this.localeService.uiText('profileSettingsSaved')
              : this.localeService.uiText('demoSaveNotice'),
          );
        },
        error: () => {
          this.savingSettings.set(false);
          this.settingsSaveNotice.set(this.localeService.uiText('adminMenuErrorGeneric'));
        },
      });
  }

  private markControlsTouched(controlNames: readonly (keyof typeof this.form.controls)[]): void {
    for (const name of controlNames) {
      this.form.controls[name].markAsTouched();
    }
  }

  private isControlGroupValid(
    controlNames: readonly (keyof typeof this.form.controls)[],
  ): boolean {
    return controlNames.every((name) => this.form.controls[name].valid);
  }

  private loadProfile(): void {
    const restaurantId = this.authService.restaurantId();
    if (!restaurantId) {
      this.applyMockOrderingDefaults();
      this.logoPreviewUrl.set(MOCK_PUBLIC_MENU.restaurant.logoUrl ?? null);
      this.coverPreviewUrl.set(MOCK_PUBLIC_MENU.restaurant.coverImageUrl ?? null);
      this.pageState.set('demo');
      this.applyDemoPreviewCatalog();
      return;
    }

    this.pageState.set('loading');
    this.profileApi
      .loadProfile(restaurantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ restaurant, settings }) => {
          this.form.patchValue({
            nameAr: restaurant.nameAr,
            nameEn: restaurant.nameEn ?? '',
            descriptionAr: restaurant.descriptionAr ?? '',
            descriptionEn: restaurant.descriptionEn ?? '',
            slug: restaurant.slug,
            phoneNumber: restaurant.phoneNumber,
            whatsAppNumber: restaurant.whatsAppNumber ?? '',
            addressAr: restaurant.addressAr ?? '',
            addressEn: restaurant.addressEn ?? '',
            ...mapSettingsDtoToFormPatch(settings),
          });
          this.settingsSnapshot.set(createSettingsSnapshot(settings));
          this.catalogSlug.set(restaurant.slug);
          this.applyBrandingFromRestaurant(restaurant);
          this.pageState.set('ready');
          this.form.markAsPristine();
          this.loadPreviewMenu(restaurant.slug);
        },
        error: () => {
          this.pageState.set('settings-error');
        },
      });
  }

  private loadPreviewMenu(slug: string): void {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) {
      this.previewMenuState.set('idle');
      this.previewMenuCategories.set([]);
      this.previewMenuItems.set([]);
      return;
    }

    this.previewMenuState.set('loading');

    this.publicMenuApi
      .getMenuBySlug(normalized)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.previewMenuCategories.set(data.categories);
          this.previewMenuItems.set(data.items);
          this.previewMenuState.set(
            data.categories.length === 0 || data.items.length === 0 ? 'empty' : 'loaded',
          );
        },
        error: (error: { type?: PublicMenuLoadError }) => {
          this.previewMenuCategories.set([]);
          this.previewMenuItems.set([]);
          this.previewMenuState.set('error');

          if (typeof ngDevMode !== 'undefined' && ngDevMode) {
            console.error('[RestaurantProfileSetupPage] Failed to load preview menu', error);
          }
        },
      });
  }

  private applyDemoPreviewCatalog(): void {
    this.previewMenuCategories.set(structuredClone(MOCK_PUBLIC_MENU.categories));
    this.previewMenuItems.set(structuredClone(MOCK_PUBLIC_MENU.items));
    this.previewMenuState.set('demo');
  }

  private applyMockOrderingDefaults(): void {
    this.form.patchValue({
      currencyCode: MOCK_PUBLIC_MENU.orderSettings.currencyCode,
      taxRate: MOCK_PUBLIC_MENU.orderSettings.taxRate,
      deliveryFee: MOCK_PUBLIC_MENU.orderSettings.deliveryFee,
      minimumOrderAmount: MOCK_PUBLIC_MENU.orderSettings.minimumOrderAmount,
      isDeliveryEnabled: MOCK_PUBLIC_MENU.orderSettings.isDeliveryEnabled,
      isPickupEnabled: MOCK_PUBLIC_MENU.orderSettings.isPickupEnabled,
    });
    this.settingsSnapshot.set({ workingHoursJson: null });
  }

  private buildFormValue(): RestaurantProfileFormValue {
    const value = this.form.getRawValue();
    return {
      nameAr: value.nameAr.trim(),
      nameEn: value.nameEn.trim(),
      descriptionAr: value.descriptionAr.trim(),
      descriptionEn: value.descriptionEn.trim(),
      slug: normalizeSlugInput(value.slug),
      logoUrl: this.logoPreviewUrl(),
      coverImageUrl: this.coverPreviewUrl(),
      primaryAccentColor: value.primaryAccentColor.trim(),
      countryCode: value.countryCode.trim().toUpperCase(),
      defaultLocale: value.defaultLocale,
      supportedLocales: value.supportedLocales,
      currencyCode: value.currencyCode.trim().toUpperCase(),
      timeZone: value.timeZone.trim(),
      phoneCountryCode: value.phoneCountryCode.trim(),
      phoneNumber: value.phoneNumber.trim(),
      whatsAppNumber: value.whatsAppNumber.trim(),
      email: value.email.trim(),
      city: value.city.trim(),
      addressAr: value.addressAr.trim(),
      addressEn: value.addressEn.trim(),
      isPickupEnabled: value.isPickupEnabled,
      isDeliveryEnabled: value.isDeliveryEnabled,
      deliveryFee: Number(value.deliveryFee),
      minimumOrderAmount: Number(value.minimumOrderAmount),
      taxRate: Number(value.taxRate),
    };
  }

  private applyBrandingFromRestaurant(restaurant: RestaurantApiDto): void {
    this.persistedLogoFileId.set(restaurant.logoFileId ?? null);

    if (!this.pendingLogoFile()) {
      revokeImagePreviewUrl(this.logoPreviewUrl());
      this.logoPreviewUrl.set(resolveApiAssetUrl(restaurant.logoUrl ?? null));
    }

    if (!this.pendingCoverFile()) {
      revokeImagePreviewUrl(this.coverPreviewUrl());
      this.coverPreviewUrl.set(resolveApiAssetUrl(restaurant.coverImageUrl ?? null));
    }

    if (restaurant.accentColor) {
      this.form.patchValue({ primaryAccentColor: restaurant.accentColor });
    }
  }

  private handleImageSelection(
    event: Event,
    kind: 'logo' | 'cover',
    assign: (url: string, fileName: string) => void,
  ): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      input.value = '';
      return;
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      this.profileSaveNotice.set(
        validation.reason === 'size'
          ? this.localeService.uiText('profileImageTooLarge')
          : this.localeService.uiText('profileUnsupportedImageType'),
      );
      input.value = '';
      return;
    }

    const previewUrl = createImagePreviewUrl(file);
    if (!previewUrl) {
      this.profileSaveNotice.set(this.localeService.uiText('profileUnsupportedImageType'));
      input.value = '';
      return;
    }

    if (kind === 'logo') {
      this.pendingLogoFile.set(file);
      this.uploadedLogoMedia.set(null);
    } else {
      this.pendingCoverFile.set(file);
      this.uploadedCoverMedia.set(null);
    }

    assign(previewUrl, file.name);
    input.value = '';
  }
}

declare const ngDevMode: boolean | undefined;
