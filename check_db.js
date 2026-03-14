const { connectDB, mongoose } = require('./backend/db');

async function checkCollections() {
    try {
        await connectDB();
        const db = mongoose.connection.db;
        const colls = await db.listCollections().toArray();
        console.log('Collections in database:');
        for (const col of colls) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`- ${col.name}: ${count} documents`);
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkCollections();
