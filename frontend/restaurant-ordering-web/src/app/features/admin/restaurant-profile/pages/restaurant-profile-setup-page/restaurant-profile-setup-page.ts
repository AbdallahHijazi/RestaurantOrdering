import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { RestaurantProfileApiService } from '../../data-access/restaurant-profile-api';
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
} from '../../data-access/image-preview.util';
import { MOCK_PUBLIC_MENU } from '../../../../public-menu/data-access/public-menu-mock.data';
import type {
  RestaurantProfileFormValue,
  RestaurantProfilePreviewData,
  RestaurantSettingsSnapshot,
} from '../../models/restaurant-profile.models';

type PageLoadState = 'loading' | 'ready' | 'settings-error' | 'demo';

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
  protected readonly logoFileName = signal<string | null>(null);
  protected readonly coverFileName = signal<string | null>(null);
  protected readonly logoPreviewUrl = signal<string | null>(
    MOCK_PUBLIC_MENU.restaurant.logoUrl ?? null,
  );
  protected readonly coverPreviewUrl = signal<string | null>(
    MOCK_PUBLIC_MENU.restaurant.coverImageUrl ?? null,
  );

  private readonly settingsSnapshot = signal<RestaurantSettingsSnapshot>({
    workingHoursJson: null,
  });

  protected readonly canSaveSettings = computed(
    () => this.pageState() === 'ready' || this.pageState() === 'demo',
  );

  protected readonly settingsLoadFailed = computed(
    () => this.pageState() === 'settings-error',
  );

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

  protected onSlugBlur(): void {
    const control = this.form.controls.slug;
    control.setValue(normalizeSlugInput(control.value));
  }

  protected onLogoSelected(event: Event): void {
    this.handleImageSelection(event, (url, fileName) => {
      revokeImagePreviewUrl(this.logoPreviewUrl());
      this.logoPreviewUrl.set(url);
      this.logoFileName.set(fileName);
    });
  }

  protected onCoverSelected(event: Event): void {
    this.handleImageSelection(event, (url, fileName) => {
      revokeImagePreviewUrl(this.coverPreviewUrl());
      this.coverPreviewUrl.set(url);
      this.coverFileName.set(fileName);
    });
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
    this.savingProfile.set(true);
    this.profileSaveNotice.set(null);

    this.profileApi
      .saveRestaurantProfile(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.savingProfile.set(false);
          this.profileSaveNotice.set(
            result.mode === 'api'
              ? this.localeService.uiText('profileRestaurantSaved')
              : this.localeService.uiText('demoSaveNotice'),
          );
        },
        error: () => {
          this.savingProfile.set(false);
          this.profileSaveNotice.set(this.localeService.uiText('adminMenuErrorGeneric'));
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
      this.pageState.set('demo');
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
          this.pageState.set('ready');
        },
        error: () => {
          this.pageState.set('settings-error');
        },
      });
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

  private handleImageSelection(
    event: Event,
    assign: (url: string, fileName: string) => void,
  ): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const previewUrl = file ? createImagePreviewUrl(file) : null;

    if (file && !previewUrl) {
      this.profileSaveNotice.set(
        this.localeService.locale() === 'ar'
          ? 'نوع الملف أو حجمه غير مدعوم.'
          : 'Unsupported file type or size.',
      );
      input.value = '';
      return;
    }

    if (previewUrl && file) {
      assign(previewUrl, file.name);
    }

    input.value = '';
  }
}
