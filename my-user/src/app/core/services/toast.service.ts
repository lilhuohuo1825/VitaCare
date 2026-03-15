import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<Toast | null>(null);
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly autoHideMs = 3000;

  private show(type: ToastType, message: string): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.current.set({ type, message });
    this.timeoutId = setTimeout(() => {
      this.dismiss();
      this.timeoutId = null;
    }, this.autoHideMs);
  }

  showSuccess(message: string): void {
    this.show('success', message);
  }

  showError(message: string): void {
    this.show('error', message);
  }

  showInfo(message: string): void {
    this.show('info', message);
  }

  dismiss(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.current.set(null);
  }
}
