const { connectDB } = require('./db');

// Khởi động server
const startServer = async () => {
    try {
        // Kết nối MongoDB
        await connectDB();

        console.log('\n🚀 Server VitaCare đã sẵn sàng!');
        console.log('💡 Để import dữ liệu, chạy: npm run import\n');

        // Có thể thêm Express.js server ở đây sau
        // const express = require('express');
        // const app = express();
        // const PORT = 3000;
        // app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    } catch (error) {
        console.error('❌ Lỗi khởi động server:', error);
        process.exit(1);
    }
};

startServer();
