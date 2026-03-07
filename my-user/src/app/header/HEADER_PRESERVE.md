# Header Component – Các phần cần giữ nguyên khi update

Tài liệu này mô tả chi tiết các yếu tố **bắt buộc giữ nguyên** khi cập nhật component header.

---

## 1. Button Đăng nhập (link với Auth)

### Vị trí trong template
- **Desktop**: Trong `.vc_login_wrapper` > `.vc_action` (dòng 156–174 trong `header.html`)
- **Mobile**: Trong drawer `.vc_m_login_banner` > `.vc_m_login_actions` (dòng 68–74)

### HTML cần giữ nguyên

**Desktop:**
```html
<div class="vc_login_wrapper" (mouseenter)="onAccountMouseEnter()" (mouseleave)="onAccountMouseLeave()">
  <a class="vc_action" href="javascript:void(0)" (click)="onLogin($event)">
    <span class="vc_action_icon" aria-hidden="true">
      <i class="bi bi-person-fill"></i>
    </span>
    <span class="vc_action_text" *ngIf="!authService.currentUser()">Đăng nhập</span>
    <span class="vc_action_text" *ngIf="authService.currentUser()?.phone">{{ authService.currentUser()?.phone }}</span>
    <span class="vc_action_text" *ngIf="authService.currentUser() && !authService.currentUser()?.phone">Tài khoản</span>
  </a>
  <!-- Account dropdown menu (giữ nguyên) -->
</div>
```

**Mobile drawer:**
```html
<button class="vc_m_btn vc_m_btn_primary" type="button" (click)="onLogin($event)">Đăng nhập</button>
<button class="vc_m_btn vc_m_btn_light" type="button" (click)="onLogin($event)">Đăng ký</button>
```

### Logic TypeScript (header.ts)
```typescript
onLogin(e: Event): void {
  e.preventDefault();
  if (this.authService.currentUser()) {
    this.router.navigate(['/account']);
  } else {
    this.authService.openAuthModal();  // ← Mở modal Auth component
  }
}
```

### Kết nối
- `AuthService.openAuthModal()` → mở modal `<app-auth>` (được render trong `app.html`)
- `AuthService.currentUser()` → signal để hiển thị trạng thái đăng nhập

---

## 2. Button Giỏ thuốc (link với Cart)

### Vị trí trong template
- **Desktop**: Trong `.vc_cart_wrapper` (dòng 212–263 trong `header.html`)
- **Mobile**: Trong `.vc_m_right` (dòng 24–27)

### HTML cần giữ nguyên

**Desktop:**
```html
<div class="vc_cart_wrapper"
     [class.vc_cart_wrapper--open]="isCartHoverVisible"
     (mouseenter)="onCartMouseEnter()"
     (mouseleave)="onCartMouseLeave()">
  <a class="vc_action vc_action_cart" href="#" (click)="onCart($event)">
    <span class="vc_action_icon" aria-hidden="true">
      <i class="bi bi-basket2-fill"></i>
    </span>
    <span class="vc_action_text vc_action_text_cart">Giỏ thuốc</span>
    <span class="vc_badge" *ngIf="cart_count > 0">{{ cart_count }}</span>
  </a>
  <!-- Cart hover dropdown (giữ nguyên cấu trúc) -->
</div>
```

**Mobile:**
```html
<a class="vc_m_icon_btn" href="#" (click)="onCart($event)" aria-label="Giỏ thuốc">
  <i class="bi bi-basket2-fill"></i>
  <span class="vc_m_badge" *ngIf="cart_count > 0">{{ cart_count }}</span>
</a>
```

### Logic TypeScript (header.ts)
```typescript
onCart(e: Event): void {
  e.preventDefault();
  if (this.authService.currentUser()) {
    this.isCartHoverVisible = false;
    this.cartSidebarService.openSidebar();  // ← Mở Cart sidebar component
    this.cdr.markForCheck();
  } else {
    this.authService.openAuthModal();
  }
}
```

### Kết nối
- `CartSidebarService.openSidebar()` → mở sidebar `<app-cart>` (render trong `app.html`)
- `cart_count` từ `CartService.cartCount$` và `cartUpdated$`
- Hover: `onCartMouseEnter()` / `onCartMouseLeave()` → hiện dropdown preview

---

## 3. Icon chuông thông báo (link với Notice)

### Vị trí trong template
- **Desktop**: Trong `.vc_notify_wrapper` (dòng 266–313 trong `header.html`)
- **Mobile**: Trong `.vc_m_right` (dòng 28–31)

### HTML cần giữ nguyên

**Desktop:**
```html
<div class="vc_notify_wrapper"
     (mouseenter)="onNotifyMouseEnter()"
     (mouseleave)="onNotifyMouseLeave()"
     [class.vc_notify_wrapper--open]="isNotifyHoverVisible">
  <a class="vc_action vc_action_notify" href="#" (click)="onNotify($event)" aria-label="Thông báo">
    <span class="vc_action_icon" aria-hidden="true">
      <i class="bi bi-bell-fill"></i>
    </span>
    <span class="vc_badge" *ngIf="unreadNotifyCount > 0">{{ unreadNotifyCount }}</span>
  </a>
  <!-- Notify dropdown (loading, error, preview, footer "Xem tất cả") -->
</div>
```

**Mobile:**
```html
<a class="vc_m_icon_btn" href="#" (click)="onNotify($event)" aria-label="Thông báo">
  <i class="bi bi-bell-fill"></i>
  <span class="vc_m_badge" *ngIf="unreadNotifyCount > 0">{{ unreadNotifyCount }}</span>
</a>
```

### Logic TypeScript (header.ts)
```typescript
onNotify(e: Event): void {
  e.preventDefault();
  if (!this.authService.currentUser()) {
    this.authService.openAuthModal();
    return;
  }
  this.isNotifyHoverVisible = false;
  this.router.navigate(['/account'], { queryParams: { menu: 'notifications' } });  // ← Trang Notice
}
```

### Kết nối
- Click → navigate `/account?menu=notifications` (trang Account hiển thị tab Notice)
- `NoticeService.getNotices(userId)` → fetch preview khi hover
- `unreadNotifyCount`, `notificationsPreview` từ API

---

## 4. CSS Header – Thu gọn (Compact) vs Nguyên bản (Full)

### Class điều khiển
- `vc_header` – base
- `vc_header_compact` – thêm khi scroll xuống (scrollY > 60)
- Logic trong `header.ts`: `applyCompactState()`, `COMPACT_SCROLL_Y = 60`, `EXPAND_SCROLL_Y = 80`

### CSS Compact (cần giữ nguyên)
```css
/* Ẩn top strip */
.vc_header.vc_header_compact .vc_top_strip { display: none !important; }

/* Ẩn keywords gợi ý */
.vc_header.vc_header_compact .vc_nav_keywords { display: none !important; }

/* Ẩn slogan */
.vc_header.vc_header_compact .vc_logo_tagline { display: none !important; }

/* Main bar gọn */
.vc_header.vc_header_compact .vc_main_bar { padding: 10px 0 10px !important; }

/* Logo gọn */
.vc_header.vc_header_compact .vc_logo { max-width: 240px; }
.vc_header.vc_header_compact .vc_logo_img { width: 56px; }
.vc_header.vc_header_compact .vc_logo_name { font-size: 22px; }

/* Search gọn */
.vc_header.vc_header_compact .vc_search_input { height: 40px; font-size: 13px; }

/* Actions gọn */
.vc_header.vc_header_compact .vc_actions { gap: 10px; }
.vc_header.vc_header_compact .vc_action { padding: 8px 10px; }
.vc_header.vc_header_compact .vc_action_icon .bi { font-size: 20px; }

/* Categories gọn */
.vc_header.vc_header_compact .vc_categories { padding: 8px 0 10px !important; }
.vc_header.vc_header_compact .vc_categories_inner {
  justify-content: flex-start !important;
  gap: 10px !important;
  flex-wrap: nowrap !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.vc_header.vc_header_compact .vc_categories_inner::-webkit-scrollbar { display: none; }
.vc_header.vc_header_compact .vc_pill {
  font-size: 12.5px !important;
  padding: 6px 12px !important;
  font-weight: 700 !important;
}
.vc_header.vc_header_compact .vc_pill i.bi-chevron-down { font-size: 10px !important; }
```

### CSS Full (nguyên bản)
- Không có class `vc_header_compact` → hiển thị đầy đủ top strip, keywords, slogan, logo lớn, v.v.
- Các giá trị mặc định trong `header.css` (vd. `.vc_main_bar`, `.vc_logo`, `.vc_search_input`, …)

### Transition mượt (giữ nguyên)
```css
.vc_top_strip, .vc_main_bar, .vc_categories, .vc_nav_keywords,
.vc_logo_img, .vc_logo_name, .vc_logo_tagline, .vc_search_input,
.vc_action, .vc_mascot_left, .vc_mascot_right {
  transition: padding 220ms cubic-bezier(0.33, 1, 0.68, 1), ...;
}
@media (prefers-reduced-motion: reduce) { ... transition: none !important; }
```

---

## 5. Mascot Tết (mascot_tet1 & mascot_tet2)

### Vị trí trong template (header.html)
Ngay sau thẻ mở `<header>`:
```html
<header class="vc_header" [class.vc_header_compact]="isHeaderCompact">
  <img class="vc_mascot_left" src="assets/images/mascot/mascot_tet1.png" alt="mascot left" aria-hidden="true" />
  <img class="vc_mascot_right" src="assets/images/mascot/mascot_tet2.png" alt="mascot right" aria-hidden="true" />
  ...
</header>
```

### Đường dẫn ảnh
- `assets/images/mascot/mascot_tet1.png` (bên trái)
- `assets/images/mascot/mascot_tet2.png` (bên phải)

### CSS (header.css) – giữ nguyên
```css
.vc_mascot_left,
.vc_mascot_right {
  position: absolute;
  top: 0.09rem;
  width: 130px;
  height: auto;
  pointer-events: none;
  z-index: 60;
}

.vc_mascot_left {
  left: 8px;
}

.vc_mascot_right {
  right: 8px;
}
```

### Vị trí đặt
- **mascot_tet1**: góc trái header, `left: 8px`, `top: 0.09rem`
- **mascot_tet2**: góc phải header, `right: 8px`, `top: 0.09rem`
- `z-index: 60` (cao hơn `.vc_main_bar` z-index 50) để không bị che

### Khi Compact
```css
.vc_header.vc_header_compact .vc_mascot_left,
.vc_header.vc_header_compact .vc_mascot_right {
  opacity: 0;
  transform: translateY(-6px);
  pointer-events: none;
  visibility: hidden;
}
```

### Responsive
- **Mobile (≤767px)**: `display: none !important;`
- **Tablet (768–1023px)**: `display: none !important;`

### Transition (đã có trong block transition chung)
`.vc_mascot_left`, `.vc_mascot_right` nằm trong danh sách transition mượt.

---

## 6. Responsive Header (bắt buộc áp dụng tương tự khi update)

Khi update header mới, **cần giữ cùng chiến lược responsive** dưới đây để header hiển thị đúng trên mobile, tablet và desktop.

### Breakpoints

| Breakpoint | Media query | Mô tả |
|------------|------------|--------|
| **Mobile** | `max-width: 767px` | Chỉ hiện **mobile header** (`.vc_m_header`), ẩn toàn bộ desktop header |
| **Tablet** | `min-width: 768px` and `max-width: 1023px` | Hiện **desktop header** nhưng gọn hơn (logo nhỏ, ẩn tagline, ẩn chữ action, pills scroll ngang) |
| **Desktop** | `min-width: 1024px` | Header desktop đầy đủ |

### Biến padding theo breakpoint

```css
/* Mặc định (desktop) */
:host { --container-padding: 170px; }

/* Mobile */
@media (max-width: 767px) {
  :host { --container-padding: 14px; }
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  :host { --container-padding: 24px; }
}
```

---

### Mobile (≤ 767px)

**Nguyên tắc:** Ẩn toàn bộ header desktop; chỉ hiện block `.vc_m_header`.

**Ẩn (desktop):**
```css
.vc_top_strip,
.vc_main_bar,
.vc_categories,
.vc_megamenu_overlay {
  display: none !important;
}
```

**Hiện mobile header:**
```css
.vc_m_header {
  display: block;
  background: linear-gradient(90deg, #745e92 0%, #1e62a4 29%, #2f84c7 65%, #5faae5 100%);
  padding: 10px var(--container-padding) 12px;
  position: relative;
  z-index: 50;
}
```

**Cấu trúc mobile (HTML – giữ tương tự khi update):**
1. **Top row** `.vc_m_top`: Hamburger (label for `#vcMobileDrawer`) | Logo giữa | **Right icons** (Giỏ thuốc `onCart`, Chuông `onNotify`) – cùng handler và badge như desktop.
2. **Search row** `.vc_m_search`: ô tìm kiếm + `search_value`, `onSearch()`.
3. **Overlay** `.vc_m_overlay`: label for `#vcMobileDrawer` để click đóng drawer.
4. **Drawer** `.vc_m_drawer`: mở từ trái, chứa:
   - Head: logo + tên NHÀ THUỐC / VITACARE + nút đóng
   - **Login banner**: "Đăng nhập để nhận ưu đãi" + nút Đăng nhập / Đăng ký → `onLogin($event)`
   - Menu danh mục (accordion)
   - Bottom: Tư vấn 1800 6928

**CSS mobile cần áp dụng tương tự cho header mới:**
- `.vc_m_icon_btn`: 40x40px, bo tròn, nền rgba(255,255,255,0.12), icon 22px.
- `.vc_m_badge`: góc trên-phải nút, min-width 18px, height 18px, font 11px weight 800.
- `.vc_m_search`: height 40px, border-radius 999px, padding 0 14px.
- Drawer: `width: min(86vw, 360px)`, `transform: translateX(-102%)` đóng / `translateX(0)` mở; overlay `z-index: 999`, drawer `z-index: 1000`.

**Mascot Tết trên mobile:** ẩn (`display: none !important` cho `.vc_mascot_left`, `.vc_mascot_right`).

---

### Tablet (768px – 1023px)

**Nguyên tắc:** Vẫn dùng **desktop layout** (top strip + main bar + categories), nhưng thu nhỏ để không tràn.

**Áp dụng cho header update:**
- `--container-padding: 24px`
- Main bar: `padding: 12px 0 10px`
- Logo: `max-width: 280px`, ảnh 56px, tên 22px, **ẩn tagline** (`.vc_logo_tagline { display: none }`)
- Search: `height: 40px`, `font-size: 13px`; `.vc_search_section` `max-width: none`, `width: 100%`
- Nếu có mascot cạnh search: thu nhỏ (vd. width 76px, left -34px)
- **Keywords** dưới search: `overflow-x: auto`, `scrollbar-width: none`, ẩn scrollbar webkit
- **Actions** (Đăng nhập, Giỏ, Chuông): `gap: 10px`, `padding: 8px`, **ẩn chữ** (`.vc_action_text { display: none }`) – chỉ giữ icon + badge
- **Category pills**: `justify-content: flex-start`, `overflow-x: auto`, ẩn scrollbar, pill `font-size: 13px`, `padding: 7px 12px`
- **Mega menu**: `.vc_megamenu_inner` `width: min(940px, calc(100vw - (var(--container-padding) * 2)))`
- **Mascot Tết** 2 bên: `display: none !important`

---

### Desktop (≥ 1024px)

- Header đầy đủ: top strip, main bar (logo + search + keywords + actions), category pills, mega menu.
- Compact mode khi scroll (class `vc_header_compact`) vẫn dùng như mục 4.
- Mascot Tết hiện 2 bên (ẩn khi compact).

---

### Lưu ý khi update header

1. **Giữ đúng 3 breakpoints:** 767px (mobile), 768–1023px (tablet), ≥1024px (desktop).
2. **Mobile:** Nếu header mới vẫn có “mobile riêng” thì giữ cấu trúc: top row (menu + logo + giỏ + chuông) → search → drawer có login + danh mục; cùng handler `onLogin`, `onCart`, `onNotify` và cùng class (`.vc_m_icon_btn`, `.vc_m_badge`, …) để style hiện tại vẫn đúng.
3. **Tablet:** Nếu header mới có logo/search/actions khác, vẫn áp dụng: thu nhỏ logo, ẩn tagline, ẩn text action (chỉ icon), pills + keywords scroll ngang, mega menu width max 940px.
4. **Reduced motion:** Giữ `@media (prefers-reduced-motion: reduce)` tắt transition cho các phần header đã liệt kê trong tài liệu.

---

## 7. Tóm tắt checklist khi update

| Yếu tố | File | Ghi chú |
|--------|------|--------|
| Button Đăng nhập | header.html, header.ts | `onLogin()` → `authService.openAuthModal()` hoặc `/account` |
| Button Giỏ thuốc | header.html, header.ts | `onCart()` → `cartSidebarService.openSidebar()` hoặc auth modal |
| Icon chuông | header.html, header.ts | `onNotify()` → `/account?menu=notifications`; hover fetch NoticeService |
| CSS compact/full | header.css | Class `vc_header_compact`, các rule `.vc_header.vc_header_compact ...` |
| mascot_tet1, mascot_tet2 | header.html, header.css | `assets/images/mascot/mascot_tet1.png`, `mascot_tet2.png`; `.vc_mascot_left`, `.vc_mascot_right` |
| **Responsive** | header.css, header.html | Mobile ≤767px (chỉ .vc_m_header + drawer); Tablet 768–1023px (desktop gọn, ẩn text action, pills scroll); Desktop ≥1024px. Dùng cùng breakpoint và logic ẩn/hiện khi update. |

---

*Tài liệu tạo ngày 2025-03-01, cập nhật thêm phần Responsive để khi update header vẫn responsive tương tự.*
