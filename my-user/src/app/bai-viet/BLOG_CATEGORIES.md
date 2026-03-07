# Category trong data blogs

## Nguồn dữ liệu

- **API:** `GET http://localhost:3000/api/blogs` — backend đọc collection `blogs` (MongoDB), trả về các trường: `title`, `shortDescription`, `excerpt`, `description`, `image`, `imageUrl`, `primaryImage`, `slug`, `categories`.
- **Category** được lấy từ: `categories[].category.name` (Strapi-style), hoặc `category.name`, hoặc `categoryName`. Nếu không có thì gán `"Bài viết"`.

## Category có trong code (fallback / sample)

Khi API lỗi hoặc DB trống, frontend/backend dùng dữ liệu mẫu. Các **category** xuất hiện trong code:

| Category |
|----------|
| Bài viết *(mặc định khi không có category)* |
| Chăm sóc mẹ và bé |
| Chế độ dinh dưỡng |
| Dinh dưỡng |
| Phòng ngừa bệnh |
| Sức khỏe |
| Sức khỏe cộng đồng |
| Sức khỏe làm đẹp |
| Thuốc và bệnh |
| Tin tức |

**Backend sample** (khi collection `blogs` trống) chỉ có: **Dinh dưỡng**, **Sức khỏe**.

**Frontend fallback** (trang bai-viet) có đủ 10 category ở bảng trên (trừ "Bài viết" nếu đã gán tên rõ).

## Xem category thực tế từ API

Trên trang **bai-viet**, cuối trang có block thu gọn **"Category đang có trong data blogs (n)"**. Mở ra sẽ thấy danh sách **category thực tế** sau khi load API (hoặc sau fallback).

Trong code, component Blog có getter **`blogCategoriesFromData`**: mảng tên category duy nhất, đã sort, lấy từ `blogs[].categoryName`.
