
/**
 * Admin API Endpoints
 * Специальные endpoints для админ-панели
 */

import { processImage } from './imageProcessor.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Папка старых изображений (если они еще остались на диске)
const LEGACY_IMAGES_DIR = path.join(__dirname, 'uploads', 'images');

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
                withLegacyPath: 0,
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

                if (typeof firstImage === 'string') {
                    if (firstImage.startsWith('data:image/')) {
                        // Это "сырой" base64 (возможно старый png/jpeg)
                        // Проверим, WebP ли это (наш новый стандарт)
                        if (firstImage.startsWith('data:image/webp')) {
                            // Это может быть уже оптимизированная строка, если мы перешли на плоское хранение
                            // Но мы предпочитаем объектную структуру {thumbnail, medium}
                            // Если строка очень длинная, считаем "base64", если короткая - "path"?
                            // В новой схеме всё base64.
                            stats.withBase64++;
                        } else {
                             stats.withBase64++;
                        }
                    } else if (firstImage.startsWith('/api/images')) {
                         stats.withLegacyPath++;
                    }
                } else if (typeof firstImage === 'object' && firstImage.thumbnail) {
                    // Это наша целевая структура.
                    // Проверим, это base64 внутри или путь
                    if (firstImage.thumbnail.startsWith('data:')) {
                        stats.withOptimized++;
                    } else {
                        // Это старая структура с путями к файлам
                        stats.withLegacyPath++;
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
    // 🔄 Migrate Images (Convert to WebP Base64 in DB)
    // ==========================================
    app.post('/api/admin/migrate-images', async (req, res) => {
        try {
            console.log('[AdminAPI] Starting migration to DB storage...');

            const results = {
                processed: 0,
                skipped: 0,
                errors: 0,
                migrated: 0,
                details: []
            };

            // Process exhibits
            const exhibitsResult = await query('SELECT id, data FROM exhibits');
            console.log(`[AdminAPI] Found ${exhibitsResult.rows.length} exhibits`);

            for (const row of exhibitsResult.rows) {
                const exhibitId = row.id;
                const data = row.data;
                let needsUpdate = false;

                try {
                    // Check images
                    if (!data.imageUrls || !Array.isArray(data.imageUrls) || data.imageUrls.length === 0) {
                        results.skipped++;
                        continue;
                    }

                    const newImageUrls = [];

                    for (let i = 0; i < data.imageUrls.length; i++) {
                        const img = data.imageUrls[i];
                        let bufferToProcess = null;

                        // Case 1: Legacy file path (/api/images/...)
                        // Мы должны попробовать найти этот файл на диске и прочитать его
                        if (typeof img === 'string' && img.startsWith('/api/images/')) {
                            const relPath = img.replace('/api/images/', '');
                            const fullPath = path.join(LEGACY_IMAGES_DIR, relPath);
                            
                            if (fs.existsSync(fullPath)) {
                                bufferToProcess = fs.readFileSync(fullPath);
                                console.log(`[AdminAPI] Read legacy file: ${fullPath}`);
                            } else {
                                console.warn(`[AdminAPI] Legacy file missing: ${fullPath}`);
                                // Keep broken link? Or remove? Let's keep for safety.
                                newImageUrls.push(img);
                                continue;
                            }
                        }
                        // Case 2: Legacy object with file paths ({ thumbnail: '/api/...' })
                        else if (typeof img === 'object' && img.medium && img.medium.startsWith('/api/images/')) {
                            // Try to find the medium file (best quality usually available)
                            const relPath = img.medium.replace('/api/images/', '');
                            const fullPath = path.join(LEGACY_IMAGES_DIR, relPath);

                            if (fs.existsSync(fullPath)) {
                                bufferToProcess = fs.readFileSync(fullPath);
                            } else {
                                // Try large?
                                const relPathL = img.large?.replace('/api/images/', '');
                                const fullPathL = relPathL ? path.join(LEGACY_IMAGES_DIR, relPathL) : null;
                                if (fullPathL && fs.existsSync(fullPathL)) {
                                    bufferToProcess = fs.readFileSync(fullPathL);
                                } else {
                                     // Try thumbnail as last resort?
                                     const relPathT = img.thumbnail?.replace('/api/images/', '');
                                     const fullPathT = path.join(LEGACY_IMAGES_DIR, relPathT);
                                     if (fs.existsSync(fullPathT)) {
                                         bufferToProcess = fs.readFileSync(fullPathT);
                                     }
                                }
                            }
                            
                            if (!bufferToProcess) {
                                console.warn(`[AdminAPI] Legacy object files missing for ${exhibitId}`);
                                newImageUrls.push(img);
                                continue;
                            }
                        }
                        // Case 3: Raw Base64 string (Old unoptimized or New unoptimized)
                        else if (typeof img === 'string' && img.startsWith('data:image/')) {
                             // Если это уже webp, можно пропустить, если мы доверяем качеству
                             // Но лучше прогнать через процессор, чтобы убедиться в размерах
                             // Для простоты: обрабатываем всё.
                             bufferToProcess = img; // processImage handles base64 string
                        }
                        // Case 4: Already optimized object with Base64 ({ thumbnail: 'data:...' })
                        else if (typeof img === 'object' && img.thumbnail && img.thumbnail.startsWith('data:')) {
                            // Already migrated format. Skip unless forced.
                            newImageUrls.push(img);
                            continue;
                        }

                        if (bufferToProcess) {
                            // Convert to Optimized WebP Base64 Object
                            const processed = await processImage(bufferToProcess, exhibitId);
                            newImageUrls.push(processed);
                            needsUpdate = true;
                        } else {
                            // Unknown format, keep as is
                            newImageUrls.push(img);
                        }
                    }

                    if (needsUpdate) {
                        data.imageUrls = newImageUrls;
                        
                        // Clean up legacy field if it exists
                        if (data.processedImages) delete data.processedImages;

                        await query(
                            'UPDATE exhibits SET data = $1, updated_at = NOW() WHERE id = $2',
                            [JSON.stringify(data), exhibitId]
                        );
                        
                        results.migrated++;
                        console.log(`[AdminAPI] Migrated exhibit ${exhibitId}`);
                    } else {
                        results.skipped++;
                    }
                    
                    results.processed++;

                } catch (error) {
                    results.errors++;
                    console.error(`[AdminAPI] Error migrating exhibit ${exhibitId}:`, error);
                }
            }
            
            // Invalidate cache
            cache.flushPattern('feed:');

            console.log(`[AdminAPI] Migration complete. Migrated: ${results.migrated}`);

            res.json({
                success: true,
                ...results
            });

        } catch (error) {
            console.error('[AdminAPI] Migration error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // ==========================================
    // 💾 Создание резервной копии (JSON)
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
            
            // Backup now contains Base64 images inside `data`
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=backup_full_${Date.now()}.json`);
            res.send(JSON.stringify(backup, null, 2));
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==========================================
    // 🧹 Clean up broken paths (Legacy)
    // ==========================================
    // Этот эндпоинт теперь можно использовать для удаления ссылок на файлы, если они не существуют,
    // но основной метод теперь - migrate-images
    app.post('/api/admin/cleanup-broken', async (req, res) => {
         res.json({ success: true, message: "Use migrate-images to fix broken file paths by converting to DB storage." });
    });

    console.log('✅ [AdminAPI] Admin endpoints initialized');
}
