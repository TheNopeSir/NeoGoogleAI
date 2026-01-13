
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

async function migrateToS3() {
    console.log('🚀 Starting migration to S3...\n');

    try {
        // Get all exhibits
        const exhibitsResult = await pool.query('SELECT id, data FROM exhibits');
        console.log(`📦 Found ${exhibitsResult.rows.length} exhibits to process\n`);

        let processedCount = 0;
        let errorCount = 0;

        for (const row of exhibitsResult.rows) {
            const exhibitId = row.id;
            const data = row.data;
            let needsUpdate = false;

            // Check if this exhibit has images
            if (!data.imageUrls || !Array.isArray(data.imageUrls) || data.imageUrls.length === 0) {
                continue;
            }

            console.log(`📋 Processing exhibit: ${data.title || exhibitId} (${data.imageUrls.length} images)`);

            const newImageUrls = [];

            for (let i = 0; i < data.imageUrls.length; i++) {
                const img = data.imageUrls[i];

                // Case 1: Raw Base64 string -> Process to S3
                if (isBase64DataUri(img)) {
                    console.log(`   🔄 Converting Image ${i + 1} (Base64) to S3...`);
                    try {
                        const processed = await processImage(img, exhibitId);
                        newImageUrls.push(processed);
                        needsUpdate = true;
                    } catch (err) {
                        console.error(`   ❌ Failed to upload image ${i + 1}:`, err.message);
                        newImageUrls.push(img); // Keep original if failed
                        errorCount++;
                    }
                } 
                // Case 2: Already processed object (S3 URL or Legacy)
                else {
                    newImageUrls.push(img);
                }
            }

            if (needsUpdate) {
                data.imageUrls = newImageUrls;
                
                // Remove legacy fields if any
                if (data.processedImages) delete data.processedImages;

                await pool.query(
                    'UPDATE exhibits SET data = $1, updated_at = NOW() WHERE id = $2',
                    [JSON.stringify(data), exhibitId]
                );
                
                processedCount++;
                console.log(`   ✅ Updated DB record for ${exhibitId}`);
            } else {
                console.log(`   ⏭️  No changes needed`);
            }
        }

        console.log('\n\n📊 Migration Summary:');
        console.log(`   ✅ Processed/Updated: ${processedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log('\n✨ Migration complete!\n');

    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await pool.end();
    }
}

migrateToS3();
