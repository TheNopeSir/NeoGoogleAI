import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const S3_ENDPOINT = process.env.S3_ENDPOINT || 'https://s3.twcstorage.ru';
const S3_REGION = process.env.S3_REGION || 'ru-1';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Construct the public URL base. 
// If S3_PUBLIC_URL is defined in env, use it. Otherwise try to construct from endpoint and bucket.
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
        // Timeweb specific: sometimes path style is needed if DNS isn't ready, but usually virtual host is fine.
        forcePathStyle: true 
    });
} else {
    console.warn('[S3] Missing configuration. S3 uploads will be disabled. Check .env file.');
}

/**
 * Upload a file buffer to S3
 * @param {Buffer} buffer - File content
 * @param {string} key - File path/name in bucket (e.g. "exhibits/123/thumb.webp")
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} - Public URL of the uploaded file
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
        // ACL: 'public-read' // Uncomment if bucket isn't public by default
    });

    try {
        await s3Client.send(command);
        // Return absolute URL
        return `${S3_PUBLIC_URL}/${key}`;
    } catch (error) {
        console.error(`[S3] Upload error for ${key}:`, error);
        throw error;
    }
}

/**
 * Delete a file from S3
 * @param {string} key - File path in bucket or full URL
 */
export async function deleteFromS3(key) {
    if (!s3Client) return;

    // If a full URL is passed, try to extract key
    // Example: https://bucket.s3.ru/exhibits/1.webp -> exhibits/1.webp
    let objectKey = key;
    if (key.startsWith('http')) {
        try {
            const urlObj = new URL(key);
            // Remove leading slash from pathname
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
