import { Component, inject, input, output } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LocaleService } from '../../../../../../core/localization/locale';
import type { RestaurantTable } from '../../../../data-access/restaurant-tables.models';

@Component({
  selector: 'app-table-card',
  templateUrl: './table-card.html',
  styleUrl: './table-card.scss',
})
export class TableCard {
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly locale = inject(LocaleService);

  readonly table = input.required<RestaurantTable>();
  readonly qrSvg = input<string | null>(null);
  readonly qrLoading = input(false);

  readonly edit = output<RestaurantTable>();
  readonly toggleStatus = output<RestaurantTable>();
  readonly print = output<RestaurantTable>();
  readonly downloadQr = output<RestaurantTable>();
  readonly regenerateToken = output<RestaurantTable>();

  protected zoneLabel(table: RestaurantTable): string {
    return table.zone?.trim() || this.locale.uiText('tablesNoZone');
  }

  protected safeQrSvg(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
