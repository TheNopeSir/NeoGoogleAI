
/**
 * Admin API Endpoints
 * Специальные endpoints для админ-панели
 */

import { processImage, isBase64DataUri } from './imageProcessor.js';
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
    // 🔄 Migrate Images (Convert to WebP Base64/S3 in DB)
    // ==========================================
    app.post('/api/admin/migrate-images', async (req, res) => {
        try {
            console.log('[AdminAPI] Starting comprehensive image migration...');

            const results = {
                exhibits: { processed: 0, migrated: 0, errors: 0 },
                collections: { processed: 0, migrated: 0, errors: 0 },
                wishlist: { processed: 0, migrated: 0, errors: 0 },
                users: { processed: 0, migrated: 0, errors: 0 },
            };

            // 1. EXHIBITS
            console.log('[AdminAPI] Migrating Exhibits...');
            const exhibitsResult = await query('SELECT id, data FROM exhibits');
            for (const row of exhibitsResult.rows) {
                const exhibitId = row.id;
                const data = row.data;
                let needsUpdate = false;

                try {
                    if (data.imageUrls && Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
                        const newImageUrls = [];
                        for (let i = 0; i < data.imageUrls.length; i++) {
                            const img = data.imageUrls[i];
                            let bufferToProcess = null;

                            // Handle raw Base64 strings
                            if (typeof img === 'string' && isBase64DataUri(img)) {
                                bufferToProcess = img;
                            } 
                            // Handle legacy objects with Base64
                            else if (typeof img === 'object' && isBase64DataUri(img.medium)) {
                                // Already in object format but might need re-processing/optimization? 
                                // Actually if it is base64 inside object, it means it is not S3.
                                // Let's check if we want to move to S3.
                                bufferToProcess = img.medium || img.large || img.thumbnail;
                            }

                            if (bufferToProcess) {
                                const processed = await processImage(bufferToProcess, exhibitId);
                                // If processed returns URLs (http...), we succeeded.
                                newImageUrls.push(processed);
                                needsUpdate = true;
                            } else {
                                newImageUrls.push(img);
                            }
                        }

                        if (needsUpdate) {
                            data.imageUrls = newImageUrls;
                            if (data.processedImages) delete data.processedImages;
                            await query('UPDATE exhibits SET data = $1, updated_at = NOW() WHERE id = $2', [JSON.stringify(data), exhibitId]);
                            results.exhibits.migrated++;
                        }
                    }
                    results.exhibits.processed++;
                } catch (e) {
                    console.error(`[AdminAPI] Error migrating exhibit ${exhibitId}:`, e);
                    results.exhibits.errors++;
                }
            }

            // 2. COLLECTIONS
            console.log('[AdminAPI] Migrating Collections...');
            const collectionsResult = await query('SELECT id, data FROM collections');
            for (const row of collectionsResult.rows) {
                const id = row.id;
                const data = row.data;
                try {
                    if (data.coverImage && isBase64DataUri(data.coverImage)) {
                        // processImage returns object { thumbnail, medium ... }
                        // Collections use a single string URL usually.
                        const processed = await processImage(data.coverImage, `col_${id}`);
                        // Use medium URL if available, else thumbnail
                        data.coverImage = processed.medium || processed.thumbnail; 
                        
                        await query('UPDATE collections SET data = $1, updated_at = NOW() WHERE id = $2', [JSON.stringify(data), id]);
                        results.collections.migrated++;
                    }
                    results.collections.processed++;
                } catch(e) {
                    console.error(`[AdminAPI] Error migrating collection ${id}:`, e);
                    results.collections.errors++;
                }
            }

            // 3. WISHLIST
            console.log('[AdminAPI] Migrating Wishlist...');
            const wishlistResult = await query('SELECT id, data FROM wishlist');
            for (const row of wishlistResult.rows) {
                const id = row.id;
                const data = row.data;
                try {
                    if (data.referenceImageUrl && isBase64DataUri(data.referenceImageUrl)) {
                        const processed = await processImage(data.referenceImageUrl, `wish_${id}`);
                        data.referenceImageUrl = processed.medium || processed.thumbnail;
                        
                        await query('UPDATE wishlist SET data = $1, updated_at = NOW() WHERE id = $2', [JSON.stringify(data), id]);
                        results.wishlist.migrated++;
                    }
                    results.wishlist.processed++;
                } catch(e) {
                    console.error(`[AdminAPI] Error migrating wishlist ${id}:`, e);
                    results.wishlist.errors++;
                }
            }

            // 4. USERS
            console.log('[AdminAPI] Migrating Users...');
            const usersResult = await query('SELECT username, data FROM users');
            for (const row of usersResult.rows) {
                const username = row.username;
                const data = row.data;
                let userUpdated = false;
                try {
                    if (data.avatarUrl && isBase64DataUri(data.avatarUrl)) {
                        const processed = await processImage(data.avatarUrl, `user_${username}_avatar`);
                        data.avatarUrl = processed.medium || processed.thumbnail;
                        userUpdated = true;
                    }
                    if (data.coverUrl && isBase64DataUri(data.coverUrl)) {
                        const processed = await processImage(data.coverUrl, `user_${username}_cover`);
                        data.coverUrl = processed.medium || processed.thumbnail;
                        userUpdated = true;
                    }

                    if (userUpdated) {
                        await query('UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2', [JSON.stringify(data), username]);
                        results.users.migrated++;
                    }
                    results.users.processed++;
                } catch(e) {
                    console.error(`[AdminAPI] Error migrating user ${username}:`, e);
                    results.users.errors++;
                }
            }
            
            // Invalidate cache
            cache.flushPattern('feed:');
            cache.flushPattern('collections:');
            cache.flushPattern('wishlist:');

            console.log(`[AdminAPI] Migration complete.`);

            res.json({
                success: true,
                results
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
    app.post('/api/admin/cleanup-broken', async (req, res) => {
         res.json({ success: true, message: "Use migrate-images to fix broken file paths by converting to DB storage." });
    });

    console.log('✅ [AdminAPI] Admin endpoints initialized');
}
