# Icons – VitaCare

## Bootstrap Icons (CDN)

Đã import trong `index.html`:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
```
**Danh sách:** https://icons.getbootstrap.com/

## Cách dùng

```html
<i class="bi bi-house-door"></i>
<i class="bi bi-cart bi-lg"></i>
<i class="bi bi-check-circle icon-success"></i>
```

**Size:** `.bi-xs` (12px), `.bi-sm`, `.bi-md`, `.bi-lg`, `.bi-xl`, `.bi-2xl`  
**Màu:** `.icon-primary`, `.icon-success`, `.icon-warning`, `.icon-danger`, `.icon-info`

## Custom icon (ảnh)

```html
<img src="/assets/images/..." class="icon-img icon-img-md" alt="">
```
Size: `.icon-img-xs` … `.icon-img-3xl`

## Utility khác

- `.icon-text` – flex căn icon + chữ
- `.icon-btn` / `.icon-btn-primary` – nút tròn
- `.icon-badge` + `data-badge="3"` – badge số
- `.icon-spin` / `.icon-pulse` – animation
- `.icon-tooltip` + `data-tooltip="..."` – tooltip

Classes nằm trong `utilities.css`.
