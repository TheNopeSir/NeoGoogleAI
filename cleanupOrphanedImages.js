#!/usr/bin/env node

/**
 * Утилита для очистки путей к несуществующим изображениям
 *
 * Проблема:
 * - В БД записаны пути к файлам (/api/images/...)
 * - Но физические файлы не существуют
 * - Исходные base64 данные удалены
 *
 * Решение:
 * - Проверяет каждый артефакт на существование файлов
 * - Очищает поле imageUrls если файлы не найдены
 * - Пользователи смогут заново загрузить изображения
 *
 * Использование:
 *   node cleanupOrphanedImages.js              - Анализ
 *   node cleanupOrphanedImages.js --dry-run    - Тестовый запуск
 *   node cleanupOrphanedImages.js --execute    - Очистить некорректные пути
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix for "self-signed certificate in certificate chain" error
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config();

const { Pool } = pg;

// Database connection
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
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    max: 10
});

const query = (text, params) => pool.query(text, params);

const IMAGES_DIR = path.join(__dirname, 'uploads', 'images');

// ==========================================
// 🔍 ФУНКЦИЯ ПРОВЕРКИ ФАЙЛОВ
// ==========================================
function checkImageFileExists(imagePath) {
    if (!imagePath) return false;

    // Извлекаем путь: /api/images/exhibitId/filename.webp -> exhibitId/filename.webp
    const relativePath = imagePath.replace('/api/images/', '');
    const fullPath = path.join(IMAGES_DIR, relativePath);

    return fs.existsSync(fullPath);
}

// ==========================================
// 📊 АНАЛИЗ БАЗЫ ДАННЫХ
// ==========================================
async function analyzeDatabase() {
    console.log('\n🔍 Анализ базы данных...\n');

    const result = await query(`
        SELECT id, data
        FROM exhibits
        ORDER BY updated_at DESC
    `);

    const stats = {
        total: result.rows.length,
        withImages: 0,
        validImages: 0,
        orphanedImages: 0,
        orphanedExhibits: []
    };

    for (const row of result.rows) {
        const data = row.data;
        const imageUrls = data.imageUrls;

        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            continue;
        }

        stats.withImages++;

        const firstImage = imageUrls[0];

        // Проверяем только оптимизированный формат
        if (typeof firstImage === 'object' && firstImage.thumbnail) {
            const fileExists = checkImageFileExists(firstImage.thumbnail);

            if (fileExists) {
                stats.validImages++;
            } else {
                stats.orphanedImages++;
                stats.orphanedExhibits.push({
                    id: row.id,
                    title: data.title,
                    missingPath: firstImage.thumbnail,
                    imagesCount: imageUrls.length
                });
            }
        }
    }

    console.log('╔══════════════════════════════════════╗');
    console.log('║    СТАТИСТИКА ПРОБЛЕМНЫХ АРТЕФАКТОВ  ║');
    console.log('╠══════════════════════════════════════╣');
    console.log(`║ Всего артефактов:          ${String(stats.total).padStart(9)} ║`);
    console.log(`║ С изображениями:           ${String(stats.withImages).padStart(9)} ║`);
    console.log(`║ ✅ Файлы существуют:        ${String(stats.validImages).padStart(9)} ║`);
    console.log(`║ ❌ Файлы отсутствуют:       ${String(stats.orphanedImages).padStart(9)} ║`);
    console.log('╚══════════════════════════════════════╝\n');

    if (stats.orphanedExhibits.length > 0) {
        console.log('❌ Артефакты с несуществующими файлами:\n');
        for (const item of stats.orphanedExhibits.slice(0, 20)) {
            console.log(`  • ${item.id}`);
            console.log(`    "${item.title}"`);
            console.log(`    Путь: ${item.missingPath}`);
            console.log('');
        }
        if (stats.orphanedExhibits.length > 20) {
            console.log(`  ... и ещё ${stats.orphanedExhibits.length - 20} артефактов\n`);
        }
    }

    return stats;
}

// ==========================================
// 🧹 ОЧИСТКА НЕКОРРЕКТНЫХ ПУТЕЙ
// ==========================================
async function cleanupOrphanedPaths(dryRun = true) {
    console.log(dryRun ? '\n🧪 ТЕСТОВЫЙ РЕЖИМ (dry-run)\n' : '\n✅ РЕЖИМ ВЫПОЛНЕНИЯ\n');

    const result = await query(`
        SELECT id, data
        FROM exhibits
        ORDER BY updated_at DESC
    `);

    let processed = 0;
    let cleaned = 0;
    let errors = 0;

    for (const row of result.rows) {
        const data = row.data;
        const imageUrls = data.imageUrls;

        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            continue;
        }

        const firstImage = imageUrls[0];

        // Проверяем только оптимизированный формат
        if (typeof firstImage === 'object' && firstImage.thumbnail) {
            const fileExists = checkImageFileExists(firstImage.thumbnail);

            if (!fileExists) {
                processed++;
                console.log(`\n[${processed}] Обработка артефакта: ${row.id}`);
                console.log(`    Название: ${data.title || 'Без названия'}`);
                console.log(`    Отсутствует: ${firstImage.thumbnail}`);

                if (!dryRun) {
                    try {
                        // Очищаем поле imageUrls
                        delete data.imageUrls;

                        await query(
                            'UPDATE exhibits SET data = $1, updated_at = NOW() WHERE id = $2',
                            [JSON.stringify(data), row.id]
                        );

                        console.log(`    ✓ Поле imageUrls очищено`);
                        cleaned++;
                    } catch (error) {
                        console.error(`    ✗ Ошибка:`, error.message);
                        errors++;
                    }
                } else {
                    console.log(`    ✓ [DRY-RUN] Будет очищено поле imageUrls`);
                    cleaned++;
                }
            }
        }
    }

    console.log('\n╔══════════════════════════════════════╗');
    console.log('║         РЕЗУЛЬТАТЫ ОЧИСТКИ           ║');
    console.log('╠══════════════════════════════════════╣');
    console.log(`║ Обработано:                ${String(processed).padStart(9)} ║`);
    console.log(`║ Очищено:                   ${String(cleaned).padStart(9)} ║`);
    console.log(`║ Ошибок:                    ${String(errors).padStart(9)} ║`);
    console.log('╚══════════════════════════════════════╝\n');

    if (!dryRun && cleaned > 0) {
        console.log('✅ Пути к несуществующим файлам очищены!');
        console.log('📸 Пользователи теперь могут заново загрузить изображения для этих артефактов.\n');
    }
}

// ==========================================
// 🎯 MAIN
// ==========================================
async function main() {
    const args = process.argv.slice(2);
    const mode = args[0];

    try {
        if (mode === '--execute') {
            console.log('⚠️  ВНИМАНИЕ: Будет выполнена очистка путей к несуществующим файлам!');
            console.log('⚠️  Пользователям придётся заново загрузить изображения!\n');

            await analyzeDatabase();
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3 секунды на раздумье
            await cleanupOrphanedPaths(false);
        } else if (mode === '--dry-run') {
            await analyzeDatabase();
            await cleanupOrphanedPaths(true);
        } else {
            await analyzeDatabase();
            console.log('\n💡 Команды:');
            console.log('   node cleanupOrphanedImages.js --dry-run    - Тестовый запуск');
            console.log('   node cleanupOrphanedImages.js --execute    - Выполнить очистку\n');
            console.log('⚠️  После очистки пользователи смогут заново загрузить изображения!\n');
        }

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Критическая ошибка:', error);
        await pool.end();
        process.exit(1);
    }
}

main();
