# VitaCare Backend - MongoDB Setup

## 📋 Yêu cầu
- Node.js (đã cài đặt)
- MongoDB (cần cài đặt)

## 🚀 Hướng dẫn Setup

### 1. Cài đặt MongoDB

#### Cách 1: Sử dụng Homebrew (macOS - Khuyến nghị)
```bash
# Cài đặt MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Khởi động MongoDB với port 27019
mongod --port 27019 --dbpath ~/VitaCareDB/db
```

#### Cách 2: Download trực tiếp
- Truy cập: https://www.mongodb.com/try/download/community
- Tải version phù hợp với hệ điều hành
- Cài đặt và chạy MongoDB

### 2. Khởi động MongoDB

Mở terminal mới và chạy:
```bash
# Tạo thư mục lưu trữ database cho MongoDB (nếu chưa có)
mkdir -p ~/VitaCareDB/db

# Khởi động MongoDB trên port 27019
mongod --port 27019 --dbpath ~/VitaCareDB/db
```

**Lưu ý**: Giữ terminal này mở khi đang sử dụng database!

### 3. Cài đặt dependencies

```bash
cd backend
npm install
```

### 4. Import dữ liệu vào MongoDB

Sau khi MongoDB đã chạy, mở terminal mới và chạy:
```bash
npm run import
```

Script sẽ:
- ✅ Kết nối với MongoDB (localhost:27019)
- 📁 Quét tất cả file JSON trong thư mục `data/`
- 📤 Import vào database `VitaCare`
- 📋 Hiển thị danh sách collections đã tạo

### 5. Khởi động server (tùy chọn)

```bash
npm start
```

## 📂 Cấu trúc Backend

```
backend/
├── package.json          # Cấu hình project và dependencies
├── db.js                 # Cấu hình kết nối MongoDB
├── server.js             # File server chính
├── importData.js         # Script import dữ liệu
└── README.md             # File này
```

## 🔧 Cấu hình MongoDB

- **Host**: localhost
- **Port**: 27019
- **Database**: VitaCare
- **Connection String**: `mongodb://localhost:27019/VitaCare`

## 📊 Collections được tạo

Script sẽ tự động import các collections từ:
- Root JSON files: admins, users, products, orders, categories, etc.
- Promotion folder: promotion_*.json
- Quiz folder: quiz_*.json
- Results folder: results_*.json
- Vinmec folder: vinmec_*.json

## ⚠️ Xử lý lỗi thường gặp

### Lỗi: "ECONNREFUSED ::1:27019"
**Nguyên nhân**: MongoDB chưa chạy hoặc chạy sai port

**Giải quyết**:
1. Kiểm tra MongoDB đang chạy: `ps aux | grep mongod`
2. Đảm bảo chạy với port 27019: `mongod --port 27019 --dbpath ~/VitaCareDB/db`

### Lỗi: "Data directory not found"
**Nguyên nhân**: Chưa tạo thư mục lưu database

**Giải quyết**:
```bash
mkdir -p ~/VitaCareDB/db
```

## 🎯 Kiểm tra kết nối

Sử dụng MongoDB Shell để kiểm tra:
```bash
# Kết nối với MongoDB
mongosh --port 27019

# Chọn database VitaCare
use VitaCare

# Xem danh sách collections
show collections

# Đếm số documents trong collection
db.users.countDocuments()
```

## 📝 Scripts NPM

- `npm start` - Khởi động server
- `npm run import` - Import dữ liệu từ folder data vào MongoDB

## 🔗 Tài liệu tham khảo

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
