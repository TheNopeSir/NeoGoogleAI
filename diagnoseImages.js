#!/usr/bin/env node
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Fix for "self-signed certificate in certificate chain" error
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, 'uploads', 'images');

// Database connection
const dbUser = process.env.DB_USER || 'gen_user';
const dbHost = process.env.DB_HOST || '185.152.92.64';
const dbName = process.env.DB_NAME || 'default_db';
const dbPass = process.env.DB_PASSWORD || '9H@DDCb.gQm.S}';
const dbPort = 5432;

const pool = new pg.Pool({
    user: dbUser,
    password: dbPass,
    host: dbHost,
    port: dbPort,
    database: dbName,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    max: 10
});

// Helper: Check if string is base64 data URI
function isBase64DataUri(str) {
    return typeof str === 'string' && str.startsWith('data:image/');
}

// Helper: Check if image file exists
function checkImageFileExists(imagePath) {
    if (typeof imagePath !== 'string' || !imagePath.startsWith('/api/images/')) {
        return false;
    }
    const relativePath = imagePath.replace('/api/images/', '');
    const fullPath = path.join(IMAGES_DIR, relativePath);
    try {
        return fs.access(fullPath).then(() => true).catch(() => false);
    } catch {
        return false;
    }
}

// Main diagnosis function
async function diagnoseImages() {
    console.log('🔍 Диагностика изображений в базе данных...\n');

    try {
        // Get all exhibits
        const result = await pool.query('SELECT id, data FROM exhibits ORDER BY updated_at DESC');
        const exhibits = result.rows;

        const stats = {
            totalExhibits: exhibits.length,
            withImages: 0,
            withBase64: 0,
            withProcessed: 0,
            withBrokenPaths: 0,
            withMixed: 0,
            noImages: 0,
            base64Examples: [],
            brokenExamples: [],
            processedExamples: []
        };

        console.log('📊 Анализ артефактов...\n');

        for (const exhibit of exhibits) {
            const data = exhibit.data;
            const imageUrls = data?.imageUrls;

            if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
                stats.noImages++;
                continue;
            }

            stats.withImages++;

            const firstImage = imageUrls[0];
            let hasBase64 = false;
            let hasProcessed = false;
            let hasBroken = false;

            // Check all images in this exhibit
            for (const img of imageUrls) {
                if (typeof img === 'string' && isBase64DataUri(img)) {
                    hasBase64 = true;
                } else if (typeof img === 'object' && img.thumbnail && img.medium && img.large) {
                    hasProcessed = true;
                    // Check if files exist
                    const thumbnailExists = await checkImageFileExists(img.thumbnail);
                    const mediumExists = await checkImageFileExists(img.medium);
                    const largeExists = await checkImageFileExists(img.large);
                    if (!thumbnailExists || !mediumExists || !largeExists) {
                        hasBroken = true;
                    }
                } else if (typeof img === 'string' && img.startsWith('/api/images/')) {
                    // Old format with just path
                    const exists = await checkImageFileExists(img);
                    if (!exists) {
                        hasBroken = true;
                    }
                }
            }

            if (hasBase64 && hasProcessed) {
                stats.withMixed++;
            } else if (hasBase64) {
                stats.withBase64++;
                if (stats.base64Examples.length < 3) {
                    stats.base64Examples.push({
                        id: data.id || exhibit.id,
                        title: data.title || 'Без названия',
                        imageCount: imageUrls.length
                    });
                }
            } else if (hasProcessed) {
                stats.withProcessed++;
                if (stats.processedExamples.length < 3) {
                    stats.processedExamples.push({
                        id: data.id || exhibit.id,
                        title: data.title || 'Без названия',
                        imageCount: imageUrls.length
                    });
                }
            }

            if (hasBroken) {
                stats.withBrokenPaths++;
                if (stats.brokenExamples.length < 3) {
                    stats.brokenExamples.push({
                        id: data.id || exhibit.id,
                        title: data.title || 'Без названия',
                        imageCount: imageUrls.length
                    });
                }
            }
        }

        // Print results
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📈 СТАТИСТИКА ИЗОБРАЖЕНИЙ');
        console.log('═══════════════════════════════════════════════════════════\n');

        console.log(`Всего артефактов: ${stats.totalExhibits}`);
        console.log(`  ├─ С изображениями: ${stats.withImages}`);
        console.log(`  └─ Без изображений: ${stats.noImages}\n`);

        console.log('Типы изображений:');
        console.log(`  ├─ 📦 Base64 (нужна миграция): ${stats.withBase64} (${((stats.withBase64/stats.totalExhibits)*100).toFixed(1)}%)`);
        console.log(`  ├─ ✅ Обработанные (WebP): ${stats.withProcessed} (${((stats.withProcessed/stats.totalExhibits)*100).toFixed(1)}%)`);
        console.log(`  ├─ ⚠️  Смешанные (base64 + WebP): ${stats.withMixed}`);
        console.log(`  └─ ❌ Битые пути (404): ${stats.withBrokenPaths}\n`);

        if (stats.base64Examples.length > 0) {
            console.log('📦 Примеры артефактов с Base64:');
            stats.base64Examples.forEach((ex, i) => {
                console.log(`  ${i + 1}. ${ex.title} (ID: ${ex.id}, изображений: ${ex.imageCount})`);
            });
            console.log('');
        }

        if (stats.brokenExamples.length > 0) {
            console.log('❌ Примеры артефактов с битыми путями:');
            stats.brokenExamples.forEach((ex, i) => {
                console.log(`  ${i + 1}. ${ex.title} (ID: ${ex.id}, изображений: ${ex.imageCount})`);
            });
            console.log('');
        }

        if (stats.processedExamples.length > 0) {
            console.log('✅ Примеры обработанных артефактов:');
            stats.processedExamples.forEach((ex, i) => {
                console.log(`  ${i + 1}. ${ex.title} (ID: ${ex.id}, изображений: ${ex.imageCount})`);
            });
            console.log('');
        }

        console.log('═══════════════════════════════════════════════════════════');
        console.log('💡 РЕКОМЕНДАЦИИ');
        console.log('═══════════════════════════════════════════════════════════\n');

        if (stats.withBase64 > 0) {
            console.log(`⚠️  Найдено ${stats.withBase64} артефактов с Base64 изображениями`);
            console.log('   Запустите миграцию: node migrateImages.js --execute\n');
        }

        if (stats.withBrokenPaths > 0) {
            console.log(`⚠️  Найдено ${stats.withBrokenPaths} артефактов с битыми путями`);
            console.log('   Запустите очистку: node cleanupOrphanedImages.js --execute\n');
        }

        if (stats.withBase64 === 0 && stats.withBrokenPaths === 0) {
            console.log('✅ Все изображения в порядке! Миграция не требуется.\n');
        }

        // Check disk usage
        try {
            const files = await fs.readdir(IMAGES_DIR, { recursive: true });
            const imageFiles = files.filter(f => f.endsWith('.webp'));
            console.log(`💾 На диске: ${imageFiles.length} WebP файлов\n`);
        } catch (error) {
            console.log('💾 Директория изображений пуста или не существует\n');
        }

    } catch (error) {
        console.error('❌ Ошибка при диагностике:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run diagnosis
diagnoseImages();
