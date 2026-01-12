/**
 * Admin API Endpoints
 * Специальные endpoints для админ-панели
 */

import { migrateOldImages, isBase64DataUri, deleteExhibitImages } from './imageProcessor.js';
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
    // 🔄 Миграция изображений
    // ==========================================
    app.post('/api/admin/migrate-images', async (req, res) => {
        try {
            console.log('[AdminAPI] Starting image migration...');

            const result = await query('SELECT id, data FROM exhibits ORDER BY updated_at DESC');

            let migrated = 0;
            let skipped = 0;
            let filesCreated = 0;
            const errors = [];

            for (const row of result.rows) {
                const data = row.data;
                const imageUrls = data?.imageUrls;

                if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
                    skipped++;
                    continue;
                }

                const firstImage = imageUrls[0];

                // Пропускаем уже оптимизированные
                if (typeof firstImage === 'object' && firstImage.thumbnail) {
                    skipped++;
                    continue;
                }

                // Мигрируем base64
                if (typeof firstImage === 'string' && isBase64DataUri(firstImage)) {
                    try {
                        console.log(`[AdminAPI] Migrating exhibit ${row.id}...`);
                        const processedImages = await migrateOldImages(imageUrls, row.id);

                        if (processedImages.length > 0) {
                            data.imageUrls = processedImages;

                            await query(
                                'UPDATE exhibits SET data = $1, updated_at = NOW() WHERE id = $2',
                                [data, row.id]
                            );

                            migrated++;
                            filesCreated += processedImages.length * 4; // 4 файла на изображение
                        }
                    } catch (error) {
                        console.error(`[AdminAPI] Error migrating ${row.id}:`, error);
                        errors.push({ id: row.id, error: error.message });
                    }
                }
            }

            // Инвалидируем кеш
            cache.flushPattern('feed:');
            cache.flushPattern('exhibit:');

            console.log(`[AdminAPI] Migration complete. Migrated: ${migrated}, Skipped: ${skipped}`);

            res.json({
                success: true,
                migrated,
                skipped,
                filesCreated,
                errors: errors.length > 0 ? errors : undefined
            });
        } catch (error) {
            console.error('[AdminAPI] Migration error:', error);
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

    console.log('✅ [AdminAPI] Admin endpoints initialized');
}
