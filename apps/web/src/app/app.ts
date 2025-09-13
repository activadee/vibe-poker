import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LangSwitchComponent } from './i18n/lang-switch.component';

@Component({
  imports: [RouterModule, LangSwitchComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'web';
}
