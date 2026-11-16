import { Component, inject, input, output } from '@angular/core';
import { LocaleService } from '../../../../../../core/localization/locale';
import type { RestaurantTable } from '../../../../data-access/restaurant-tables.models';
import { TablePrintCard } from '../table-print-card/table-print-card';
import { IconButton } from '../../../../../../shared/ui/icon-button/icon-button';

@Component({
  selector: 'app-table-card',
  imports: [TablePrintCard, IconButton],
  templateUrl: './table-card.html',
  styleUrl: './table-card.scss',
})
export class TableCard {
  protected readonly locale = inject(LocaleService);

  readonly table = input.required<RestaurantTable>();
  readonly restaurantName = input.required<string>();
  readonly restaurantLogoUrl = input<string | null>(null);
  readonly brandInitial = input('?');
  readonly qrSvg = input<string | null>(null);
  readonly qrLoading = input(false);

  readonly edit = output<RestaurantTable>();
  readonly toggleStatus = output<RestaurantTable>();
  readonly print = output<RestaurantTable>();
  readonly downloadQr = output<RestaurantTable>();
  readonly regenerateToken = output<RestaurantTable>();
  readonly archive = output<RestaurantTable>();

  protected zoneLabel(table: RestaurantTable): string {
    return table.zone?.trim() || this.locale.uiText('tablesNoZone');
  }
}
