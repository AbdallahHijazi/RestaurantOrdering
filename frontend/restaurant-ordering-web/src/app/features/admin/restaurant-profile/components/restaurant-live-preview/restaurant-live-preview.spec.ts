import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocaleService } from '../../../../../core/localization/locale';
import { MOCK_PUBLIC_MENU } from '../../../../public-menu/data-access/public-menu-mock.data';
import { RestaurantLivePreview } from './restaurant-live-preview';
import type { RestaurantProfilePreviewData } from '../../models/restaurant-profile.models';

const PREVIEW: RestaurantProfilePreviewData = {
  slug: 'demo',
  nameAr: 'عالم النبات',
  nameEn: 'The Botanist',
  descriptionAr: 'وصف',
  descriptionEn: 'Description',
  logoUrl: null,
  coverImageUrl: null,
  primaryAccentColor: '#B8663F',
  countryCode: 'SA',
  currencyCode: 'SAR',
  timeZone: 'Asia/Riyadh',
  phoneNumber: '+966501234567',
  whatsAppNumber: '+966501234567',
  addressAr: 'الرياض',
  addressEn: 'Riyadh',
};

type PreviewHarness = RestaurantLivePreview & {
  openFullPreview: () => void;
  closeFullPreview: () => void;
  selectCategory: (categoryId: string) => void;
  activeCategoryId: () => string;
  filteredPreviewItems: () => Array<{ id: string; nameAr: string; nameEn?: string | null }>;
};

function starterItems() {
  return MOCK_PUBLIC_MENU.items.filter((item) => item.categoryId === 'cat-starters');
}

function dessertItems() {
  return MOCK_PUBLIC_MENU.items.filter((item) => item.categoryId === 'cat-desserts');
}

function getModalCards(modal: HTMLElement): HTMLElement[] {
  return Array.from(modal.querySelectorAll('app-menu-item-card'));
}

function cardTexts(cards: HTMLElement[]): string {
  return cards.map((card) => card.textContent ?? '').join(' ');
}

function clickCategory(modal: HTMLElement, label: string): void {
  const button = Array.from(modal.querySelectorAll('.category-nav__item')).find((element) =>
    element.textContent?.includes(label),
  ) as HTMLButtonElement | undefined;

  if (!button) {
    throw new Error(`Category button not found: ${label}`);
  }

  button.click();
}

describe('RestaurantLivePreview', () => {
  let fixture: ComponentFixture<RestaurantLivePreview>;
  let component: PreviewHarness;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantLivePreview],
    }).compileComponents();

    TestBed.inject(LocaleService).setLocale('ar');

    fixture = TestBed.createComponent(RestaurantLivePreview);
    component = fixture.componentInstance as PreviewHarness;
    fixture.componentRef.setInput('preview', PREVIEW);
    fixture.detectChanges();
  });

  it('renders only Arabic and English language pills', () => {
    const languageGroup = fixture.nativeElement.querySelector(
      '.live-preview__controls--language',
    ) as HTMLElement;

    expect(languageGroup).toBeTruthy();

    const buttons = languageGroup.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent?.trim()).toBe('العربية');
    expect(buttons[1].textContent?.trim()).toBe('English');
  });

  it('filters full preview items by selected category', () => {
    component.openFullPreview();
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.live-preview__modal') as HTMLElement;
    expect(modal).toBeTruthy();

    clickCategory(modal, 'المقبلات');
    fixture.detectChanges();

    let cards = getModalCards(modal);
    expect(cards.length).toBe(starterItems().length);
    expect(cardTexts(cards)).toContain('حمص بالكمأ');
    expect(cardTexts(cards)).not.toContain('كيك الجبن بالفستق');

    clickCategory(modal, 'الحلويات');
    fixture.detectChanges();

    cards = getModalCards(modal);
    expect(cards.length).toBe(dessertItems().length);
    expect(cardTexts(cards)).toContain('كيك الجبن بالفستق');
    expect(cardTexts(cards)).not.toContain('حمص بالكمأ');

    const activeButton = modal.querySelector('.category-nav__item.is-active') as HTMLButtonElement;
    expect(activeButton.textContent).toContain('الحلويات');
    expect(component.activeCategoryId()).toBe('cat-desserts');
  });

  it('keeps category filtering after switching preview language', () => {
    component.openFullPreview();
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.live-preview__modal') as HTMLElement;
    clickCategory(modal, 'الحلويات');
    fixture.detectChanges();

    const locale = TestBed.inject(LocaleService);
    locale.setLocale('en');
    fixture.detectChanges();

    const cards = getModalCards(modal);
    expect(cards.length).toBe(dessertItems().length);
    expect(cardTexts(cards)).toContain('Pistachio Cheesecake');
    expect(cardTexts(cards)).not.toContain('Truffle Hummus');
    expect(component.activeCategoryId()).toBe('cat-desserts');
  });

  it('preserves stable category behavior after closing and reopening full preview', () => {
    component.selectCategory('cat-desserts');
    component.openFullPreview();
    fixture.detectChanges();

    let modal = fixture.nativeElement.querySelector('.live-preview__modal') as HTMLElement;
    expect(component.activeCategoryId()).toBe('cat-desserts');
    expect(getModalCards(modal).length).toBe(dessertItems().length);

    component.closeFullPreview();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.live-preview__modal')).toBeNull();

    component.openFullPreview();
    fixture.detectChanges();

    modal = fixture.nativeElement.querySelector('.live-preview__modal') as HTMLElement;
    expect(component.activeCategoryId()).toBe('cat-desserts');

    const cards = getModalCards(modal);
    expect(cards.length).toBe(dessertItems().length);
    expect(cardTexts(cards)).toContain('كيك الجبن بالفستق');
    expect(modal.querySelector('.category-nav__item.is-active')?.textContent).toContain('الحلويات');
  });

  it('uses the same filtered items source for embedded and full preview', () => {
    component.selectCategory('cat-desserts');
    fixture.detectChanges();

    const embeddedCards = fixture.nativeElement.querySelectorAll(
      '.live-preview__frame app-menu-item-card',
    );
    expect(embeddedCards.length).toBe(dessertItems().length);

    component.openFullPreview();
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.live-preview__modal') as HTMLElement;
    const fullPreviewCards = getModalCards(modal);
    expect(fullPreviewCards.length).toBe(embeddedCards.length);
    expect(component.filteredPreviewItems().every((item) => item.categoryId === 'cat-desserts')).toBe(
      true,
    );
  });

  it('keeps the close button in the modal shell outside the scrollable body', () => {
    component.openFullPreview();
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('[data-testid="live-preview-modal"]') as HTMLElement;
    const closeButton = modal.querySelector('[data-testid="live-preview-close"]') as HTMLButtonElement;
    const scrollBody = modal.querySelector('.live-preview__modal-body') as HTMLElement;

    expect(closeButton).toBeTruthy();
    expect(closeButton.closest('.live-preview__modal-header')).toBeTruthy();
    expect(scrollBody.contains(closeButton)).toBe(false);
  });

  it('sets a translated aria-label on the close button', () => {
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('en');
    component.openFullPreview();
    fixture.detectChanges();

    const closeButton = fixture.nativeElement.querySelector(
      '[data-testid="live-preview-close"]',
    ) as HTMLButtonElement;

    expect(closeButton.getAttribute('aria-label')).toBe(locale.uiText('closePreviewAria'));
  });

  it('closes the preview on Escape', () => {
    component.openFullPreview();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="live-preview-modal"]')).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="live-preview-modal"]')).toBeNull();
  });
});
