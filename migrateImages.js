#!/usr/bin/env node

/**
 * Скрипт миграции старых base64 изображений в новый оптимизированный формат
 *
 * Использование:
 *   node migrateImages.js              - Показать статистику
 *   node migrateImages.js --dry-run    - Тестовый запуск без изменений
 *   node migrateImages.js --execute    - Выполнить миграцию
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { migrateOldImages, isBase64DataUri } from './imageProcessor.js';

// Fix for "self-signed certificate in certificate chain" error
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config();

const { Pool } = pg;

// ==========================================
// 🗄️ DATABASE CONNECTION
// ==========================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const query = (text, params) => pool.query(text, params);

// ==========================================
// 🔍 АНАЛИЗ БАЗЫ ДАННЫХ
// ==========================================
async function analyzeDatabase() {
    console.log('\n📊 Анализ базы данных...\n');

    const result = await query(`
        SELECT
            id,
            data->>'title' as title,
            data->'imageUrls' as "imageUrls"
        FROM exhibits
        ORDER BY updated_at DESC
    `);

    const stats = {
        total: 0,
        withImages: 0,
        withBase64: 0,
        withOptimized: 0,
        needsMigration: []
    };

    for (const row of result.rows) {
        stats.total++;

        const imageUrls = row.imageUrls;

        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            continue;
        }

        stats.withImages++;

        // Проверяем первое изображение
        const firstImage = imageUrls[0];

        if (typeof firstImage === 'string') {
            if (isBase64DataUri(firstImage)) {
                stats.withBase64++;
                stats.needsMigration.push({
                    id: row.id,
                    title: row.title,
                    imagesCount: imageUrls.length
                });
            }
        } else if (typeof firstImage === 'object' && firstImage.thumbnail) {
            stats.withOptimized++;
        }
    }

    console.log('╔══════════════════════════════════════╗');
    console.log('║         СТАТИСТИКА БАЗЫ ДАННЫХ       ║');
    console.log('╠══════════════════════════════════════╣');
    console.log(`║ Всего артефактов:          ${String(stats.total).padStart(9)} ║`);
    console.log(`║ С изображениями:           ${String(stats.withImages).padStart(9)} ║`);
    console.log(`║ С base64 (требуют миграции): ${String(stats.withBase64).padStart(7)} ║`);
    console.log(`║ Уже оптимизированы:        ${String(stats.withOptimized).padStart(9)} ║`);
    console.log('╚══════════════════════════════════════╝\n');

    if (stats.needsMigration.length > 0) {
        console.log('🔄 Артефакты, требующие миграции:\n');
        for (const item of stats.needsMigration.slice(0, 10)) {
            console.log(`  • ${item.id} - "${item.title}" (${item.imagesCount} изобр.)`);
        }
        if (stats.needsMigration.length > 10) {
            console.log(`  ... и еще ${stats.needsMigration.length - 10} артефактов`);
        }
        console.log('');
    }

    return stats;
}

// ==========================================
// 🚀 МИГРАЦИЯ ИЗОБРАЖЕНИЙ
// ==========================================
async function migrateImages(dryRun = true) {
    console.log(dryRun ? '\n🧪 ТЕСТОВЫЙ РЕЖИМ (dry-run)\n' : '\n✅ РЕЖИМ ВЫПОЛНЕНИЯ\n');

    const result = await query(`
        SELECT
            id,
            data
        FROM exhibits
        ORDER BY updated_at DESC
    `);

    let processed = 0;
    let migrated = 0;
    let errors = 0;

    for (const row of result.rows) {
        const data = row.data;
        const imageUrls = data.imageUrls;

        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            continue;
        }

        // Проверяем, есть ли base64 изображения
        const hasBase64 = imageUrls.some(img =>
            typeof img === 'string' && isBase64DataUri(img)
        );

        if (!hasBase64) {
            continue;
        }

        processed++;
        console.log(`\n[${processed}] Обработка артефакта: ${row.id}`);
        console.log(`    Название: ${data.title || 'Без названия'}`);
        console.log(`    Изображений: ${imageUrls.length}`);

        try {
            // Мигрируем изображения
            const newImageUrls = await migrateOldImages(imageUrls, row.id);

            if (newImageUrls.length > 0) {
                console.log(`    ✓ Мигрировано ${newImageUrls.length} изображений`);

                if (!dryRun) {
                    // Обновляем запись в БД
                    const updatedData = {
                        ...data,
                        imageUrls: newImageUrls
                    };

                    await query(
                        'UPDATE exhibits SET data = $1, updated_at = NOW() WHERE id = $2',
                        [JSON.stringify(updatedData), row.id]
                    );

                    console.log(`    ✓ Запись обновлена в БД`);
                }

                migrated++;
            } else {
                console.log(`    ⚠ Не удалось мигрировать изображения`);
            }

        } catch (error) {
            console.error(`    ✗ Ошибка миграции:`, error.message);
            errors++;
        }
    }

    console.log('\n╔══════════════════════════════════════╗');
    console.log('║         РЕЗУЛЬТАТЫ МИГРАЦИИ          ║');
    console.log('╠══════════════════════════════════════╣');
    console.log(`║ Обработано:                ${String(processed).padStart(9)} ║`);
    console.log(`║ Успешно мигрировано:       ${String(migrated).padStart(9)} ║`);
    console.log(`║ Ошибок:                    ${String(errors).padStart(9)} ║`);
    console.log('╚══════════════════════════════════════╝\n');
}

// ==========================================
// 🎯 MAIN
// ==========================================
async function main() {
    const args = process.argv.slice(2);
    const mode = args[0];

    try {
        if (mode === '--execute') {
            console.log('⚠️  ВНИМАНИЕ: Будет выполнена реальная миграция данных!');
            console.log('⚠️  Убедитесь, что у вас есть резервная копия базы данных!\n');

            await analyzeDatabase();
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3 секунды на раздумье
            await migrateImages(false);
        } else if (mode === '--dry-run') {
            await analyzeDatabase();
            await migrateImages(true);
        } else {
            await analyzeDatabase();
            console.log('\n💡 Команды:');
            console.log('   node migrateImages.js --dry-run    - Тестовый запуск');
            console.log('   node migrateImages.js --execute    - Выполнить миграцию\n');
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
