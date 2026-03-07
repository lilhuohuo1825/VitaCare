/**
 * Import user từ data/userd.json (hoặc data/users.json) vào MongoDB collection "users".
 * Đăng nhập (POST /api/auth/login) kiểm tra SĐT + mật khẩu với collection này.
 *
 * Chạy: node backend/scripts/seed-users.js
 * (từ thư mục gốc project) hoặc: node scripts/seed-users.js (từ backend/)
 */
const path = require('path');
const fs = require('fs');
const { connectDB, mongoose } = require('../db');

const DATA_DIR = path.join(__dirname, '../../data');
const USERD_PATH = path.join(DATA_DIR, 'userd.json');
const USERS_PATH = path.join(DATA_DIR, 'users.json');

function getUsersPath() {
  if (fs.existsSync(USERD_PATH)) return USERD_PATH;
  return USERS_PATH;
}

async function seedUsers() {
  const usersPath = getUsersPath();
  if (!fs.existsSync(usersPath)) {
    console.error('❌ Không tìm thấy file:', usersPath);
    console.error('   Tạo data/userd.json hoặc data/users.json (mảng các user có phone, password).');
    process.exit(1);
  }
  await connectDB();
  const data = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  if (!Array.isArray(data)) {
    console.error('❌ File phải là mảng JSON (array) các đối tượng user.');
    process.exit(1);
  }
  const col = mongoose.connection.db.collection('users');
  await col.deleteMany({});
  await col.insertMany(data);
  console.log('✅ Đã import', data.length, 'user từ', path.basename(usersPath), 'vào MongoDB collection "users".');
  console.log('   Đăng nhập sẽ kiểm tra SĐT + mật khẩu với dữ liệu này.');
  process.exit(0);
}

seedUsers().catch((err) => {
  console.error(err);
  process.exit(1);
});
