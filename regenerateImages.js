import pg from 'pg';
import dotenv from 'dotenv';
import { processImage, isBase64DataUri } from './imageProcessor.js';

// Fix for "self-signed certificate in certificate chain" error
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config();

const { Pool } = pg;

const dbUser = process.env.DB_USER || 'gen_user';
const dbHost = process.env.DB_HOST || '185.152.92.64';
const dbName = process.env.DB_NAME || 'default_db';
const dbPass = process.env.DB_PASSWORD || '9H@DDCb.gQm.S}';
const dbPort = 5432;

const pool = new Pool({
    user: dbUser,
    password: dbPass,
    host: dbHost,
    port: dbPort,
    database: dbName,
    ssl: { rejectUnauthorized: false }
});

async function regenerateExhibitImages() {
    console.log('🚀 Starting image regeneration...\n');

    try {
        // Get all exhibits
        const exhibitsResult = await pool.query('SELECT id, data FROM exhibits');
        console.log(`📦 Found ${exhibitsResult.rows.length} exhibits to process\n`);

        let processedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const row of exhibitsResult.rows) {
            const exhibitId = row.id;
            const data = row.data;

            console.log(`\n📋 Processing exhibit: ${data.title || exhibitId}`);

            // Check if this exhibit has base64 images
            if (!data.imageUrls || !Array.isArray(data.imageUrls)) {
                console.log(`   ⏭️  No imageUrls field, skipping...`);
                skippedCount++;
                continue;
            }

            // Check if images are already processed (webp paths)
            const hasBase64 = data.imageUrls.some(url => isBase64DataUri(url));
            const hasProcessedImages = data.processedImages && data.processedImages.length > 0;

            if (!hasBase64 && hasProcessedImages) {
                console.log(`   ✅ Already has processed images, skipping...`);
                skippedCount++;
                continue;
            }

            if (!hasBase64) {
                console.log(`   ⚠️  No base64 images found, but missing processed images!`);
                skippedCount++;
                continue;
            }

            console.log(`   🔄 Found ${data.imageUrls.length} base64 images to process`);

            try {
                // Process each base64 image
                const processedImages = [];

                for (let i = 0; i < data.imageUrls.length; i++) {
                    const imageUrl = data.imageUrls[i];

                    if (isBase64DataUri(imageUrl)) {
                        console.log(`   📸 Processing image ${i + 1}/${data.imageUrls.length}...`);
                        const result = await processImage(imageUrl, exhibitId);
                        processedImages.push(result);
                    } else {
                        console.log(`   ⏭️  Image ${i + 1} is not base64, skipping...`);
                    }
                }

                // Update the database with processed images
                data.processedImages = processedImages;

                await pool.query(
                    'UPDATE exhibits SET data = $1, updated_at = NOW() WHERE id = $2',
                    [JSON.stringify(data), exhibitId]
                );

                console.log(`   ✅ Successfully processed ${processedImages.length} images`);
                processedCount++;

            } catch (error) {
                console.error(`   ❌ Error processing exhibit ${exhibitId}:`, error.message);
                errorCount++;
            }
        }

        // Process collections
        console.log('\n\n📚 Processing collections...\n');
        const collectionsResult = await pool.query('SELECT id, data FROM collections');
        console.log(`📦 Found ${collectionsResult.rows.length} collections to process\n`);

        for (const row of collectionsResult.rows) {
            const collectionId = row.id;
            const data = row.data;

            console.log(`\n📋 Processing collection: ${data.title || collectionId}`);

            // Check if this collection has base64 images
            if (!data.imageUrls || !Array.isArray(data.imageUrls)) {
                console.log(`   ⏭️  No imageUrls field, skipping...`);
                skippedCount++;
                continue;
            }

            const hasBase64 = data.imageUrls.some(url => isBase64DataUri(url));
            const hasProcessedImages = data.processedImages && data.processedImages.length > 0;

            if (!hasBase64 && hasProcessedImages) {
                console.log(`   ✅ Already has processed images, skipping...`);
                skippedCount++;
                continue;
            }

            if (!hasBase64) {
                console.log(`   ⚠️  No base64 images found, but missing processed images!`);
                skippedCount++;
                continue;
            }

            console.log(`   🔄 Found ${data.imageUrls.length} base64 images to process`);

            try {
                // Process each base64 image
                const processedImages = [];

                for (let i = 0; i < data.imageUrls.length; i++) {
                    const imageUrl = data.imageUrls[i];

                    if (isBase64DataUri(imageUrl)) {
                        console.log(`   📸 Processing image ${i + 1}/${data.imageUrls.length}...`);
                        const result = await processImage(imageUrl, collectionId);
                        processedImages.push(result);
                    } else {
                        console.log(`   ⏭️  Image ${i + 1} is not base64, skipping...`);
                    }
                }

                // Update the database with processed images
                data.processedImages = processedImages;

                await pool.query(
                    'UPDATE collections SET data = $1, updated_at = NOW() WHERE id = $2',
                    [JSON.stringify(data), collectionId]
                );

                console.log(`   ✅ Successfully processed ${processedImages.length} images`);
                processedCount++;

            } catch (error) {
                console.error(`   ❌ Error processing collection ${collectionId}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n\n📊 Summary:');
        console.log(`   ✅ Successfully processed: ${processedCount}`);
        console.log(`   ⏭️  Skipped: ${skippedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);

        console.log('\n✨ Image regeneration complete!\n');

    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await pool.end();
    }
}

// Run the migration
regenerateExhibitImages();
