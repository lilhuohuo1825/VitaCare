import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

const STORAGE_KEY = 'vitacare_user';

export interface LoggedUser {
  user_id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  avatar?: string | null;
  tiering?: string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  readonly showAuthModal = signal(false);
  readonly currentUser = signal<LoggedUser | null>(null);
  /** Popup xác nhận đăng xuất (Bạn có chắc muốn đăng xuất?) */
  readonly showLogoutConfirm = signal(false);
  /** Banner thành công trên đầu trang (đăng nhập / đăng xuất), tự tắt sau vài giây */
  readonly headerSuccessMessage = signal<string | null>(null);
  private headerSuccessTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.restoreUserFromStorage();
  }

  private restoreUserFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const user = JSON.parse(raw) as LoggedUser;
      if (user && typeof user.user_id === 'string') {
        this.currentUser.set(user);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private saveUserToStorage(user: LoggedUser | null): void {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  openLogoutConfirm(): void {
    this.showLogoutConfirm.set(true);
  }

  closeLogoutConfirm(): void {
    this.showLogoutConfirm.set(false);
  }

  /** Gọi khi user bấm OK trong popup xác nhận đăng xuất */
  confirmLogout(): void {
    this.showLogoutConfirm.set(false);
    this.doLogout();
    this.router.navigate(['/']);
  }

  openAuthModal(): void {
    this.showAuthModal.set(true);
  }

  closeAuthModal(): void {
    this.showAuthModal.set(false);
  }

  setUser(user: LoggedUser | null): void {
    this.currentUser.set(user);
    this.saveUserToStorage(user);
  }

  logout(): void {
    this.currentUser.set(null);
    this.saveUserToStorage(null);
  }

  /** Hiện banner thành công (ví dụ: "Bạn đã đăng nhập thành công", "Bạn đã đăng xuất") */
  showHeaderSuccess(message: string): void {
    this.headerSuccessMessage.set(message);
    if (this.headerSuccessTimeout) clearTimeout(this.headerSuccessTimeout);
    this.headerSuccessTimeout = setTimeout(() => {
      this.headerSuccessMessage.set(null);
      this.headerSuccessTimeout = null;
    }, 2500);
  }

  /** Đăng xuất và hiện banner "Bạn đã đăng xuất" */
  doLogout(): void {
    this.currentUser.set(null);
    this.saveUserToStorage(null);
    this.showHeaderSuccess('Bạn đã đăng xuất');
  }
}

