import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-staff-modal-actions',
  template: '<ng-content />',
  styleUrl: './staff-modal-actions.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'staff-modal-actions',
  },
})
export class StaffModalActions {}
