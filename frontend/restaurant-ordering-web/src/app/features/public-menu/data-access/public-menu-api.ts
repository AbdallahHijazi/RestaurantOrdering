import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import type { PublicMenuApiDto } from './public-menu.dto';
import { mapPublicMenuApiDto } from './public-menu.mapper';
import { DEMO_RESTAURANT_SLUG, MOCK_PUBLIC_MENU } from './public-menu-mock.data';
import type { PublicMenuPageData } from '../models/public-menu.models';

export type PublicMenuLoadError = 'not-found' | 'network' | 'unknown';

@Injectable({
  providedIn: 'root',
})
export class PublicMenuApiService {
  private readonly http = inject(HttpClient);

  getMenuBySlug(slug: string): Observable<PublicMenuPageData> {
    const normalizedSlug = slug.trim().toLowerCase();

    if (!normalizedSlug) {
      return throwError(() => ({ type: 'not-found' satisfies PublicMenuLoadError }));
    }

    return this.http
      .get<PublicMenuApiDto>(`${API_BASE_URL}/api/v1/public/restaurants/${normalizedSlug}/menu`)
      .pipe(
        map(mapPublicMenuApiDto),
        catchError((error: unknown) => this.handleError(normalizedSlug, error)),
      );
  }

  private handleError(slug: string, error: unknown): Observable<PublicMenuPageData> {
    if (slug === DEMO_RESTAURANT_SLUG) {
      if (typeof ngDevMode !== 'undefined' && ngDevMode) {
        console.warn('[PublicMenuApiService] Falling back to mock menu for demo slug.');
      }
      return of(structuredClone(MOCK_PUBLIC_MENU));
    }

    if (error instanceof HttpErrorResponse && error.status === 404) {
      return throwError(() => ({ type: 'not-found' satisfies PublicMenuLoadError }));
    }

    if (error instanceof HttpErrorResponse) {
      return throwError(() => ({ type: 'network' satisfies PublicMenuLoadError }));
    }

    return throwError(() => ({ type: 'unknown' satisfies PublicMenuLoadError }));
  }
}

/** @deprecated Use PublicMenuApiService */
export { PublicMenuApiService as PublicMenuApi };

declare const ngDevMode: boolean | undefined;
