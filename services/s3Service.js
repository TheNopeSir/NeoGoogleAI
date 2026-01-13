import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_REGION = process.env.S3_REGION || 'ru-1';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Construct the public URL base. 
// If S3_PUBLIC_URL is defined, use it. Otherwise try to construct from endpoint and bucket.
// Timeweb example: https://<bucket>.s3.twcstorage.ru
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
        forcePathStyle: true // Timeweb and some others need this sometimes, but virtual host style is preferred if DNS works
    });
} else {
    console.warn('[S3] Missing configuration. S3 uploads will be disabled.');
}

/**
 * Upload a file buffer to S3
 * @param {Buffer} buffer - File content
 * @param {string} key - File path/name in bucket (e.g. "images/123/thumb.webp")
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
        // ACL: 'public-read' // Timeweb buckets are often public by policy, but uncomment if needed
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
 * @param {string} key - File path in bucket
 */
export async function deleteFromS3(key) {
    if (!s3Client) return;

    // If a full URL is passed, try to extract key
    if (key.startsWith('http')) {
        const urlObj = new URL(key);
        // Remove leading slash
        key = urlObj.pathname.substring(1); 
    }

    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: key
        }));
        console.log(`[S3] Deleted: ${key}`);
    } catch (error) {
        console.error(`[S3] Delete error for ${key}:`, error);
    }
}
