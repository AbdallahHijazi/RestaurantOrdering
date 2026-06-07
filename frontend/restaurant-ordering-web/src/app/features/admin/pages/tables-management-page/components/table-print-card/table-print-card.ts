import { Component, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LocaleService } from '../../../../../../core/localization/locale';
import type { RestaurantTable } from '../../../../data-access/restaurant-tables.models';

@Component({
  selector: 'app-table-print-card',
  templateUrl: './table-print-card.html',
  styleUrl: './table-print-card.scss',
})
export class TablePrintCard {
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly locale = inject(LocaleService);

  readonly table = input.required<RestaurantTable>();
  readonly restaurantName = input.required<string>();
  readonly qrSvg = input.required<string>();
  readonly menuUrl = input.required<string>();

  protected safeQrSvg(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.qrSvg());
  }

  protected zoneLabel(table: RestaurantTable): string {
    return table.zone?.trim() || this.locale.uiText('tablesNoZone');
  }
}
