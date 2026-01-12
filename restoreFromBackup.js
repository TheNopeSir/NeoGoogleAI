#!/usr/bin/env node

/**
 * Скрипт восстановления exhibits из резервной копии
 *
 * Использование:
 *   node restoreFromBackup.js <backup_file.json>
 *   node restoreFromBackup.js <backup_file.json> --execute
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

async function restoreFromBackup(backupFile, execute = false) {
    try {
        console.log(`📂 Чтение резервной копии: ${backupFile}\n`);

        const content = await fs.readFile(backupFile, 'utf-8');
        const backup = JSON.parse(content);

        console.log(`📅 Дата создания бэкапа: ${backup.timestamp}`);
        console.log(`📊 Артефактов в бэкапе: ${backup.count}\n`);

        if (!execute) {
            console.log('🧪 РЕЖИМ АНАЛИЗА (без изменений)\n');
        } else {
            console.log('✅ РЕЖИМ ВОССТАНОВЛЕНИЯ\n');
        }

        // Получаем текущее состояние БД
        const current = await pool.query('SELECT id, data FROM exhibits');
        const currentMap = new Map(current.rows.map(r => [r.id, r.data]));

        let restored = 0;
        let skipped = 0;
        let updated = 0;

        for (const exhibit of backup.exhibits) {
            const id = exhibit.id;
            const backupData = exhibit.data;
            const backupImages = backupData?.imageUrls;

            // Проверяем есть ли изображения в бэкапе
            if (!backupImages || !Array.isArray(backupImages) || backupImages.length === 0) {
                skipped++;
                continue;
            }

            // Проверяем текущее состояние
            const currentData = currentMap.get(id);
            const currentImages = currentData?.imageUrls;

            // Если текущий артефакт БЕЗ изображений, а в бэкапе ЕСТЬ
            if (!currentImages || currentImages.length === 0) {
                console.log(`✅ ${id}: Восстановление изображений`);
                console.log(`   Тип: ${typeof backupImages[0]}`);

                if (execute) {
                    try {
                        await pool.query(
                            'UPDATE exhibits SET data = $1, updated_at = NOW() WHERE id = $2',
                            [backupData, id]
                        );
                        restored++;
                    } catch (error) {
                        console.error(`   ❌ Ошибка: ${error.message}`);
                    }
                } else {
                    restored++;
                }
            } else {
                // У артефакта уже есть изображения
                console.log(`⏭️  ${id}: Пропускаем (уже есть изображения)`);
                updated++;
            }
        }

        console.log('\n╔══════════════════════════════════════╗');
        console.log('║     РЕЗУЛЬТАТЫ ВОССТАНОВЛЕНИЯ        ║');
        console.log('╠══════════════════════════════════════╣');
        console.log(`║ Восстановлено:             ${String(restored).padStart(9)} ║`);
        console.log(`║ Уже с изображениями:       ${String(updated).padStart(9)} ║`);
        console.log(`║ Пропущено (нет в бэкапе):  ${String(skipped).padStart(9)} ║`);
        console.log('╚══════════════════════════════════════╝\n');

        if (!execute && restored > 0) {
            console.log('💡 Для выполнения восстановления запустите:');
            console.log(`   node restoreFromBackup.js ${backupFile} --execute\n`);
        }

    } catch (error) {
        console.error('❌ Ошибка:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Main
const args = process.argv.slice(2);
const backupFile = args[0];
const execute = args.includes('--execute');

if (!backupFile) {
    console.log('❌ Не указан файл резервной копии\n');
    console.log('Использование:');
    console.log('  node restoreFromBackup.js <backup_file.json>           - Анализ');
    console.log('  node restoreFromBackup.js <backup_file.json> --execute - Восстановление\n');
    process.exit(1);
}

restoreFromBackup(backupFile, execute);
