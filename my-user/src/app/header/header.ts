import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-header',
  imports: [CommonModule, FormsModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  search_value = '';
  cart_count = 0;

  main_nav: string[] = [
    'Omega 3',
    'Men vi sinh',
    'Kẽm',
    'Dung dịch vệ sinh',
    'Thuốc nhỏ mắt',
    'Sữa rửa mặt',
    'Sắt',
  ];

  category_pills: string[] = [
    'Thực phẩm chức năng',
    'Dược mỹ phẩm',
    'Thuốc',
    'Chăm sóc cá nhân',
    'Thiết bị y tế',
    'Bệnh và góc sức khỏe',
    'Hệ thống nhà thuốc',
  ];

  onSearch(): void {
    // demo: m thay bằng route hoặc gọi service sau
    const keyword = this.search_value.trim();
    if (!keyword) return;
    console.log('search:', keyword);
  }

  onLogin(e: Event): void {
    e.preventDefault();
    console.log('go login');
  }

  onCart(e: Event): void {
    e.preventDefault();
    console.log('go cart');
  }

  onNotify(e: Event): void {
    e.preventDefault();
    console.log('open notifications');
  }

  onLearnMore(e: Event): void {
    e.preventDefault();
    console.log('learn more');
  }

  goHome(e: Event): void {
    e.preventDefault();
    console.log('go home');
  }

  onMainNavClick(e: Event, item: string): void {
    e.preventDefault();
    console.log('main nav:', item);
  }

  onCategoryClick(c: string): void {
    console.log('category:', c);
  }

  hideMascot(ev: Event): void {
    // nếu ảnh mascot không tồn tại thì ẩn luôn cho đẹp
    const img = ev.target as HTMLImageElement;
    img.style.display = 'none';
  }
}