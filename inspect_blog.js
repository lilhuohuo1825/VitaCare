const { MongoClient } = require('mongodb');

async function main() {
    const client = new MongoClient('mongodb://localhost:27019');
    try {
        await client.connect();
        const db = client.db('VitaCare');

        // Try both collections
        const collections = ['blogs', 'blog'];
        for (const collName of collections) {
            const coll = db.collection(collName);
            const doc = await coll.findOne({ title: /Omega/i });
            if (doc) {
                console.log(`--- Collection: ${collName} ---`);
                console.log(JSON.stringify(doc, null, 2));
                return;
            }
        }

        // If not found by Omega, just get any one
        for (const collName of collections) {
            const coll = db.collection(collName);
            const doc = await coll.findOne({});
            if (doc) {
                console.log(`--- Collection: ${collName} (Any) ---`);
                console.log(JSON.stringify(doc, null, 2));
                return;
            }
        }

        console.log('No blogs found in either collection.');
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

main();
