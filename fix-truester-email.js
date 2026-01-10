/**
 * Emergency fix script to restore Truester's email
 * Run with: node fix-truester-email.js
 */

import pkg from 'pg';
const { Pool } = pkg;

const dbUser = process.env.DB_USER || 'gen_user';
const dbHost = process.env.DB_HOST || '185.152.92.64';
const dbName = process.env.DB_NAME || 'default_db';
const dbPass = process.env.DB_PASSWORD || '9H@DDCb.gQm.S}';
const dbPort = 5432;

const pool = new Pool({
    user: dbUser,
    password: dbPass,
    host: dbHost,
    port: dbPort,
    database: dbName,
    ssl: {
        rejectUnauthorized: false
    }
});

async function fixTruesterEmail() {
    try {
        console.log('🔍 Checking Truester user...');

        // Get current user data
        const result = await pool.query(
            `SELECT * FROM users WHERE LOWER(username) = LOWER($1)`,
            ['Truester']
        );

        if (result.rows.length === 0) {
            console.log('❌ User "Truester" not found');
            await pool.end();
            return;
        }

        const user = result.rows[0];
        const userData = user.data;

        console.log('📧 Current email:', userData.email || '(none)');

        // Check if email needs to be restored
        if (userData.email === 'kennyornope@gmail.com') {
            console.log('✅ Email is already correct!');
            await pool.end();
            return;
        }

        // Restore the email
        userData.email = 'kennyornope@gmail.com';

        await pool.query(
            `UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`,
            [userData, 'Truester']
        );

        console.log('✅ Successfully restored email to: kennyornope@gmail.com');
        console.log('🔐 User can now login with email and password');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

fixTruesterEmail();
