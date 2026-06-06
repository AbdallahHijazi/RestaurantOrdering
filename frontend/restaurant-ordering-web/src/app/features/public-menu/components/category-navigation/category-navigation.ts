import { Component, computed, inject, input, output } from '@angular/core';
import { LocaleService, type SupportedLocale } from '../../../../core/localization/locale';
import type { PublicMenuCategory } from '../../models/public-menu.models';

@Component({
  selector: 'app-category-navigation',
  templateUrl: './category-navigation.html',
  styleUrl: './category-navigation.scss',
})
export class CategoryNavigation {
  readonly categories = input.required<PublicMenuCategory[]>();
  readonly activeCategoryId = input.required<string>();
  readonly displayLocale = input<SupportedLocale | null>(null);

  readonly categorySelected = output<string>();

  protected readonly localeService = inject(LocaleService);

  protected readonly activeLocale = computed(
    () => this.displayLocale() ?? this.localeService.locale(),
  );

  protected readonly visibleCategories = computed(() =>
    [...this.categories()]
      .filter((category) => category.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder),
  );

  protected readonly categoryLabels = computed(() => {
    const locale = this.activeLocale();

    return new Map(
      this.visibleCategories().map((category) => [
        category.id,
        this.localeService.pickTextForLocale(
          locale,
          { ar: category.nameAr, en: category.nameEn },
          category.nameAr,
        ),
      ]),
    );
  });
}
