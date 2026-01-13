
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

// Настройки S3 (Timeweb, MinIO, AWS)
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'https://s3.twcstorage.ru';
const S3_REGION = process.env.S3_REGION || 'ru-1';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'neoarchive';

// ОПРЕДЕЛЕНИЕ ПУБЛИЧНОГО URL
// Для Timeweb S3 лучше использовать Path Style (https://endpoint/bucket/key) если нет своего домена
// Если задан S3_PUBLIC_URL в .env, используем его (например CDN)
// Иначе формируем стандартную ссылку
let S3_PUBLIC_URL = process.env.S3_PUBLIC_URL;

if (!S3_PUBLIC_URL) {
    // Если это Timeweb или MinIO, часто используется Path Style: endpoint/bucket
    // Проверим, если endpoint содержит 'twcstorage', скорее всего это Timeweb
    if (S3_ENDPOINT.includes('twcstorage') || S3_ENDPOINT.includes('localhost') || S3_ENDPOINT.includes('127.0.0.1')) {
        S3_PUBLIC_URL = `${S3_ENDPOINT}/${S3_BUCKET_NAME}`;
    } else {
        // Иначе пробуем Virtual Hosted Style: bucket.endpoint
        S3_PUBLIC_URL = S3_ENDPOINT.replace('://', `://${S3_BUCKET_NAME}.`);
    }
}

// Убираем слеш в конце, если есть
if (S3_PUBLIC_URL.endsWith('/')) {
    S3_PUBLIC_URL = S3_PUBLIC_URL.slice(0, -1);
}

let s3Client = null;

if (S3_ENDPOINT && S3_ACCESS_KEY && S3_SECRET_KEY) {
    console.log('[S3] Initializing S3 Client...');
    console.log(`[S3] Endpoint: ${S3_ENDPOINT}`);
    console.log(`[S3] Bucket: ${S3_BUCKET_NAME}`);
    console.log(`[S3] Public URL Base: ${S3_PUBLIC_URL}`);
    
    s3Client = new S3Client({
        region: S3_REGION,
        endpoint: S3_ENDPOINT,
        credentials: {
            accessKeyId: S3_ACCESS_KEY,
            secretAccessKey: S3_SECRET_KEY
        },
        forcePathStyle: true // Важно для Timeweb/MinIO
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
        ACL: 'public-read' // Явно делаем публичным
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
            // Если URL содержит наш публичный базовый URL, вырезаем его
            if (key.startsWith(S3_PUBLIC_URL)) {
                objectKey = key.replace(`${S3_PUBLIC_URL}/`, '');
            } else {
                const urlObj = new URL(key);
                // Удаляем начальный слэш из pathname
                objectKey = urlObj.pathname.substring(1);
            }
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
