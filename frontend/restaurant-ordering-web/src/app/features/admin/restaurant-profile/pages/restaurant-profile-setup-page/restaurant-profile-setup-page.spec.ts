import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RestaurantProfileSetupPage } from './restaurant-profile-setup-page';

describe('RestaurantProfileSetupPage', () => {
  let fixture: ComponentFixture<RestaurantProfileSetupPage>;
  let component: RestaurantProfileSetupPage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantProfileSetupPage],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantProfileSetupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('validates slug pattern', () => {
    const slugControl = component.form.controls.slug;
    slugControl.setValue('Invalid Slug!');
    expect(slugControl.valid).toBe(false);

    slugControl.setValue('the-botanist');
    expect(slugControl.valid).toBe(true);
  });

  it('validates accent color pattern', () => {
    const accentControl = component.form.controls.primaryAccentColor;
    accentControl.setValue('not-a-color');
    expect(accentControl.valid).toBe(false);

    accentControl.setValue('#B8663F');
    expect(accentControl.valid).toBe(true);
  });

  it('updates preview data when name or color changes', () => {
    component.form.controls.nameEn.setValue('Updated Name');
    component.form.controls.primaryAccentColor.setValue('#123456');
    fixture.detectChanges();

    const preview = (component as unknown as { previewData: () => { nameEn: string | null; primaryAccentColor: string | null } }).previewData();
    expect(preview.nameEn).toBe('Updated Name');
    expect(preview.primaryAccentColor).toBe('#123456');
  });
});
