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
} from '@angular/forms';
import {
  RESTAURANT_ACCENT_HEX_PATTERN,
  RestaurantThemeService,
} from '../../../../../core/theme/restaurant-theme';
import { LocaleService, type SupportedLocale } from '../../../../../core/localization/locale';
import { RestaurantLivePreview } from '../../components/restaurant-live-preview/restaurant-live-preview';
import { RestaurantProfileApiService } from '../../data-access/restaurant-profile-api';
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
} from '../../models/restaurant-profile.models';

@Component({
  selector: 'app-restaurant-profile-setup-page',
  imports: [ReactiveFormsModule, RestaurantLivePreview],
  templateUrl: './restaurant-profile-setup-page.html',
  styleUrl: './restaurant-profile-setup-page.scss',
})
export class RestaurantProfileSetupPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly profileApi = inject(RestaurantProfileApiService);
  protected readonly localeService = inject(LocaleService);
  private readonly themeService = inject(RestaurantThemeService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly saveNotice = signal<string | null>(null);
  protected readonly logoPreviewUrl = signal<string | null>(MOCK_PUBLIC_MENU.restaurant.logoUrl ?? null);
  protected readonly coverPreviewUrl = signal<string | null>(
    MOCK_PUBLIC_MENU.restaurant.coverImageUrl ?? null,
  );

  /**
   * Backend validation and ownership enforcement are required when wiring real saves.
   * Frontend validators below are UX-only.
   */
  readonly form = this.fb.group({
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
    currencyCode: this.fb.control(MOCK_PUBLIC_MENU.restaurant.currencyCode, [
      Validators.required,
      Validators.maxLength(3),
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
  });

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

    this.destroyRef.onDestroy(() => {
      revokeImagePreviewUrl(this.logoPreviewUrl());
      revokeImagePreviewUrl(this.coverPreviewUrl());
    });
  }

  protected onSlugBlur(): void {
    const control = this.form.controls.slug;
    control.setValue(normalizeSlugInput(control.value));
  }

  protected onLogoSelected(event: Event): void {
    this.handleImageSelection(event, (url) => {
      revokeImagePreviewUrl(this.logoPreviewUrl());
      this.logoPreviewUrl.set(url);
    });
  }

  protected onCoverSelected(event: Event): void {
    this.handleImageSelection(event, (url) => {
      revokeImagePreviewUrl(this.coverPreviewUrl());
      this.coverPreviewUrl.set(url);
    });
  }

  protected saveProfile(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const payload = this.buildFormValue();

    this.profileApi
      .saveProfile(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.saveNotice.set(this.localeService.uiText('demoSaveNotice'));
      });
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
    };
  }

  private handleImageSelection(event: Event, assign: (url: string) => void): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const previewUrl = file ? createImagePreviewUrl(file) : null;

    if (file && !previewUrl) {
      this.saveNotice.set(
        this.localeService.locale() === 'ar'
          ? 'نوع الملف أو حجمه غير مدعوم.'
          : 'Unsupported file type or size.',
      );
      input.value = '';
      return;
    }

    if (previewUrl) {
      assign(previewUrl);
    }

    input.value = '';
  }
}
