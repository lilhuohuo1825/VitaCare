import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Account } from './account/account';
import { Header } from './header/header';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Account, Header],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('my-user');
}
