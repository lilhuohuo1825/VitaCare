const fs = require('fs');
const path = require('path');
const { connectDB, mongoose } = require('./db');

// Đường dẫn đến thư mục data
const DATA_DIR = path.join(__dirname, '../data');

// Hàm đọc file JSON với xử lý lỗi tốt hơn
const readJSONFile = (filePath) => {
    try {
        console.log(`   📖 Đang đọc file...`);
        const data = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(data);
        console.log(`   ✓ Đọc thành công`);
        return parsed;
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error(`   ❌ Lỗi cú pháp JSON: ${error.message}`);
        } else {
            console.error(`   ❌ Lỗi đọc file: ${error.message}`);
        }
        return null;
    }
};

// Hàm lấy tất cả file JSON từ thư mục
const getAllJSONFiles = (dir, fileList = []) => {
    try {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                // Đệ quy vào thư mục con
                getAllJSONFiles(filePath, fileList);
            } else if (file.endsWith('.json') && file !== '.gitkeep') {
                fileList.push({
                    path: filePath,
                    name: file.replace('.json', ''),
                    relativePath: path.relative(DATA_DIR, filePath),
                    size: stat.size
                });
            }
        });
    } catch (error) {
        console.error(`❌ Lỗi quét thư mục ${dir}:`, error.message);
    }

    return fileList;
};

// Hàm tạo tên collection từ đường dẫn file
const getCollectionName = (relativePath) => {
    // Xóa .json và thay thế / bằng _
    return relativePath
        .replace('.json', '')
        .replace(/\//g, '_')
        .replace(/-/g, '_');
};

// Hàm format kích thước file
const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

// Hàm import dữ liệu vào MongoDB
const importData = async () => {
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    try {
        // Kết nối database
        await connectDB();

        console.log('\n📁 Đang quét thư mục data...\n');

        // Lấy tất cả file JSON
        const jsonFiles = getAllJSONFiles(DATA_DIR);

        console.log(`Tìm thấy ${jsonFiles.length} file JSON\n`);
        console.log('='.repeat(80));

        // Import từng file
        for (let i = 0; i < jsonFiles.length; i++) {
            const file = jsonFiles[i];
            const collectionName = getCollectionName(file.relativePath);

            console.log(`\n[${i + 1}/${jsonFiles.length}] ${file.relativePath}`);
            console.log(`   📊 Kích thước: ${formatFileSize(file.size)}`);
            console.log(`   🗂️  Collection: ${collectionName}`);

            try {
                const data = readJSONFile(file.path);

                if (!data) {
                    console.log(`   ⚠️  Bỏ qua (không đọc được)\n`);
                    skippedCount++;
                    continue;
                }

                // Tạo collection
                const collection = mongoose.connection.db.collection(collectionName);

                // Xóa dữ liệu cũ (nếu có)
                console.log(`   🔄 Xóa dữ liệu cũ...`);
                await collection.deleteMany({});

                // Import dữ liệu mới
                console.log(`   📥 Đang import vào MongoDB...`);
                if (Array.isArray(data)) {
                    if (data.length > 0) {
                        // Chia nhỏ nếu file quá lớn (> 10000 documents)
                        if (data.length > 10000) {
                            console.log(`   ⚡ File lớn, chia nhỏ để import...`);
                            const chunkSize = 5000;
                            for (let j = 0; j < data.length; j += chunkSize) {
                                const chunk = data.slice(j, j + chunkSize);
                                await collection.insertMany(chunk, { ordered: false });
                                console.log(`   ⏳ Đã import ${Math.min(j + chunkSize, data.length)}/${data.length}...`);
                            }
                        } else {
                            await collection.insertMany(data, { ordered: false });
                        }
                        console.log(`   ✅ Thành công: ${data.length} bản ghi`);
                        successCount++;
                    } else {
                        console.log(`   ⚠️  Mảng rỗng, bỏ qua`);
                        skippedCount++;
                    }
                } else {
                    await collection.insertOne(data);
                    console.log(`   ✅ Thành công: 1 object`);
                    successCount++;
                }
            } catch (error) {
                console.error(`   ❌ Lỗi import: ${error.message}`);
                errorCount++;
                // Tiếp tục với file tiếp theo thay vì dừng
                continue;
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n🎉 Hoàn thành quá trình import!\n');

        // Thống kê
        console.log('📊 Thống kê:');
        console.log(`   ✅ Thành công: ${successCount} file`);
        console.log(`   ❌ Lỗi: ${errorCount} file`);
        console.log(`   ⚠️  Bỏ qua: ${skippedCount} file`);
        console.log(`   📁 Tổng cộng: ${jsonFiles.length} file\n`);

        // Hiển thị danh sách collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📋 Danh sách Collections trong database VitaCare:');
        collections.forEach((col, index) => {
            console.log(`   ${index + 1}. ${col.name}`);
        });
        console.log('');

        process.exit(errorCount > 0 ? 1 : 0);
    } catch (error) {
        console.error('\n❌ Lỗi nghiêm trọng:', error);
        console.error(error.stack);
        process.exit(1);
    }
};

// Chạy import
importData();
