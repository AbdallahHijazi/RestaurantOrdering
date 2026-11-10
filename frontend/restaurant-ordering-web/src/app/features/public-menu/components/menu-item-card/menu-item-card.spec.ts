import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocaleService } from '../../../../core/localization/locale';
import { MenuItemCard } from './menu-item-card';

describe('MenuItemCard', () => {
  let fixture: ComponentFixture<MenuItemCard>;
  let component: MenuItemCard;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuItemCard],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuItemCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('item', {
      id: '1',
      categoryId: 'cat-1',
      nameAr: 'طبق',
      nameEn: 'Dish',
      descriptionAr: 'وصف',
      descriptionEn: 'Description',
      price: 25,
      isAvailable: true,
    });
    fixture.detectChanges();
  });

  it('disables add for unavailable items', () => {
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('en');

    fixture.componentRef.setInput('item', {
      id: '2',
      categoryId: 'cat-1',
      nameAr: 'طبق',
      nameEn: 'Dish',
      price: 25,
      isAvailable: false,
    });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="public-menu-add-to-cart"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Add to cart');
    expect(fixture.nativeElement.textContent).toContain('Unavailable');
  });

  it('emits added when the add button is clicked', () => {
    const emitted: unknown[] = [];
    component.added.subscribe((value) => emitted.push(value));

    component['addItem']();
    expect(emitted).toHaveLength(1);
  });

  it('updates visible text when locale changes', () => {
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('ar');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('طبق');

    locale.setLocale('en');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Dish');
  });

  it('shows secondary name and strikethrough price for valid discounts', () => {
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('en');

    fixture.componentRef.setInput('item', {
      id: '3',
      categoryId: 'cat-1',
      nameAr: 'طبق',
      nameEn: 'Dish',
      price: 30,
      discountPrice: 24,
      isAvailable: true,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('طبق');
    expect(fixture.nativeElement.querySelector('.public-menu-card__price--original')).toBeTruthy();
  });
});
