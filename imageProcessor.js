import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Папка для хранения изображений
const IMAGES_DIR = path.join(__dirname, 'uploads', 'images');

// Убедимся что директория существует
try {
    await fs.mkdir(IMAGES_DIR, { recursive: true });
    console.log('[ImageProcessor] Images directory initialized:', IMAGES_DIR);
} catch (error) {
    console.error('[ImageProcessor] Failed to create images directory:', error);
    throw error;
}

/**
 * Конфигурация размеров изображений
 */
const IMAGE_SIZES = {
    thumbnail: {
        width: 240,
        height: 240,
        quality: 45, // Агрессивное сжатие для превью в ленте
        fit: 'cover',
        effort: 6, // Максимальная оптимизация WebP (медленнее, но меньше размер)
        smartSubsample: true // Лучшее сжатие цветности
    },
    medium: {
        width: 800,
        height: 800,
        quality: 70, // Сбалансированное качество для просмотра
        fit: 'inside',
        effort: 4,
        smartSubsample: true
    },
    large: {
        width: 1200,
        height: 1200,
        quality: 80, // Хорошее качество для зума
        fit: 'inside',
        effort: 4,
        smartSubsample: true
    },
    placeholder: {
        width: 20,
        height: 20,
        quality: 20, // Минимальное размытое превью
        fit: 'cover',
        blur: 10 // Сильное размытие
    }
};

/**
 * Извлекает буфер из Base64 Data URI
 * @param {string} dataUri - Base64 Data URI (например, "data:image/jpeg;base64,...")
 * @returns {Buffer} - Буфер изображения
 */
function base64ToBuffer(dataUri) {
    const matches = dataUri.match(/^data:image\/\w+;base64,(.+)$/);
    if (!matches) {
        throw new Error('Invalid base64 data URI');
    }
    return Buffer.from(matches[1], 'base64');
}

/**
 * Генерирует уникальное имя файла на основе содержимого
 * @param {Buffer} buffer - Буфер изображения
 * @returns {string} - Хеш-имя файла (без расширения)
 */
function generateImageHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
}

/**
 * Обрабатывает одно изображение и создает версии разных размеров
 * @param {string} base64DataUri - Base64 Data URI изображения
 * @param {string} exhibitId - ID артефакта (для организации папок)
 * @returns {Object} - Объект с путями к разным версиям изображения
 */
export async function processImage(base64DataUri, exhibitId) {
    try {
        console.log(`[ImageProcessor] Processing image for exhibit ${exhibitId}...`);

        // Конвертируем Base64 в Buffer
        const buffer = base64ToBuffer(base64DataUri);

        // Генерируем уникальное имя
        const hash = generateImageHash(buffer);

        // Создаем папку для артефакта
        const exhibitDir = path.join(IMAGES_DIR, exhibitId);
        await fs.mkdir(exhibitDir, { recursive: true });
        console.log(`[ImageProcessor] Created directory: ${exhibitDir}`);

        // Получаем метаданные изображения
        const metadata = await sharp(buffer).metadata();

        // Обрабатываем изображение в разные размеры
        const results = {};

        for (const [sizeName, config] of Object.entries(IMAGE_SIZES)) {
            const filename = `${hash}_${sizeName}.webp`;
            const filepath = path.join(exhibitDir, filename);

            // Создаем оптимизированную версию
            let pipeline = sharp(buffer)
                .resize(config.width, config.height, {
                    fit: config.fit,
                    withoutEnlargement: true // Не увеличивать маленькие изображения
                });

            // Применяем размытие для placeholder
            if (config.blur) {
                pipeline = pipeline.blur(config.blur);
            }

            // Применяем WebP с оптимизациями
            pipeline = pipeline.webp({
                quality: config.quality,
                effort: config.effort || 4,
                smartSubsample: config.smartSubsample || false
            });

            await pipeline.toFile(filepath);

            console.log(`[ImageProcessor] Saved ${sizeName}: ${filepath} (${config.width}x${config.height} q${config.quality})`);

            // Сохраняем относительный путь для API
            results[sizeName] = `/api/images/${exhibitId}/${filename}`;
        }

        console.log(`[ImageProcessor] Successfully processed image for exhibit ${exhibitId}`);

        return {
            success: true,
            ...results,
            originalFormat: metadata.format,
            originalWidth: metadata.width,
            originalHeight: metadata.height
        };

    } catch (error) {
        console.error('[ImageProcessor] Error processing image:', error);
        throw error;
    }
}

/**
 * Обрабатывает массив изображений для артефакта
 * @param {string[]} base64Images - Массив Base64 Data URI
 * @param {string} exhibitId - ID артефакта
 * @returns {Array} - Массив объектов с путями к обработанным изображениям
 */
export async function processExhibitImages(base64Images, exhibitId) {
    if (!Array.isArray(base64Images) || base64Images.length === 0) {
        return [];
    }

    const results = [];

    for (const base64Image of base64Images) {
        try {
            const processed = await processImage(base64Image, exhibitId);
            results.push(processed);
        } catch (error) {
            console.error('[ImageProcessor] Failed to process image:', error);
            // Пропускаем неудачные изображения
        }
    }

    return results;
}

/**
 * Удаляет все изображения артефакта
 * @param {string} exhibitId - ID артефакта
 */
export async function deleteExhibitImages(exhibitId) {
    try {
        const exhibitDir = path.join(IMAGES_DIR, exhibitId);
        await fs.rm(exhibitDir, { recursive: true, force: true });
        console.log(`[ImageProcessor] Deleted images for exhibit ${exhibitId}`);
    } catch (error) {
        console.error('[ImageProcessor] Error deleting images:', error);
    }
}

/**
 * Возвращает путь к директории с изображениями
 */
export function getImagesDir() {
    return IMAGES_DIR;
}

/**
 * Проверяет, является ли строка Base64 Data URI
 * @param {string} str - Проверяемая строка
 * @returns {boolean}
 */
export function isBase64DataUri(str) {
    return typeof str === 'string' && str.startsWith('data:image/');
}

/**
 * Проверяет существование всех размеров WebP файлов для изображения
 * @param {string} exhibitId - ID артефакта
 * @param {string} hash - Хеш изображения
 * @returns {Promise<boolean>} - true если все файлы существуют
 */
export async function checkWebPFilesExist(exhibitId, hash) {
    try {
        const exhibitDir = path.join(IMAGES_DIR, exhibitId);

        // Проверяем все 4 размера
        for (const sizeName of Object.keys(IMAGE_SIZES)) {
            const filename = `${hash}_${sizeName}.webp`;
            const filepath = path.join(exhibitDir, filename);

            try {
                await fs.access(filepath);
            } catch {
                return false; // Хотя бы один файл не найден
            }
        }

        return true; // Все файлы существуют
    } catch (error) {
        return false;
    }
}

/**
 * Получает пути к существующим WebP файлам
 * @param {string} exhibitId - ID артефакта
 * @param {string} hash - Хеш изображения
 * @returns {Object} - Объект с путями к разным версиям изображения
 */
export function getWebPPaths(exhibitId, hash) {
    const results = {};

    for (const sizeName of Object.keys(IMAGE_SIZES)) {
        const filename = `${hash}_${sizeName}.webp`;
        results[sizeName] = `/api/images/${exhibitId}/${filename}`;
    }

    return {
        success: true,
        ...results
    };
}

/**
 * "Умное" восстановление изображения:
 * - Проверяет существование WebP файлов на диске
 * - Если файлы есть - возвращает пути к ним
 * - Если файлов нет - создает их из base64
 * @param {string} base64DataUri - Base64 Data URI изображения
 * @param {string} exhibitId - ID артефакта
 * @returns {Object} - Объект с путями к разным версиям изображения
 */
export async function smartRestoreImage(base64DataUri, exhibitId) {
    try {
        console.log(`[ImageProcessor] Smart restoring image for exhibit ${exhibitId}...`);

        // Конвертируем Base64 в Buffer для получения хеша
        const buffer = base64ToBuffer(base64DataUri);
        const hash = generateImageHash(buffer);

        // Проверяем, существуют ли уже WebP файлы
        const filesExist = await checkWebPFilesExist(exhibitId, hash);

        if (filesExist) {
            console.log(`[ImageProcessor] Found existing WebP files for ${exhibitId}/${hash}, reusing them`);
            return getWebPPaths(exhibitId, hash);
        }

        // Файлов нет - создаем новые
        console.log(`[ImageProcessor] WebP files not found for ${exhibitId}/${hash}, creating new ones`);
        return await processImage(base64DataUri, exhibitId);

    } catch (error) {
        console.error('[ImageProcessor] Error in smart restore:', error);
        throw error;
    }
}

/**
 * "Умное" восстановление массива изображений
 * @param {string[]|Object[]} imageUrls - Массив Base64 Data URI или уже обработанных изображений
 * @param {string} exhibitId - ID артефакта
 * @returns {Array} - Массив объектов с путями к обработанным изображениям
 */
export async function smartRestoreImages(imageUrls, exhibitId) {
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
        return [];
    }

    const results = [];
    let reused = 0;
    let created = 0;

    for (const imageUrl of imageUrls) {
        // Если это уже новый формат (объект с путями), проверяем существование файлов
        if (typeof imageUrl === 'object' && imageUrl.thumbnail) {
            // Проверяем, существуют ли физические файлы
            const imagePath = imageUrl.thumbnail.replace('/api/images/', '');
            const parts = imagePath.split('/');
            const exhibitIdFromPath = parts[0];
            const filename = parts[1];
            const hash = filename.split('_')[0];

            const filesExist = await checkWebPFilesExist(exhibitIdFromPath, hash);

            if (filesExist) {
                results.push(imageUrl);
                reused++;
                console.log(`[ImageProcessor] Existing optimized image verified: ${exhibitIdFromPath}/${hash}`);
            } else {
                console.warn(`[ImageProcessor] Optimized image paths exist in DB but files missing: ${exhibitIdFromPath}/${hash}`);
                // Не добавляем в результаты - файлы отсутствуют
            }
            continue;
        }

        // Если это Base64, используем умное восстановление
        if (isBase64DataUri(imageUrl)) {
            try {
                const restored = await smartRestoreImage(imageUrl, exhibitId);
                results.push(restored);

                if (restored.success) {
                    // Проверяем, были ли файлы переиспользованы или созданы заново
                    const buffer = base64ToBuffer(imageUrl);
                    const hash = generateImageHash(buffer);
                    const wasExisting = await checkWebPFilesExist(exhibitId, hash);
                    if (wasExisting) {
                        reused++;
                    } else {
                        created++;
                    }
                }
            } catch (error) {
                console.error('[ImageProcessor] Failed to restore image:', error);
                // Пропускаем неудачные изображения
            }
        }
    }

    console.log(`[ImageProcessor] Smart restore complete: ${reused} reused, ${created} created`);
    return results;
}

/**
 * Мигрирует старые Base64 изображения в новый формат
 * @param {string[]} oldImageUrls - Массив старых Base64 Data URI
 * @param {string} exhibitId - ID артефакта
 * @returns {Array} - Массив объектов с новыми путями
 */
export async function migrateOldImages(oldImageUrls, exhibitId) {
    if (!Array.isArray(oldImageUrls) || oldImageUrls.length === 0) {
        return [];
    }

    const results = [];

    for (const imageUrl of oldImageUrls) {
        // Если это уже новый формат (объект с путями), пропускаем
        if (typeof imageUrl === 'object' && imageUrl.thumbnail) {
            results.push(imageUrl);
            continue;
        }

        // Если это Base64, обрабатываем
        if (isBase64DataUri(imageUrl)) {
            try {
                const processed = await processImage(imageUrl, exhibitId);
                results.push(processed);
            } catch (error) {
                console.error('[ImageProcessor] Failed to migrate image:', error);
            }
        }
    }

    return results;
}
