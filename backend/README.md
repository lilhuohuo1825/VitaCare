# VitaCare Backend - MongoDB

Backend cho dự án VitaCare sử dụng MongoDB làm cơ sở dữ liệu.

## 📋 Yêu cầu hệ thống

- Node.js (version 14 trở lên)
- MongoDB (version 4.4 trở lên)
- macOS/Linux/Windows

## 🚀 Hướng dẫn cài đặt trên máy mới

### Bước 1: Cài đặt MongoDB

#### Trên macOS (sử dụng Homebrew):

```bash
# Cài đặt MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Kiểm tra phiên bản
mongod --version
```

#### Trên Ubuntu/Debian:

```bash
# Import MongoDB public key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Tạo source list
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Cài đặt
sudo apt-get update
sudo apt-get install -y mongodb-org
```

#### Trên Windows:

Tải và cài đặt MongoDB từ: https://www.mongodb.com/try/download/community

### Bước 2: Tạo thư mục lưu trữ dữ liệu MongoDB

```bash
# Tạo thư mục cho MongoDB data
mkdir -p ~/VitaCareDB/db

# Kiểm tra thư mục đã tạo
ls -la ~/VitaCareDB
```

### Bước 3: Khởi động MongoDB trên cổng 27019

```bash
# Khởi động MongoDB với cổng tùy chỉnh
mongod --port 27019 --dbpath ~/VitaCareDB/db
```

**Lưu ý:** Để MongoDB chạy ở chế độ nền, mở terminal mới để tiếp tục các bước tiếp theo.

### Bước 4: Clone project và cài đặt dependencies

```bash
# Di chuyển vào thư mục backend
cd /path/to/VitaCare/backend

# Cài đặt các package cần thiết
npm install
```

### Bước 5: Chạy backend (một lệnh)

Sau khi MongoDB đã chạy, chỉ cần:

```bash
cd /path/to/VitaCare/backend
npm start
```

- Backend kết nối MongoDB và **tự động load user** từ `data/userd.json` (hoặc `data/users.json`) nếu collection `users` đang trống. Không cần chạy thêm lệnh import/seed.
- Nếu MongoDB đã có data (đã import trước đó), backend dùng luôn data đó.
- Đăng nhập trên web kiểm tra SĐT + mật khẩu với collection `users`.

**Ví dụ đăng nhập thử:** SĐT `0965813408`, mật khẩu `Huong123` (sau khi backend đã tự load từ `data/userd.json`).

*(Nếu muốn import lại user thủ công: `npm run seed-users`.)*

#### Option 1: Import tất cả dữ liệu (ngoại trừ blogs)

```bash
# Chạy script import tự động
npm run import
```

Script này sẽ:
- Quét tất cả file JSON trong thư mục `../data`
- Tạo collections tương ứng
- Import dữ liệu vào MongoDB
- **Lưu ý:** File `blogs.json` (2.2GB) sẽ bị bỏ qua do quá lớn

#### Option 2: Import blogs.json riêng (75,224 bài viết)

```bash
# Import blogs bằng mongoimport (nhanh và hiệu quả hơn)
mongoimport --port 27019 --db VitaCare --collection blogs --file ../data/blogs.json --jsonArray --drop
```

**Giải thích tham số:**
- `--port 27019`: Cổng MongoDB
- `--db VitaCare`: Tên database
- `--collection blogs`: Tên collection
- `--file ../data/blogs.json`: Đường dẫn file
- `--jsonArray`: File chứa mảng JSON
- `--drop`: Xóa collection cũ trước khi import

#### Option 3: Import tất cả (bao gồm blogs)

```bash
# Bước 1: Import dữ liệu thông thường
npm run import

# Bước 2: Import blogs riêng
mongoimport --port 27019 --db VitaCare --collection blogs --file ../data/blogs.json --jsonArray --drop
```

### Bước 6: Kiểm tra dữ liệu đã import

```bash
# Kết nối vào MongoDB shell
mongosh --port 27019

# Trong MongoDB shell, chạy các lệnh sau:
use VitaCare

# Xem danh sách collections
show collections

# Đếm số documents trong mỗi collection
db.blogs.countDocuments()      // 75,224 blogs
db.products.countDocuments()   // 8,327 sản phẩm
db.benh.countDocuments()       // 1,659 bệnh
db.users.countDocuments()      // 26 người dùng
db.quiz.countDocuments()       // 7 bộ câu hỏi
db.results.countDocuments()    // 12 kết quả
db.vinmec_playlists.countDocuments()  // 995 videos

# Thoát MongoDB shell
exit
```

## 📊 Cấu trúc dữ liệu

Sau khi import thành công, database `VitaCare` sẽ có các collections sau:

| Collection | Số lượng | Mô tả |
|-----------|----------|-------|
| `blogs` | 75,224 | Bài viết sức khỏe |
| `products` | 8,327 | Sản phẩm |
| `benh` | 1,659 | Thông tin bệnh |
| `users` | 26 | Người dùng |
| `admins` | 5 | Quản trị viên |
| `quiz` | 7 | Bộ câu hỏi sức khỏe |
| `results` | 12 | Kết quả đánh giá |
| `vinmec_playlists` | 995 | Video sức khỏe |
| `categories` | - | Danh mục sản phẩm |
| `orders` | 9 | Đơn hàng |
| `carts` | - | Giỏ hàng |
| `consultations_product` | 8,327 | Tư vấn sản phẩm |
| `consultations_prescription` | - | Tư vấn đơn thuốc |
| `promotion_*` | - | Khuyến mãi |
| `storesystem_full` | 632 | Hệ thống cửa hàng |

## 🔧 Các lệnh NPM Scripts hữu ích

```bash
# Khởi động server
npm start

# Import dữ liệu (ngoại trừ blogs)
npm run import

# Gộp dữ liệu quiz, results, vinmec
npm run merge

# Sửa lỗi $oid trong JSON files
npm run fix-json

# Import blogs riêng (sử dụng streaming - chậm)
npm run import-blogs
```

## 🤖 Chatbot (Gemini API)

Trợ lý ảo góc dưới bên phải trang my-user gọi API backend `POST /api/chat`, backend gọi Google Gemini và lấy sản phẩm từ MongoDB để gợi ý.

- **Cấu hình API key:**
  1. Tạo API key tại [Google AI Studio](https://aistudio.google.com/app/apikey).
  2. **Cách 1 – file `.env` (khuyến nghị):** Trong thư mục `backend`, copy `.env.example` thành `.env` rồi điền:
     ```
     GEMINI_API_KEY=your-api-key-here
     ```
     Chạy `npm install` (để cài `dotenv`) rồi `npm start`. Backend sẽ tự đọc `.env`.
  3. **Cách 2 – biến môi trường:** Trong cùng terminal với `npm start`:
     ```bash
     export GEMINI_API_KEY="your-api-key"
     npm start
     ```
- **Tùy chọn:** `GEMINI_CHAT_MODEL` (mặc định: `gemini-1.5-flash`).
- Nếu không set `GEMINI_API_KEY`, chatbot trả về thông báo "tạm thời chưa khả dụng".
- **Bảo mật:** Không commit file `.env` hoặc gửi API key cho người khác. Nếu key bị lộ, hãy thu hồi và tạo key mới trên Google AI Studio.

## ⚠️ Xử lý lỗi thường gặp

### Lỗi: `ECONNREFUSED`

```bash
# Nguyên nhân: MongoDB chưa chạy
# Giải pháp: Khởi động MongoDB
mongod --port 27019 --dbpath ~/VitaCareDB/db
```

### Lỗi: `address already in use`

```bash
# Nguyên nhân: Cổng 27019 đã được sử dụng
# Giải pháp: Tìm và dừng process đang dùng cổng
lsof -i :27019
kill -9 <PID>
```

### Lỗi: `Cannot create a string longer than...`

```bash
# Nguyên nhân: File quá lớn (blogs.json)
# Giải pháp: Dùng mongoimport thay vì npm run import
mongoimport --port 27019 --db VitaCare --collection blogs --file ../data/blogs.json --jsonArray --drop
```

### Lỗi: `_id fields may not contain '$'-prefixed fields`

```bash
# Nguyên nhân: Dữ liệu có trường $oid
# Giải pháp: Chạy script fix trước khi import
npm run fix-json
npm run import
```

## 🔄 Cập nhật dữ liệu

Nếu cần cập nhật dữ liệu:

```bash
# Import lại tất cả (ghi đè dữ liệu cũ)
npm run import

# Import lại blogs
mongoimport --port 27019 --db VitaCare --collection blogs --file ../data/blogs.json --jsonArray --drop
```

## 📝 Kết nối từ ứng dụng

```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27019/VitaCare', {
  // Các options đã được Mongoose tự động xử lý
});
```

## 🎯 Tóm tắt nhanh (Quick Start)

```bash
# 1. Cài MongoDB (nếu chưa có)
brew install mongodb-community

# 2. Tạo thư mục data
mkdir -p ~/VitaCareDB/db

# 3. Khởi động MongoDB (terminal 1)
mongod --port 27019 --dbpath ~/VitaCareDB/db

# 4. Mở terminal mới, cài dependencies
cd /path/to/VitaCare/backend
npm install

# 5. Import dữ liệu
npm run import

# 6. Import blogs riêng (QUAN TRỌNG!)
mongoimport --port 27019 --db VitaCare --collection blogs --file ../data/blogs.json --jsonArray --drop

# 7. Kiểm tra
mongosh --port 27019
use VitaCare
show collections
db.blogs.countDocuments()
exit
```

## 🌐 Thông tin kết nối MongoDB

- **MongoDB URI**: `mongodb://localhost:27019/VitaCare`
- **Database**: `VitaCare`
- **Port**: `27019`
- **Data Directory**: `~/VitaCareDB/db`

## 📂 Cấu trúc Backend

```
backend/
├── package.json          # Cấu hình project
├── db.js                 # Kết nối MongoDB
├── server.js             # Server chính
├── importData.js         # Import dữ liệu tự động
├── importBlogs.js        # Import blogs (streaming)
├── mergeData.js          # Gộp dữ liệu quiz/results/vinmec
├── fixJsonFiles.js       # Sửa lỗi $oid
└── README.md             # File này
```

## 📞 Hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. MongoDB đã chạy chưa: `ps aux | grep mongod`
2. Cổng 27019 có sẵn không: `lsof -i :27019`
3. Thư mục data có quyền truy cập: `ls -la ~/VitaCareDB/db`
4. Logs của MongoDB để xem chi tiết lỗi

## 🔗 Tài liệu tham khảo

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [MongoDB Import/Export](https://docs.mongodb.com/database-tools/mongoimport/)
