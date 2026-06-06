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

  it('disables add for sold out items', () => {
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

    const button = fixture.nativeElement.querySelector('.menu-item-card__btn') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Sold Out');
  });

  it('increases quantity locally on add', () => {
    const emitted: number[] = [];
    component.quantityChange.subscribe((value) => emitted.push(value));

    component['addItem']();
    expect(emitted).toEqual([1]);
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

  it('uses displayLocale for labels without changing admin locale', () => {
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('en');
    fixture.componentRef.setInput('displayLocale', 'ar');
    fixture.componentRef.setInput('quantity', 1);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('طبق');
    const decreaseButton = fixture.nativeElement.querySelector(
      '.menu-item-card__qty-btn:first-child',
    ) as HTMLButtonElement;
    expect(decreaseButton.getAttribute('aria-label')).toBe('إنقاص');
    expect(locale.locale()).toBe('en');
  });
});
