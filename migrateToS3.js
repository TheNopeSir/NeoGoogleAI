
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processExhibitImages, processSingleImage, isBase64DataUri, getImagesDir } from './imageProcessor.js';

// Fix for "self-signed certificate in certificate chain" error
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function migrateExhibits() {
    console.log('\n📦 --- PROCESSING EXHIBITS ---');
    const result = await pool.query('SELECT id, data FROM exhibits');
    console.log(`Found ${result.rows.length} exhibits.`);

    let updated = 0;

    for (const row of result.rows) {
        const { id, data } = row;
        if (!data.imageUrls || !Array.isArray(data.imageUrls) || data.imageUrls.length === 0) continue;

        let needsUpdate = false;
        
        // Check if any image is Base64 or Legacy Path
        const hasBase64 = data.imageUrls.some(img => {
            if (typeof img === 'string') return isBase64DataUri(img) || img.includes('/api/images/');
            if (typeof img === 'object') return isBase64DataUri(img.medium) || (img.medium && img.medium.includes('/api/images/'));
            return false;
        });

        if (hasBase64) {
            console.log(`   🔄 Migrating exhibit: ${data.title || id}`);
            try {
                // processExhibitImages handles both raw strings and legacy objects, ensuring output is S3 objects
                const newImages = await processExhibitImages(data.imageUrls, id);
                
                // Validate that we actually got S3 links (simple check for http)
                const isSuccess = newImages.some(img => img.medium && img.medium.startsWith('http'));
                
                if (isSuccess) {
                    data.imageUrls = newImages;
                    if (data.processedImages) delete data.processedImages; // Cleanup legacy

                    await pool.query(
                        'UPDATE exhibits SET data = $1, updated_at = NOW() WHERE id = $2',
                        [JSON.stringify(data), id]
                    );
                    updated++;
                    console.log(`      ✅ Saved S3 URLs for ${id}`);
                } else {
                    console.log(`      ⚠️ Warning: Processing returned no HTTP links for ${id}`);
                }
            } catch (e) {
                console.error(`      ❌ Failed to process exhibit ${id}:`, e.message);
            }
        }
    }
    console.log(`📦 Exhibits Updated: ${updated}`);
}

async function migrateCollections() {
    console.log('\nbh --- PROCESSING COLLECTIONS ---');
    const result = await pool.query('SELECT id, data FROM collections');
    console.log(`Found ${result.rows.length} collections.`);

    let updated = 0;

    for (const row of result.rows) {
        const { id, data } = row;
        if (data.coverImage && isBase64DataUri(data.coverImage)) {
            console.log(`   🔄 Migrating collection cover: ${data.title || id}`);
            try {
                const s3Url = await processSingleImage(data.coverImage, `col_${id}`);
                if (s3Url && s3Url.startsWith('http')) {
                    data.coverImage = s3Url;
                    await pool.query(
                        'UPDATE collections SET data = $1, updated_at = NOW() WHERE id = $2',
                        [JSON.stringify(data), id]
                    );
                    updated++;
                    console.log(`      ✅ Updated collection ${id}`);
                }
            } catch (e) {
                console.error(`      ❌ Failed collection ${id}:`, e.message);
            }
        }
    }
    console.log(`bh Collections Updated: ${updated}`);
}

async function migrateUsers() {
    console.log('\n👤 --- PROCESSING USERS ---');
    const result = await pool.query('SELECT username, data FROM users');
    console.log(`Found ${result.rows.length} users.`);

    let updated = 0;

    for (const row of result.rows) {
        const { username, data } = row;
        let userModified = false;

        if (data.avatarUrl && isBase64DataUri(data.avatarUrl)) {
            console.log(`   🔄 Migrating avatar for: ${username}`);
            try {
                const s3Url = await processSingleImage(data.avatarUrl, `user_${username}_avatar`);
                if (s3Url && s3Url.startsWith('http')) {
                    data.avatarUrl = s3Url;
                    userModified = true;
                }
            } catch (e) { console.error(`      ❌ Failed avatar ${username}`, e.message); }
        }

        if (data.coverUrl && isBase64DataUri(data.coverUrl)) {
            console.log(`   🔄 Migrating cover for: ${username}`);
            try {
                const s3Url = await processSingleImage(data.coverUrl, `user_${username}_cover`);
                if (s3Url && s3Url.startsWith('http')) {
                    data.coverUrl = s3Url;
                    userModified = true;
                }
            } catch (e) { console.error(`      ❌ Failed cover ${username}`, e.message); }
        }

        if (userModified) {
            await pool.query(
                'UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2',
                [JSON.stringify(data), username]
            );
            updated++;
            console.log(`      ✅ Updated user ${username}`);
        }
    }
    console.log(`👤 Users Updated: ${updated}`);
}

async function migrateWishlist() {
    console.log('\n✨ --- PROCESSING WISHLIST ---');
    const result = await pool.query('SELECT id, data FROM wishlist');
    console.log(`Found ${result.rows.length} wishlist items.`);

    let updated = 0;

    for (const row of result.rows) {
        const { id, data } = row;
        if (data.referenceImageUrl && isBase64DataUri(data.referenceImageUrl)) {
            console.log(`   🔄 Migrating wishlist item: ${data.title || id}`);
            try {
                const s3Url = await processSingleImage(data.referenceImageUrl, `wish_${id}`);
                if (s3Url && s3Url.startsWith('http')) {
                    data.referenceImageUrl = s3Url;
                    await pool.query(
                        'UPDATE wishlist SET data = $1, updated_at = NOW() WHERE id = $2',
                        [JSON.stringify(data), id]
                    );
                    updated++;
                    console.log(`      ✅ Updated wishlist ${id}`);
                }
            } catch (e) {
                console.error(`      ❌ Failed wishlist ${id}:`, e.message);
            }
        }
    }
    console.log(`✨ Wishlist Items Updated: ${updated}`);
}

async function runFullMigration() {
    console.log('🚀 STARTING FULL S3 MIGRATION...\n');
    
    try {
        await migrateExhibits();
        await migrateCollections();
        await migrateUsers();
        await migrateWishlist();
        console.log('\n🏁 ALL MIGRATIONS COMPLETE.');
    } catch (e) {
        console.error('\n💀 CRITICAL MIGRATION ERROR:', e);
    } finally {
        await pool.end();
    }
}

runFullMigration();
