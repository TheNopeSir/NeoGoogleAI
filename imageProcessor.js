
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';
import { uploadToS3, deleteFromS3 } from './services/s3Service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Конфигурация размеров изображений
 */
const IMAGE_SIZES = {
    thumbnail: {
        width: 300,
        height: 300,
        quality: 60,
        fit: 'cover',
        effort: 4 
    },
    medium: {
        width: 800,
        height: 800,
        quality: 75,
        fit: 'inside',
        effort: 4
    },
    large: {
        width: 1600,
        height: 1600,
        quality: 80, 
        fit: 'inside',
        effort: 4
    },
    placeholder: {
        width: 30,
        height: 30,
        quality: 20,
        fit: 'cover',
        blur: 5
    }
};

/**
 * Извлекает буфер из Base64 Data URI или URL
 */
async function getImageBuffer(input) {
    // Если это base64
    if (typeof input === 'string' && input.startsWith('data:')) {
        const matches = input.match(/^data:image\/\w+;base64,(.+)$/);
        if (!matches) throw new Error('Invalid base64 data URI');
        return Buffer.from(matches[1], 'base64');
    }
    
    // Если это буфер
    if (Buffer.isBuffer(input)) {
        return input;
    }
    
    throw new Error('Unsupported image input format');
}

/**
 * Генерирует хеш для имени файла
 */
function generateImageHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
}

/**
 * Обрабатывает одно изображение:
 * 1. Оптимизирует через Sharp
 * 2. Загружает в S3
 * 3. Возвращает объект с URL-ами
 */
export async function processImage(inputImage, exhibitId) {
    try {
        // Если это уже URL (например, при обновлении записи без изменения картинки)
        if (typeof inputImage === 'string' && inputImage.startsWith('http')) {
            return {
                thumbnail: inputImage,
                medium: inputImage,
                large: inputImage
            };
        }
        
        // Если это объект ProcessedImage, возвращаем как есть
        if (typeof inputImage === 'object' && inputImage.thumbnail && !Buffer.isBuffer(inputImage)) {
            return inputImage;
        }

        const buffer = await getImageBuffer(inputImage);
        
        // Получаем метаданные
        const metadata = await sharp(buffer).metadata();
        const hash = generateImageHash(buffer);
        
        const results = {};

        // Генерируем версии и загружаем в S3
        for (const [sizeName, config] of Object.entries(IMAGE_SIZES)) {
            let pipeline = sharp(buffer)
                .resize(config.width, config.height, {
                    fit: config.fit,
                    withoutEnlargement: true
                });

            if (config.blur) {
                pipeline = pipeline.blur(config.blur);
            }

            // Конвертируем в WebP buffer
            const outputBuffer = await pipeline
                .webp({
                    quality: config.quality,
                    effort: config.effort,
                    smartSubsample: true
                })
                .toBuffer();

            // Формируем путь в S3: exhibits/{exhibitId}/{hash}_{size}.webp
            const s3Key = `exhibits/${exhibitId}/${hash}_${sizeName}.webp`;

            // Загружаем в S3
            // Если это placeholder, можно оставить base64 для мгновенной загрузки (LCP optimization)
            if (sizeName === 'placeholder') {
                 results[sizeName] = `data:image/webp;base64,${outputBuffer.toString('base64')}`;
            } else {
                 results[sizeName] = await uploadToS3(outputBuffer, s3Key, 'image/webp');
            }
        }

        return {
            ...results,
            originalFormat: metadata.format,
            originalWidth: metadata.width,
            originalHeight: metadata.height
        };

    } catch (error) {
        console.error('[ImageProcessor] Error processing/uploading image:', error);
        // Fallback: возвращаем base64 если S3 упал, чтобы не терять данные (хотя это "раздует" базу)
        if (typeof inputImage === 'string' && inputImage.startsWith('data:')) {
            console.warn('[ImageProcessor] Falling back to Base64 storage due to error');
            return {
                thumbnail: inputImage,
                medium: inputImage, 
                large: inputImage
            };
        }
        throw error;
    }
}

/**
 * Обрабатывает массив изображений
 */
export async function processExhibitImages(images, exhibitId) {
    if (!Array.isArray(images) || images.length === 0) {
        return [];
    }

    const results = [];

    for (const img of images) {
        try {
            // Если изображение уже обработано (это объект с ключами-ссылками), оставляем
            if (typeof img === 'object' && img.thumbnail && img.medium) {
                results.push(img); 
            } else {
                // Это новая "сырая" строка base64 или буфер -> в S3
                const processed = await processImage(img, exhibitId);
                results.push(processed);
            }
        } catch (error) {
            console.error('[ImageProcessor] Failed to process individual image:', error.message);
            // Если не удалось обработать, сохраняем как есть (fallback)
            if (typeof img === 'string') {
                 results.push({
                     thumbnail: img,
                     medium: img,
                     large: img
                 });
            }
        }
    }

    return results;
}

/**
 * Удаляет изображения артефакта из S3
 * (Вызывается при удалении артефакта)
 */
export async function deleteExhibitImages(exhibitId, imageUrls) {
    if (!imageUrls || !Array.isArray(imageUrls)) return;
    
    console.log(`[ImageProcessor] Deleting S3 images for ${exhibitId}...`);
    
    for (const img of imageUrls) {
        if (typeof img === 'object') {
            // Удаляем все версии
            if (img.thumbnail && img.thumbnail.startsWith('http')) await deleteFromS3(img.thumbnail);
            if (img.medium && img.medium.startsWith('http')) await deleteFromS3(img.medium);
            if (img.large && img.large.startsWith('http')) await deleteFromS3(img.large);
        }
    }
}

export function getImagesDir() {
    return path.join(__dirname, 'uploads', 'images'); // Legacy path for fallback
}

export function isBase64DataUri(str) {
    return typeof str === 'string' && str.startsWith('data:image/');
}
