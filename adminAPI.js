/**
 * Admin API Endpoints
 * Специальные endpoints для админ-панели
 */

import { deleteExhibitImages, processImage, isBase64DataUri } from './imageProcessor.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, 'uploads', 'images');

// Проверка существования файла изображения
function checkImageFileExists(imagePath) {
    if (!imagePath || typeof imagePath !== 'string' || !imagePath.startsWith('/api/images/')) {
        return false;
    }
    const relativePath = imagePath.replace('/api/images/', '');
    const fullPath = path.join(IMAGES_DIR, relativePath);
    return fs.existsSync(fullPath);
}

export function setupAdminAPI(app, query, cache) {

    // ==========================================
    // 📊 Статистика изображений
    // ==========================================
    app.get('/api/admin/image-stats', async (req, res) => {
        try {
            const result = await query('SELECT id, data FROM exhibits');

            const stats = {
                totalExhibits: result.rows.length,
                withImages: 0,
                withBase64: 0,
                withOptimized: 0,
                withBroken: 0,
                noImages: 0
            };

            for (const row of result.rows) {
                const imageUrls = row.data?.imageUrls;

                if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
                    stats.noImages++;
                    continue;
                }

                stats.withImages++;
                const firstImage = imageUrls[0];

                // Base64 изображения
                if (typeof firstImage === 'string' && isBase64DataUri(firstImage)) {
                    stats.withBase64++;
                }
                // Оптимизированные изображения
                else if (typeof firstImage === 'object' && firstImage.thumbnail) {
                    stats.withOptimized++;

                    // Проверка существования файлов
                    const exists = checkImageFileExists(firstImage.thumbnail);
                    if (!exists) {
                        stats.withBroken++;
                    }
                }
            }

            res.json(stats);
        } catch (error) {
            console.error('[AdminAPI] Error getting stats:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });


    // ==========================================
    // 💾 Создание резервной копии
    // ==========================================
    app.post('/api/admin/create-backup', async (req, res) => {
        try {
            console.log('[AdminAPI] Creating backup...');

            const result = await query('SELECT id, data, updated_at FROM exhibits ORDER BY updated_at DESC');

            const backup = {
                timestamp: new Date().toISOString(),
                count: result.rows.length,
                exhibits: result.rows
            };

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=backup_${Date.now()}.json`);
            res.send(JSON.stringify(backup, null, 2));

            console.log(`[AdminAPI] Backup created: ${result.rows.length} exhibits`);
        } catch (error) {
            console.error('[AdminAPI] Backup error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==========================================
    // 📥 Импорт SQL дампа
    // ==========================================
    app.post('/api/admin/import-sql', async (req, res) => {
        try {
            // TODO: Реализовать импорт SQL через веб-интерфейс
            // Это сложнее, так как требует выполнения SQL на сервере
            res.json({
                success: false,
                error: 'SQL импорт пока не реализован через веб-интерфейс. Используйте: ./importSQL.sh filename.sql --execute'
            });
        } catch (error) {
            console.error('[AdminAPI] SQL import error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==========================================
    // 🔄 Regenerate Images from Base64
    // ==========================================
    app.post('/api/admin/regenerate-images', async (req, res) => {
        try {
            console.log('[AdminAPI] Starting image regeneration...');

            const results = {
                processed: 0,
                skipped: 0,
                errors: 0,
                details: []
            };

            // Process exhibits
            const exhibitsResult = await query('SELECT id, data FROM exhibits');
            console.log(`[AdminAPI] Found ${exhibitsResult.rows.length} exhibits`);

            for (const row of exhibitsResult.rows) {
                const exhibitId = row.id;
                const data = row.data;

                try {
                    // Check if this exhibit has imageUrls
                    if (!data.imageUrls || !Array.isArray(data.imageUrls) || data.imageUrls.length === 0) {
                        results.skipped++;
                        continue;
                    }

                    // Check if we have base64 images
                    const hasBase64 = data.imageUrls.some(url => isBase64DataUri(url));

                    // Check if processed images exist and if their physical files are present
                    const hasProcessedImages = data.processedImages && data.processedImages.length > 0;
                    let needsRegeneration = false;

                    if (hasProcessedImages) {
                        // Check if physical files exist
                        const firstImage = data.processedImages[0];
                        if (firstImage && firstImage.thumbnail) {
                            const fileExists = checkImageFileExists(firstImage.thumbnail);
                            if (!fileExists) {
                                needsRegeneration = true;
                                console.log(`[AdminAPI] Physical files missing for exhibit: ${data.title || exhibitId}`);
                            }
                        }
                    }

                    // Skip if files exist and no regeneration needed
                    if (hasProcessedImages && !needsRegeneration) {
                        results.skipped++;
                        continue;
                    }

                    // Skip if no base64 data to regenerate from
                    if (!hasBase64 && needsRegeneration) {
                        results.errors++;
                        results.details.push({
                            id: exhibitId,
                            title: data.title,
                            status: 'error',
                            error: 'Physical files missing and no base64 data available'
                        });
                        continue;
                    }

                    // Skip if no base64 data at all
                    if (!hasBase64) {
                        results.skipped++;
                        continue;
                    }

                    // Process each base64 image
                    const processedImages = [];

                    for (let i = 0; i < data.imageUrls.length; i++) {
                        const imageUrl = data.imageUrls[i];

                        if (isBase64DataUri(imageUrl)) {
                            const result = await processImage(imageUrl, exhibitId);
                            processedImages.push(result);
                        }
                    }

                    // Update the database with processed images
                    data.processedImages = processedImages;

                    await query(
                        'UPDATE exhibits SET data = $1, updated_at = NOW() WHERE id = $2',
                        [JSON.stringify(data), exhibitId]
                    );

                    results.processed++;
                    results.details.push({
                        id: exhibitId,
                        title: data.title,
                        images: processedImages.length,
                        status: 'success'
                    });

                    console.log(`[AdminAPI] Processed exhibit: ${data.title || exhibitId} (${processedImages.length} images)`);

                } catch (error) {
                    results.errors++;
                    results.details.push({
                        id: exhibitId,
                        title: data.title,
                        status: 'error',
                        error: error.message
                    });
                    console.error(`[AdminAPI] Error processing exhibit ${exhibitId}:`, error);
                }
            }

            // Process collections
            const collectionsResult = await query('SELECT id, data FROM collections');
            console.log(`[AdminAPI] Found ${collectionsResult.rows.length} collections`);

            for (const row of collectionsResult.rows) {
                const collectionId = row.id;
                const data = row.data;

                try {
                    // Check if this collection has imageUrls
                    if (!data.imageUrls || !Array.isArray(data.imageUrls) || data.imageUrls.length === 0) {
                        results.skipped++;
                        continue;
                    }

                    // Check if we have base64 images
                    const hasBase64 = data.imageUrls.some(url => isBase64DataUri(url));

                    // Check if processed images exist and if their physical files are present
                    const hasProcessedImages = data.processedImages && data.processedImages.length > 0;
                    let needsRegeneration = false;

                    if (hasProcessedImages) {
                        // Check if physical files exist
                        const firstImage = data.processedImages[0];
                        if (firstImage && firstImage.thumbnail) {
                            const fileExists = checkImageFileExists(firstImage.thumbnail);
                            if (!fileExists) {
                                needsRegeneration = true;
                                console.log(`[AdminAPI] Physical files missing for collection: ${data.title || collectionId}`);
                            }
                        }
                    }

                    // Skip if files exist and no regeneration needed
                    if (hasProcessedImages && !needsRegeneration) {
                        results.skipped++;
                        continue;
                    }

                    // Skip if no base64 data to regenerate from
                    if (!hasBase64 && needsRegeneration) {
                        results.errors++;
                        results.details.push({
                            id: collectionId,
                            title: data.title,
                            status: 'error',
                            error: 'Physical files missing and no base64 data available'
                        });
                        continue;
                    }

                    // Skip if no base64 data at all
                    if (!hasBase64) {
                        results.skipped++;
                        continue;
                    }

                    // Process each base64 image
                    const processedImages = [];

                    for (let i = 0; i < data.imageUrls.length; i++) {
                        const imageUrl = data.imageUrls[i];

                        if (isBase64DataUri(imageUrl)) {
                            const result = await processImage(imageUrl, collectionId);
                            processedImages.push(result);
                        }
                    }

                    // Update the database with processed images
                    data.processedImages = processedImages;

                    await query(
                        'UPDATE collections SET data = $1, updated_at = NOW() WHERE id = $2',
                        [JSON.stringify(data), collectionId]
                    );

                    results.processed++;
                    results.details.push({
                        id: collectionId,
                        title: data.title,
                        images: processedImages.length,
                        status: 'success'
                    });

                    console.log(`[AdminAPI] Processed collection: ${data.title || collectionId} (${processedImages.length} images)`);

                } catch (error) {
                    results.errors++;
                    results.details.push({
                        id: collectionId,
                        title: data.title,
                        status: 'error',
                        error: error.message
                    });
                    console.error(`[AdminAPI] Error processing collection ${collectionId}:`, error);
                }
            }

            console.log(`[AdminAPI] Image regeneration complete. Processed: ${results.processed}, Skipped: ${results.skipped}, Errors: ${results.errors}`);

            res.json({
                success: true,
                ...results
            });

        } catch (error) {
            console.error('[AdminAPI] Regenerate images error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    console.log('✅ [AdminAPI] Admin endpoints initialized');
}
