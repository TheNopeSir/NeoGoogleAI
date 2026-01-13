
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

// Настройки S3 (Timeweb, MinIO, AWS)
// Добавьте эти переменные в ваш .env файл
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'https://s3.twcstorage.ru';
const S3_REGION = process.env.S3_REGION || 'ru-1';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'neoarchive';

// Формируем публичный URL. 
// Если задан S3_PUBLIC_URL (CDN), используем его. Иначе пытаемся собрать из эндпоинта.
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL || `${S3_ENDPOINT}`.replace('://', `://${S3_BUCKET_NAME}.`);

let s3Client = null;

if (S3_ENDPOINT && S3_ACCESS_KEY && S3_SECRET_KEY) {
    console.log('[S3] Initializing S3 Client...');
    console.log(`[S3] Endpoint: ${S3_ENDPOINT}`);
    console.log(`[S3] Bucket: ${S3_BUCKET_NAME}`);
    
    s3Client = new S3Client({
        region: S3_REGION,
        endpoint: S3_ENDPOINT,
        credentials: {
            accessKeyId: S3_ACCESS_KEY,
            secretAccessKey: S3_SECRET_KEY
        },
        // Для Timeweb/MinIO часто нужно forcePathStyle: true, если DNS не настроен на бакеты
        forcePathStyle: true 
    });
} else {
    console.warn('[S3] ⚠️ Missing configuration. S3 uploads will be disabled. Check .env file.');
}

/**
 * Загрузка буфера в S3
 * @param {Buffer} buffer - Содержимое файла
 * @param {string} key - Путь в бакете (например "exhibits/123/thumb.webp")
 * @param {string} contentType - MIME тип
 * @returns {Promise<string>} - Публичная ссылка на файл
 */
export async function uploadToS3(buffer, key, contentType = 'image/webp') {
    if (!s3Client) {
        throw new Error('S3 Client not configured');
    }

    const command = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // ACL: 'public-read' // Раскомментировать, если бакет закрыт по умолчанию
    });

    try {
        await s3Client.send(command);
        // Возвращаем абсолютный URL
        return `${S3_PUBLIC_URL}/${key}`;
    } catch (error) {
        console.error(`[S3] Upload error for ${key}:`, error);
        throw error;
    }
}

/**
 * Удаление файла из S3
 * @param {string} key - Путь в бакете или полный URL
 */
export async function deleteFromS3(key) {
    if (!s3Client) return;

    // Если передан полный URL, пытаемся извлечь ключ
    let objectKey = key;
    if (key.startsWith('http')) {
        try {
            const urlObj = new URL(key);
            // Удаляем начальный слэш из pathname
            objectKey = urlObj.pathname.substring(1); 
        } catch (e) {
            console.warn('[S3] Could not parse URL for deletion:', key);
            return;
        }
    }

    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: objectKey
        }));
        console.log(`[S3] Deleted: ${objectKey}`);
    } catch (error) {
        console.error(`[S3] Delete error for ${objectKey}:`, error);
    }
}
