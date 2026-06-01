import { Component, computed, inject, input, output } from '@angular/core';
import { LocaleService } from '../../../../core/localization/locale';
import type { PublicMenuCategory } from '../../models/public-menu.models';

@Component({
  selector: 'app-category-navigation',
  templateUrl: './category-navigation.html',
  styleUrl: './category-navigation.scss',
})
export class CategoryNavigation {
  readonly categories = input.required<PublicMenuCategory[]>();
  readonly activeCategoryId = input.required<string>();

  readonly categorySelected = output<string>();

  protected readonly localeService = inject(LocaleService);

  protected readonly visibleCategories = computed(() =>
    [...this.categories()]
      .filter((category) => category.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder),
  );

  protected readonly categoryLabels = computed(() => {
    this.localeService.locale();

    return new Map(
      this.visibleCategories().map((category) => [
        category.id,
        this.localeService.pickText(
          { ar: category.nameAr, en: category.nameEn },
          category.nameAr,
        ),
      ]),
    );
  });
}
