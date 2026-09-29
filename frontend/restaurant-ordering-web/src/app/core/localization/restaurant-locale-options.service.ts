import { Injectable, inject, signal } from '@angular/core';

import { catchError, finalize, of } from 'rxjs';

import {

  FALLBACK_PREVIEW_LOCALES,

  ensurePreviewLocaleInList,

  resolveEnabledPreviewLocales,

} from '../../features/admin/restaurant-profile/data-access/restaurant-locale-settings.util';

import { LocaleApiService } from './locale-api.service';

import { DirectionService } from './direction.service';

import type { ContentLocale, LocaleMetadata } from './locale.types';

import { normalizeContentLocale } from './content-locale.util';



const CONTENT_LOCALE_STORAGE_KEY = 'restaurant-ordering.content-locale';



@Injectable({

  providedIn: 'root',

})

export class RestaurantLocaleOptionsService {

  private readonly localeApi = inject(LocaleApiService);

  private readonly directionService = inject(DirectionService);



  private readonly enabledLocalesSignal = signal<readonly LocaleMetadata[]>(FALLBACK_PREVIEW_LOCALES);

  private readonly activeContentLocaleSignal = signal<ContentLocale>(this.readStoredContentLocale());

  private readonly loadingSignal = signal(false);

  private loadedRestaurantId: string | null = null;



  readonly enabledLocales = this.enabledLocalesSignal.asReadonly();

  readonly activeContentLocale = this.activeContentLocaleSignal.asReadonly();

  readonly loading = this.loadingSignal.asReadonly();



  loadForRestaurant(restaurantId: string | null | undefined): void {

    const normalizedId = restaurantId?.trim() ?? '';

    if (!normalizedId) {

      this.loadedRestaurantId = null;

      this.enabledLocalesSignal.set(FALLBACK_PREVIEW_LOCALES);

      this.directionService.registerLocales(FALLBACK_PREVIEW_LOCALES);

      this.ensureActiveLocaleInEnabledList();

      return;

    }



    if (this.loadedRestaurantId === normalizedId && this.enabledLocalesSignal().length > 0) {

      this.ensureActiveLocaleInEnabledList();

      return;

    }



    this.loadingSignal.set(true);

    this.localeApi

      .getRestaurantLocaleSettings(normalizedId)

      .pipe(

        catchError(() => of(null)),

        finalize(() => this.loadingSignal.set(false)),

      )

      .subscribe((settings) => {

        this.loadedRestaurantId = normalizedId;

        const enabled = resolveEnabledPreviewLocales(settings);

        this.enabledLocalesSignal.set(enabled);

        if (settings?.availableLocales?.length) {

          this.directionService.registerLocales(settings.availableLocales);

        } else {

          this.directionService.registerLocales(enabled);

        }

        this.ensureActiveLocaleInEnabledList();

      });

  }



  selectContentLocale(localeCode: ContentLocale, options?: { persist?: boolean }): void {

    const normalized = normalizeContentLocale(localeCode) ?? ensurePreviewLocaleInList('', this.enabledLocalesSignal());

    const enabled = this.enabledLocalesSignal();

    const resolved = ensurePreviewLocaleInList(normalized, enabled);



    this.activeContentLocaleSignal.set(resolved);



    if (options?.persist !== false) {

      this.persistContentLocale(resolved);

    }

  }



  initializeFromQueryParam(lang: string | null | undefined): void {

    const normalized = normalizeContentLocale(lang);

    if (!normalized) {

      return;

    }



    this.selectContentLocale(normalized, { persist: false });

  }



  private ensureActiveLocaleInEnabledList(): void {

    const enabled = this.enabledLocalesSignal();

    const current = this.activeContentLocaleSignal();

    const resolved = ensurePreviewLocaleInList(current, enabled);

    if (resolved === current) {

      return;

    }



    this.selectContentLocale(resolved, { persist: false });

  }



  private readStoredContentLocale(): ContentLocale {

    try {

      const stored = normalizeContentLocale(localStorage.getItem(CONTENT_LOCALE_STORAGE_KEY));

      return stored ?? 'ar';

    } catch {

      return 'ar';

    }

  }



  private persistContentLocale(localeCode: ContentLocale): void {

    try {

      localStorage.setItem(CONTENT_LOCALE_STORAGE_KEY, localeCode);

    } catch {

      // Storage may be unavailable in private mode; ignore.

    }

  }

}


