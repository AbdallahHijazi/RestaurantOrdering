import { Component, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LocaleService } from '../../../../../../core/localization/locale';
import type { RestaurantTable } from '../../../../data-access/restaurant-tables.models';

export type TableQrCardVariant = 'preview' | 'print';

@Component({
  selector: 'app-table-print-card',
  templateUrl: './table-print-card.html',
  styleUrl: './table-print-card.scss',
})
export class TablePrintCard {
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly locale = inject(LocaleService);

  readonly variant = input<TableQrCardVariant>('print');
  readonly table = input.required<RestaurantTable>();
  readonly restaurantName = input.required<string>();
  readonly restaurantLogoUrl = input<string | null>(null);
  readonly brandInitial = input('?');
  readonly qrSvg = input('');
  readonly qrLoading = input(false);

  private readonly logoFailed = signal(false);

  protected showLogo(): boolean {
    const url = this.restaurantLogoUrl()?.trim();
    return Boolean(url) && !this.logoFailed();
  }

  protected onLogoError(): void {
    this.logoFailed.set(true);
  }

  protected safeQrSvg(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.qrSvg());
  }

  protected zoneLabel(table: RestaurantTable): string {
    return table.zone?.trim() || this.locale.uiText('tablesNoZone');
  }
}
