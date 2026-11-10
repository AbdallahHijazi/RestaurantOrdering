import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StaffManagementSelect, type StaffSelectOption } from './staff-management-select';

describe('StaffManagementSelect', () => {
  let fixture: ComponentFixture<StaffManagementSelect>;

  const options: StaffSelectOption[] = [
    { value: 'all', label: 'All Roles' },
    { value: 'RestaurantManager', label: 'Restaurant Manager' },
    { value: 'KitchenManager', label: 'Kitchen Manager' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffManagementSelect],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffManagementSelect);
    fixture.componentRef.setInput('options', options);
    fixture.componentRef.setInput('value', 'all');
    fixture.componentRef.setInput('testId', 'staff-select-test');
    fixture.detectChanges();
  });

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('[data-testid="staff-select-test"]') as HTMLButtonElement;
  }

  it('opens dropdown with aria-expanded and closes on escape', () => {
    trigger().click();
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('selects option and emits enum string value', () => {
    const emitted: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));

    trigger().click();
    fixture.detectChanges();

    const option = fixture.nativeElement.querySelector(
      '[data-option-index="2"]',
    ) as HTMLButtonElement | null;
    option?.click();
    fixture.detectChanges();

    expect(emitted).toEqual(['KitchenManager']);
    expect(trigger().textContent).toContain('Kitchen Manager');
  });

  it('supports arrow keys and enter on trigger', () => {
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(document.body.querySelector('.staff-select__panel')).toBeTruthy();

    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(trigger().textContent).toContain('All Roles');
  });

  it('positions panel upward when space below trigger is limited', async () => {
    const originalInnerHeight = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 520 });

    trigger().getBoundingClientRect = () =>
      ({
        top: 420,
        bottom: 470,
        left: 24,
        width: 280,
        right: 304,
        height: 50,
        x: 24,
        y: 420,
        toJSON: () => ({}),
      }) as DOMRect;

    trigger().click();
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.staff-select__panel') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.style.bottom).not.toBe('');
    expect(panel.style.top).toBe('');
    expect(Number.parseFloat(panel.style.maxHeight)).toBeLessThanOrEqual(220);

    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight });
  });
});
