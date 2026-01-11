/**
 * Guestbook Verification Script
 *
 * This script checks the guestbook table and displays its contents
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost/neogoogleai';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function verifyGuestbook() {
    console.log('Checking guestbook...\n');

    try {
        // Get all guestbook entries
        const result = await pool.query('SELECT id, data, created_at, updated_at FROM guestbook ORDER BY updated_at DESC');
        const entries = result.rows;

        console.log(`📊 Total guestbook entries: ${entries.length}\n`);

        if (entries.length === 0) {
            console.log('⚠️  Guestbook is empty!');
        } else {
            console.log('Guestbook entries:');
            console.log('─'.repeat(80));

            for (const entry of entries) {
                const data = entry.data;
                console.log(`ID: ${entry.id}`);
                console.log(`Author: ${data.author || 'N/A'}`);
                console.log(`Target: ${data.targetUser || 'N/A'}`);
                console.log(`Text: ${data.text || 'N/A'}`);
                console.log(`Timestamp: ${data.timestamp || entry.updated_at}`);
                console.log(`Created: ${entry.created_at}`);
                console.log(`Updated: ${entry.updated_at}`);
                console.log('─'.repeat(80));
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run verification
verifyGuestbook().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
