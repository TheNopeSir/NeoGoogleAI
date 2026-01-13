
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processImage, isBase64DataUri, getImagesDir } from './imageProcessor.js';

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

async function migrateToS3() {
    console.log('🚀 Starting ROBUST migration to S3...\n');

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
            let needsUpdate = false;

            // Check if this exhibit has images
            if (!data.imageUrls || !Array.isArray(data.imageUrls) || data.imageUrls.length === 0) {
                continue;
            }

            // Optimization: check if ALL images are already on S3 (contain s3 bucket name or endpoint)
            const allS3 = data.imageUrls.every(img => {
                const url = typeof img === 'object' ? img.medium : img;
                return typeof url === 'string' && (url.includes('twcstorage') || url.includes('amazonaws') || url.includes(process.env.S3_BUCKET_NAME));
            });

            if (allS3) {
                skippedCount++;
                continue; // Skip logs for clean items
            }

            console.log(`📋 Processing exhibit: ${data.title || exhibitId}`);

            const newImageUrls = [];

            for (let i = 0; i < data.imageUrls.length; i++) {
                const img = data.imageUrls[i];
                let bufferToProcess = null;

                // --- CASE 1: Raw Base64 string ---
                if (isBase64DataUri(img)) {
                    console.log(`   🔄 Image ${i + 1}: Found Base64 string, converting...`);
                    bufferToProcess = img; // processImage handles base64 string
                } 
                // --- CASE 2: Legacy local file path (Relative or Absolute) ---
                else if (typeof img === 'string' && (img.includes('/api/images/') || img.includes('uploads/'))) {
                    console.log(`   🔄 Image ${i + 1}: Found legacy path, reading file...`);
                    // Extract relative path
                    let relPath = img;
                    if (img.includes('/api/images/')) {
                        relPath = img.split('/api/images/')[1];
                    } else if (img.includes('uploads/')) {
                        relPath = img.split('uploads/')[1];
                    }
                    
                    if (relPath) {
                        // Try typical locations
                        const possiblePaths = [
                            path.join(getImagesDir(), relPath),
                            path.join(__dirname, 'uploads', relPath),
                            path.join(__dirname, relPath)
                        ];

                        for (const p of possiblePaths) {
                            if (fs.existsSync(p)) {
                                try {
                                    bufferToProcess = fs.readFileSync(p);
                                    break;
                                } catch (e) {
                                    console.error(`   ❌ Error reading ${p}:`, e.message);
                                }
                            }
                        }

                        if (!bufferToProcess) {
                            console.warn(`   ⚠️ File missing on disk (checked multiple paths for ${relPath})`);
                            newImageUrls.push(img); // Keep broken link
                            continue;
                        }
                    } else {
                         newImageUrls.push(img);
                         continue;
                    }
                }
                // --- CASE 3: Object with nested Base64 strings (NEW FIX) ---
                else if (typeof img === 'object' && (isBase64DataUri(img.large) || isBase64DataUri(img.medium) || isBase64DataUri(img.thumbnail))) {
                     console.log(`   🔄 Image ${i + 1}: Found Object with Base64 data, extracting...`);
                     // Prefer large, then medium, then thumbnail
                     bufferToProcess = img.large || img.medium || img.thumbnail;
                }
                // --- CASE 4: Legacy Object with local paths ---
                else if (typeof img === 'object' && img.medium && (img.medium.includes('/api/images/') || img.medium.includes('uploads/'))) {
                     console.log(`   🔄 Image ${i + 1}: Found legacy object path, re-processing...`);
                     const pathStr = img.medium;
                     let relPath = pathStr.includes('/api/images/') ? pathStr.split('/api/images/')[1] : pathStr;
                     
                     const fullPath = path.join(getImagesDir(), relPath);
                     if (fs.existsSync(fullPath)) {
                         bufferToProcess = fs.readFileSync(fullPath);
                     } else {
                         // Try large?
                         const pathStrL = img.large || '';
                         const relPathL = pathStrL.includes('/api/images/') ? pathStrL.split('/api/images/')[1] : pathStrL;
                         const fullPathL = relPathL ? path.join(getImagesDir(), relPathL) : null;
                         
                         if (fullPathL && fs.existsSync(fullPathL)) {
                             bufferToProcess = fs.readFileSync(fullPathL);
                         } else {
                             console.warn(`   ⚠️ Source files missing for object, skipping.`);
                             newImageUrls.push(img);
                             continue;
                         }
                     }
                }
                // --- CASE 5: Already S3 ---
                else if ((typeof img === 'string' && img.startsWith('http')) || (typeof img === 'object' && img.medium && img.medium.startsWith('http'))) {
                     newImageUrls.push(img);
                     continue;
                }
                 // --- CASE 6: Just a filename? ---
                else if (typeof img === 'string' && !img.includes('/') && img.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
                     console.log(`   🔄 Image ${i + 1}: Found filename, checking uploads...`);
                     const fullPath = path.join(getImagesDir(), img);
                     if (fs.existsSync(fullPath)) {
                         bufferToProcess = fs.readFileSync(fullPath);
                     } else {
                         console.log(`   ❓ Image ${i + 1}: File ${img} not found locally.`);
                         newImageUrls.push(img);
                         continue;
                     }
                }
                // --- DEFAULT ---
                else {
                    console.log(`   ❓ Image ${i + 1}: Unknown format (${typeof img}), keeping as is.`);
                    if (typeof img === 'string') console.log(`      Value: ${img.substring(0, 50)}...`);
                    else console.log(`      Value: ${JSON.stringify(img).substring(0, 50)}...`);
                    newImageUrls.push(img);
                    continue;
                }

                // If we found something to upload
                if (bufferToProcess) {
                    try {
                        const processed = await processImage(bufferToProcess, exhibitId);
                        newImageUrls.push(processed);
                        needsUpdate = true;
                        console.log(`   ✅ Image ${i + 1}: Uploaded to S3`);
                    } catch (err) {
                        console.error(`   ❌ Failed to upload image ${i + 1}:`, err.message);
                        newImageUrls.push(img); // Keep original if failed
                        errorCount++;
                    }
                }
            }

            if (needsUpdate) {
                data.imageUrls = newImageUrls;
                
                // Remove legacy fields
                if (data.processedImages) delete data.processedImages;

                await pool.query(
                    'UPDATE exhibits SET data = $1, updated_at = NOW() WHERE id = $2',
                    [JSON.stringify(data), exhibitId]
                );
                
                processedCount++;
                console.log(`   💾 Updated DB record for ${exhibitId}`);
            } else {
                skippedCount++;
            }
        }

        console.log('\n\n📊 Migration Summary:');
        console.log(`   ✅ Records Updated: ${processedCount}`);
        console.log(`   ⏭️  Records Skipped: ${skippedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log('\n✨ Migration complete!\n');

    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await pool.end();
    }
}

migrateToS3();
