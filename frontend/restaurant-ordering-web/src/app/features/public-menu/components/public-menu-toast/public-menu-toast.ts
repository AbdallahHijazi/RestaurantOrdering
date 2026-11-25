import { Component, input } from '@angular/core';

@Component({
  selector: 'app-public-menu-toast',
  templateUrl: './public-menu-toast.html',
  styleUrl: './public-menu-toast.scss',
})
export class PublicMenuToast {
  readonly message = input('');
  readonly visible = input(false);
}
