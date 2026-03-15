import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AccountMenuService {
  private readonly nextMenu = signal<string | null>(null);

  setNextMenu(menu: string): void {
    this.nextMenu.set(menu);
  }

  consumeNextMenu(): string | null {
    const value = this.nextMenu();
    this.nextMenu.set(null);
    return value;
  }
}

