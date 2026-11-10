import { ComponentFixture, TestBed } from '@angular/core/testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { LocaleService } from '../../../../../../core/localization/locale';
import type { RestaurantTable } from '../../../../data-access/restaurant-tables.models';
import { TablePrintCard } from './table-print-card';

const sampleTable: RestaurantTable = {
  id: '11111111-1111-1111-1111-111111111101',
  name: 'Table 1',
  zone: 'Terrace',
  publicToken: 'token-abc',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
};

const qrSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="#fff"/></svg>';

describe('TablePrintCard', () => {
  let fixture: ComponentFixture<TablePrintCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TablePrintCard],
    }).compileComponents();

    TestBed.inject(LocaleService).setLocale('en');
    fixture = TestBed.createComponent(TablePrintCard);
    fixture.componentRef.setInput('table', sampleTable);
    fixture.componentRef.setInput('restaurantName', 'Al-Andalus Restaurant');
    fixture.componentRef.setInput('brandInitial', 'A');
    fixture.componentRef.setInput('qrSvg', qrSvg);
    fixture.detectChanges();
  });

  function card(): HTMLElement {
    return fixture.nativeElement.querySelector('.table-qr-card') as HTMLElement;
  }

  it('renders preview variant with restaurant, QR, table name, and zone', () => {
    fixture.componentRef.setInput('variant', 'preview');
    fixture.detectChanges();

    expect(card().classList.contains('table-qr-card--preview')).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="table-qr-card-restaurant-name"]')?.textContent).toContain(
      'Al-Andalus Restaurant',
    );
    expect(fixture.nativeElement.querySelector('[data-testid="table-qr-card-qr"] svg')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="table-qr-card-table-name"]')?.textContent?.trim()).toBe(
      'Table 1',
    );
    expect(fixture.nativeElement.querySelector('[data-testid="table-qr-card-zone"]')?.textContent?.trim()).toBe(
      'Terrace',
    );
  });

  it('renders Arabic and English scan lines below QR', () => {
    const locale = TestBed.inject(LocaleService);
    fixture.componentRef.setInput('variant', 'preview');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain(locale.uiText('tablesCardOrderFromPhone'));
    expect(text).toContain(locale.uiText('tablesCardScanEnglish'));
  });

  it('uses print variant class for single-card print mode', () => {
    fixture.componentRef.setInput('variant', 'print');
    fixture.detectChanges();

    expect(card().classList.contains('table-qr-card--print')).toBe(true);
    expect(card().classList.contains('table-qr-card--preview')).toBe(false);
  });

  it('structures content in identity, QR, scan, and table sections', () => {
    fixture.componentRef.setInput('variant', 'preview');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.table-qr-card__identity')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.table-qr-card__scan')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.table-qr-card__table-meta')).toBeTruthy();
  });

  it('includes preview and print sizing rules in component stylesheet', () => {
    const cardScss = readFileSync(resolve(__dirname, 'table-print-card.scss'), 'utf8');

    expect(cardScss).toContain('.table-qr-card--preview');
    expect(cardScss).toContain('.table-qr-card--print');
    expect(cardScss).toMatch(/14\.75rem/);
    expect(cardScss).toMatch(/100mm/);
    expect(cardScss).toMatch(/56mm/);
  });
});
