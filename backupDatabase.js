#!/usr/bin/env node

/**
 * Скрипт создания резервной копии exhibits из БД
 */

import pg from 'pg';
import fs from 'fs/promises';
import dotenv from 'dotenv';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    user: process.env.DB_USER || 'gen_user',
    password: process.env.DB_PASSWORD || '9H@DDCb.gQm.S}',
    host: process.env.DB_HOST || '185.152.92.64',
    port: 5432,
    database: process.env.DB_NAME || 'default_db',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    max: 10
});

async function createBackup() {
    try {
        console.log('📦 Создание резервной копии exhibits...\n');

        const result = await pool.query('SELECT id, data, updated_at FROM exhibits ORDER BY updated_at DESC');

        const backup = {
            timestamp: new Date().toISOString(),
            count: result.rows.length,
            exhibits: result.rows
        };

        const filename = `backup_exhibits_${Date.now()}.json`;
        await fs.writeFile(filename, JSON.stringify(backup, null, 2));

        console.log(`✅ Резервная копия создана: ${filename}`);
        console.log(`📊 Сохранено артефактов: ${backup.count}\n`);

        // Статистика по изображениям
        let withImages = 0;
        let withBase64 = 0;
        let withProcessed = 0;

        for (const row of result.rows) {
            const imageUrls = row.data?.imageUrls;
            if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
                withImages++;
                const first = imageUrls[0];
                if (typeof first === 'string' && first.startsWith('data:image/')) {
                    withBase64++;
                } else if (typeof first === 'object' && first.thumbnail) {
                    withProcessed++;
                }
            }
        }

        console.log('📈 Статистика:');
        console.log(`   Всего: ${backup.count}`);
        console.log(`   С изображениями: ${withImages}`);
        console.log(`   Base64: ${withBase64}`);
        console.log(`   Обработанные: ${withProcessed}`);

    } catch (error) {
        console.error('❌ Ошибка:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

createBackup();
