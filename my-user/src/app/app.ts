import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from './auth/auth';
import { HeaderComponent } from './header/header';
import { Footer } from './footer/footer';
import { Cart } from './cart/cart';
import { FloatingActionsComponent } from './floating-actions/floating-actions';
import { AuthService } from './services/auth.service';
import { ToastService } from './services/toast.service';
import { ConfirmService } from './services/confirm.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Auth, HeaderComponent, Footer, Cart, FloatingActionsComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly authService = inject(AuthService);
  readonly toastService = inject(ToastService);
  readonly confirmService = inject(ConfirmService);
}
