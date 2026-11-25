import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import type { ResolvedPublicTable } from './public-tables.models';

@Injectable({
  providedIn: 'root',
})
export class PublicTablesApiService {
  private readonly http = inject(HttpClient);

  resolveTable(slug: string, token: string): Observable<ResolvedPublicTable> {
    const normalizedSlug = slug.trim().toLowerCase();
    const normalizedToken = token.trim();

    return this.http.get<ResolvedPublicTable>(
      `${API_BASE_URL}/api/v1/public/restaurants/${normalizedSlug}/tables/resolve`,
      { params: { token: normalizedToken } },
    );
  }
}
