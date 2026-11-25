import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminOrdersSelect } from './admin-orders-select';



describe('AdminOrdersSelect', () => {

  let fixture: ComponentFixture<AdminOrdersSelect>;



  beforeEach(async () => {

    await TestBed.configureTestingModule({

      imports: [AdminOrdersSelect],

    }).compileComponents();



    fixture = TestBed.createComponent(AdminOrdersSelect);

    fixture.componentRef.setInput('options', [

      { value: 'all', label: 'All order types' },

      { value: '2', label: 'Delivery' },

      { value: '1', label: 'Pickup' },

    ]);

    fixture.componentRef.setInput('value', 'all');

    fixture.componentRef.setInput('testId', 'admin-orders-select-test');

    fixture.componentRef.setInput('label', 'Order type');

    fixture.detectChanges();

  });



  function trigger(): HTMLButtonElement {

    return fixture.nativeElement.querySelector('[data-testid="admin-orders-select-test"]') as HTMLButtonElement;

  }



  function panel(): HTMLElement {

    return fixture.nativeElement.querySelector('.admin-orders-select__panel') as HTMLElement;

  }



  it('exposes listbox semantics and toggles aria-expanded', () => {

    expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');

    expect(trigger().getAttribute('aria-expanded')).toBe('false');



    trigger().click();

    fixture.detectChanges();



    expect(trigger().getAttribute('aria-expanded')).toBe('true');

    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeTruthy();

    expect(fixture.nativeElement.querySelectorAll('[role="option"]').length).toBe(3);

  });



  it('selects option and emits value', () => {

    const emitted: string[] = [];

    fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));



    trigger().click();

    fixture.detectChanges();



    const option = fixture.nativeElement.querySelector('[data-option-index="1"]') as HTMLButtonElement;

    option.click();

    fixture.detectChanges();



    expect(emitted).toEqual(['2']);

    expect(trigger().getAttribute('aria-expanded')).toBe('false');

  });



  it('supports keyboard navigation and escape', () => {

    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.admin-orders-select__panel')).toBeTruthy();



    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    fixture.detectChanges();

    expect(trigger().getAttribute('aria-expanded')).toBe('false');

  });



  it('positions panel with logical properties and trigger width in RTL', () => {

    document.documentElement.setAttribute('dir', 'rtl');

    fixture.detectChanges();



    trigger().click();

    fixture.detectChanges();



    const panelStyle = getComputedStyle(panel());

    expect(panelStyle.position).toBe('absolute');

    expect(['0', '0px']).toContain(panelStyle.insetInlineStart);

    expect(panel().offsetWidth).toBe(trigger().offsetWidth);

    expect(panelStyle.insetBlockStart).not.toBe('auto');

  });



  it('positions panel with logical properties and trigger width in LTR', () => {

    document.documentElement.setAttribute('dir', 'ltr');

    fixture.detectChanges();



    trigger().click();

    fixture.detectChanges();



    const panelStyle = getComputedStyle(panel());

    expect(panelStyle.position).toBe('absolute');

    expect(['0', '0px']).toContain(panelStyle.insetInlineStart);

    expect(panel().offsetWidth).toBe(trigger().offsetWidth);

  });



  it('defines open-up panel placement rules with logical properties', () => {

    const cssText = Array.from(document.styleSheets)

      .flatMap((sheet) => {

        try {

          return Array.from(sheet.cssRules).map((rule) => rule.cssText);

        } catch {

          return [];

        }

      })

      .join('\n');



    expect(cssText).toContain('admin-orders-select--open-up');

    expect(cssText).toContain('inset-block-end');

    expect(cssText).toContain('inset-inline-start');

    expect(cssText).toContain('position: absolute');

  });



  it('closes on outside click', () => {

    trigger().click();

    fixture.detectChanges();



    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    fixture.detectChanges();



    expect(trigger().getAttribute('aria-expanded')).toBe('false');

  });

});


