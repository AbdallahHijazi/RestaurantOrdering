import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import { isDemoMenuSlug } from './public-menu-api';
import type {
  CreatePublicOrderApiRequest,
  PublicOrderConfirmationApiDto,
} from './public-order.dto';

export type PublicOrderSubmitError =
  | 'validation'
  | 'not-found'
  | 'conflict'
  | 'too-many-requests'
  | 'network'
  | 'preview'
  | 'unknown';

export interface PublicOrderSubmitFailure {
  type: PublicOrderSubmitError;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class PublicOrdersApiService {
  private readonly http = inject(HttpClient);

  createOrder(
    slug: string,
    request: CreatePublicOrderApiRequest,
  ): Observable<PublicOrderConfirmationApiDto> {
    const normalizedSlug = slug.trim().toLowerCase();

    if (!normalizedSlug) {
      return throwError(() => ({
        type: 'validation' satisfies PublicOrderSubmitError,
        message: '',
      } satisfies PublicOrderSubmitFailure));
    }

    if (isDemoMenuSlug(normalizedSlug)) {
      return throwError(() => ({
        type: 'preview' satisfies PublicOrderSubmitError,
        message: '',
      } satisfies PublicOrderSubmitFailure));
    }

    return this.http
      .post<PublicOrderConfirmationApiDto>(
        `${API_BASE_URL}/api/v1/public/restaurants/${normalizedSlug}/orders`,
        request,
      )
      .pipe(catchError((error: unknown) => throwError(() => this.mapError(error))));
  }

  private mapError(error: unknown): PublicOrderSubmitFailure {
    if (!(error instanceof HttpErrorResponse)) {
      return { type: 'unknown', message: '' };
    }

    if (error.status === 0) {
      return { type: 'network', message: '' };
    }

    const detail = this.readSafeDetail(error);

    switch (error.status) {
      case 400:
        return { type: 'validation', message: detail };
      case 404:
        return { type: 'not-found', message: detail };
      case 409:
        return { type: 'conflict', message: detail };
      case 429:
        return { type: 'too-many-requests', message: detail };
      default:
        return { type: 'unknown', message: detail };
    }
  }

  private readSafeDetail(error: HttpErrorResponse): string {
    const body = error.error;
    if (typeof body === 'string' && body.trim() && !body.includes('Exception')) {
      return body.trim();
    }

    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      if (typeof record['detail'] === 'string' && record['detail'].trim()) {
        return record['detail'].trim();
      }

      if (typeof record['title'] === 'string' && record['title'].trim()) {
        return record['title'].trim();
      }
    }

    return '';
  }
}
