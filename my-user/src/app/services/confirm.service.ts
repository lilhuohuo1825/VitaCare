import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  message: string;
  onConfirm: () => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly current = signal<ConfirmOptions | null>(null);

  open(message: string, onConfirm: () => void): void {
    this.current.set({ message, onConfirm });
  }

  close(): void {
    this.current.set(null);
  }

  confirm(): void {
    const opts = this.current();
    if (opts) {
      opts.onConfirm();
      this.current.set(null);
    }
  }
}
