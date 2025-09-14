import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LangSwitchComponent } from '../i18n/lang-switch.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, LangSwitchComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {}
