import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../../../../core/localization/locale';
import { AppIcon } from '../../../../shared/ui/icon/app-icon';

export interface PublicFooterCategory {
  id: string;
  title: string;
}

/**
 * Public menu footer. Everything shown comes from the restaurant's real public profile; a column or row
 * whose data is missing is simply not rendered (no empty columns, nothing invented).
 */
@Component({
  selector: 'app-public-menu-footer',
  imports: [RouterLink, AppIcon],
  templateUrl: './public-menu-footer.html',
  styleUrl: './public-menu-footer.scss',
})
export class PublicMenuFooter {
  protected readonly ui = inject(LocaleService).ui;

  readonly name = input.required<string>();
  readonly description = input<string | null>(null);
  readonly logoUrl = input<string | null>(null);
  readonly address = input<string | null>(null);
  readonly phone = input<string | null>(null);
  readonly whatsApp = input<string | null>(null);
  readonly categories = input<PublicFooterCategory[]>([]);

  readonly browseMenu = output<void>();
  readonly categorySelected = output<string>();

  protected readonly logoBroken = signal(false);
  protected readonly year = new Date().getFullYear();

  protected readonly initial = computed(() => this.name().trim().charAt(0) || '?');
  protected readonly cleanDescription = computed(() => this.description()?.trim() || null);
  protected readonly cleanAddress = computed(() => this.address()?.trim() || null);
  protected readonly cleanPhone = computed(() => this.phone()?.trim() || null);
  protected readonly cleanWhatsApp = computed(() => this.whatsApp()?.trim() || null);
  protected readonly hasContact = computed(
    () => !!(this.cleanAddress() || this.cleanPhone() || this.cleanWhatsApp()),
  );

  /** tel: accepts + and digits only. */
  protected readonly phoneHref = computed(() => {
    const phone = this.cleanPhone();
    return phone ? 'tel:' + phone.replace(/[^\d+]/g, '') : null;
  });

  /** wa.me wants the number as digits only, without a leading +. */
  protected readonly whatsAppHref = computed(() => {
    const digits = this.cleanWhatsApp()?.replace(/\D/g, '');
    return digits ? 'https://wa.me/' + digits : null;
  });

  protected onBrowse(event: Event): void {
    event.preventDefault();
    this.browseMenu.emit();
  }

  protected onCategory(event: Event, id: string): void {
    event.preventDefault();
    this.categorySelected.emit(id);
  }
}
