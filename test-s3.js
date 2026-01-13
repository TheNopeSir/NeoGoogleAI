
import { S3Client, ListBucketsCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

// Fix for "self-signed certificate in certificate chain" error
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log('🔍 S3 Connection Diagnostic Tool');
console.log('-------------------------------');
console.log(`Endpoint: ${process.env.S3_ENDPOINT}`);
console.log(`Region:   ${process.env.S3_REGION}`);
console.log(`Bucket:   ${process.env.S3_BUCKET_NAME}`);
console.log(`Key ID:   ${process.env.S3_ACCESS_KEY ? process.env.S3_ACCESS_KEY.substring(0, 5) + '...' : 'MISSING'}`);
console.log(`Secret:   ${process.env.S3_SECRET_KEY ? '******' : 'MISSING'}`);
console.log('-------------------------------\n');

const s3Client = new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY
    },
    forcePathStyle: true
});

async function testConnection() {
    try {
        console.log('1️⃣  Testing Authentication (ListBuckets)...');
        const data = await s3Client.send(new ListBucketsCommand({}));
        console.log('   ✅ Success! Connection established.');
        console.log('   📂 Buckets found:', data.Buckets.map(b => b.Name).join(', '));
        
        console.log('\n2️⃣  Testing Write Access (Upload Test)...');
        const testKey = `test-upload-${Date.now()}.txt`;
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: testKey,
            Body: 'Hello from NeoArchive Diagnostic Tool',
            ContentType: 'text/plain',
            ACL: 'public-read'
        }));
        console.log(`   ✅ Success! Uploaded ${testKey}`);
        
        console.log('\n✨ S3 Configuration is CORRECT.');

    } catch (err) {
        console.error('\n❌ S3 Connection Failed:');
        console.error(`   Code: ${err.Code || err.name}`);
        console.error(`   Message: ${err.message}`);
        
        if (err.Code === 'InvalidAccessKeyId') {
             console.error('\n💡 HINT: Your Access Key ID is wrong. Check S3_ACCESS_KEY in .env');
        } else if (err.Code === 'SignatureDoesNotMatch') {
             console.error('\n💡 HINT: Your Secret Key is wrong. Check S3_SECRET_KEY in .env');
        } else if (err.Code === 'NetworkingError' || err.code === 'ECONNREFUSED') {
             console.error('\n💡 HINT: Endpoint is unreachable. Check S3_ENDPOINT in .env');
        }
    }
}

testConnection();
