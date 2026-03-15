import { Injectable, signal, computed } from '@angular/core';

/**
 * Service điều khiển mở/đóng sidebar giỏ hàng.
 * Header (hoặc bất kỳ đâu) gọi open() khi bấm "Giỏ thuốc";
 * component Cart dùng isOpen() để hiển thị sidebar.
 */
@Injectable({ providedIn: 'root' })
export class CartSidebarService {
  private readonly open = signal<boolean>(false);

  isOpen = computed(() => this.open());

  openSidebar(): void {
    this.open.set(true);
  }

  closeSidebar(): void {
    this.open.set(false);
  }
}
