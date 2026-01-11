#!/usr/bin/env node

/**
 * Скрипт миграции старых base64 изображений через API сервера
 *
 * Использование:
 *   node migrateImagesViaAPI.js                      - Показать статистику
 *   node migrateImagesViaAPI.js --dry-run            - Тестовый запуск
 *   node migrateImagesViaAPI.js --execute            - Выполнить миграцию
 *   node migrateImagesViaAPI.js --execute --limit 5  - Мигрировать только 5 артефактов
 *
 * ТРЕБОВАНИЯ:
 *   - Сервер должен быть запущен (npm start)
 *   - Пользователь должен быть авторизован (токен в .env или аргумент --token)
 */

import { isBase64DataUri } from './imageProcessor.js';

// ==========================================
// 🔧 КОНФИГУРАЦИЯ
// ==========================================
const API_BASE = process.env.API_URL || 'http://localhost:3000/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || null;

// ==========================================
// 🌐 HTTP HELPERS
// ==========================================
async function apiGet(endpoint) {
    const headers = {};
    if (AUTH_TOKEN) {
        headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, { headers });
    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

async function apiPut(endpoint, data) {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (AUTH_TOKEN) {
        headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${text}`);
    }
    return response.json();
}

// ==========================================
// 🔍 АНАЛИЗ
// ==========================================
async function analyzeExhibits() {
    console.log('\n📊 Загрузка артефактов из API...\n');

    // Получаем все артефакты через feed API
    const exhibits = await apiGet('/feed?limit=1000');

    const stats = {
        total: exhibits.length,
        withImages: 0,
        withBase64: 0,
        withOptimized: 0,
        needsMigration: []
    };

    for (const exhibit of exhibits) {
        const imageUrls = exhibit.imageUrls;

        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            continue;
        }

        stats.withImages++;

        const firstImage = imageUrls[0];

        if (typeof firstImage === 'string') {
            if (isBase64DataUri(firstImage)) {
                stats.withBase64++;
                stats.needsMigration.push({
                    id: exhibit.id,
                    title: exhibit.title,
                    imagesCount: imageUrls.length
                });
            }
        } else if (typeof firstImage === 'object' && firstImage.thumbnail) {
            stats.withOptimized++;
        }
    }

    console.log('╔══════════════════════════════════════╗');
    console.log('║         СТАТИСТИКА АРТЕФАКТОВ        ║');
    console.log('╠══════════════════════════════════════╣');
    console.log(`║ Всего артефактов:          ${String(stats.total).padStart(9)} ║`);
    console.log(`║ С изображениями:           ${String(stats.withImages).padStart(9)} ║`);
    console.log(`║ С base64 (требуют миграции): ${String(stats.withBase64).padStart(7)} ║`);
    console.log(`║ Уже оптимизированы:        ${String(stats.withOptimized).padStart(9)} ║`);
    console.log('╚══════════════════════════════════════╝\n');

    if (stats.needsMigration.length > 0) {
        console.log('🔄 Артефакты с base64 изображениями:\n');
        for (const item of stats.needsMigration.slice(0, 10)) {
            console.log(`  • ${item.id} - "${item.title}" (${item.imagesCount} изобр.)`);
        }
        if (stats.needsMigration.length > 10) {
            console.log(`  ... и еще ${stats.needsMigration.length - 10} артефактов`);
        }
        console.log('');
    }

    return { stats, needsMigration: stats.needsMigration };
}

// ==========================================
// 🚀 МИГРАЦИЯ ЧЕРЕЗ СЕРВЕР
// ==========================================
async function migrateExhibits(dryRun = true, limit = null) {
    console.log(dryRun ? '\n🧪 ТЕСТОВЫЙ РЕЖИМ (dry-run)\n' : '\n✅ РЕЖИМ ВЫПОЛНЕНИЯ\n');

    const { needsMigration } = await analyzeExhibits();

    if (needsMigration.length === 0) {
        console.log('✅ Нет артефактов, требующих миграции!\n');
        return;
    }

    const toProcess = limit ? needsMigration.slice(0, limit) : needsMigration;

    let processed = 0;
    let migrated = 0;
    let errors = 0;

    console.log(`\n🔄 Будет обработано: ${toProcess.length} артефактов\n`);

    for (const item of toProcess) {
        processed++;
        console.log(`\n[${processed}/${toProcess.length}] Обработка артефакта: ${item.id}`);
        console.log(`    Название: ${item.title || 'Без названия'}`);
        console.log(`    Изображений: ${item.imagesCount}`);

        try {
            // Получаем полные данные артефакта
            const exhibit = await apiGet(`/exhibits/${item.id}`);

            if (!exhibit || !exhibit.imageUrls) {
                console.log(`    ⚠ Не удалось получить данные артефакта`);
                errors++;
                continue;
            }

            // Проверяем, что изображения действительно base64
            const hasBase64 = exhibit.imageUrls.some(img =>
                typeof img === 'string' && isBase64DataUri(img)
            );

            if (!hasBase64) {
                console.log(`    ℹ Артефакт уже мигрирован`);
                continue;
            }

            if (dryRun) {
                console.log(`    ✓ [DRY-RUN] Будет мигрировано ${exhibit.imageUrls.length} изображений`);
                migrated++;
            } else {
                // Отправляем обновление на сервер
                // Сервер автоматически обработает base64 изображения при обновлении
                await apiPut(`/exhibits/${item.id}`, exhibit);

                console.log(`    ✓ Артефакт обновлен, изображения обработаны сервером`);
                migrated++;
            }

        } catch (error) {
            console.error(`    ✗ Ошибка:`, error.message);
            errors++;
        }

        // Небольшая задержка, чтобы не перегружать сервер
        if (!dryRun) {
            await new Promise(resolve => setTimeout(resolve, 500));
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

    // Парсим аргументы
    let mode = null;
    let limit = null;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--execute') mode = 'execute';
        else if (args[i] === '--dry-run') mode = 'dry-run';
        else if (args[i] === '--limit' && args[i + 1]) {
            limit = parseInt(args[i + 1]);
            i++;
        }
    }

    try {
        // Проверяем доступность API
        console.log(`\n🔌 Проверка подключения к серверу: ${API_BASE}\n`);
        await apiGet('/feed?limit=1');
        console.log('✅ Сервер доступен!\n');

        if (mode === 'execute') {
            console.log('⚠️  ВНИМАНИЕ: Будет выполнена миграция данных!');
            console.log('⚠️  Изображения будут обработаны и сконвертированы!\n');

            await new Promise(resolve => setTimeout(resolve, 2000));
            await migrateExhibits(false, limit);
        } else if (mode === 'dry-run') {
            await migrateExhibits(true, limit);
        } else {
            await analyzeExhibits();
            console.log('\n💡 Команды:');
            console.log('   node migrateImagesViaAPI.js --dry-run             - Тестовый запуск');
            console.log('   node migrateImagesViaAPI.js --execute             - Выполнить миграцию');
            console.log('   node migrateImagesViaAPI.js --execute --limit 5   - Мигрировать 5 артефактов\n');
        }

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Критическая ошибка:', error.message);
        console.error('\n💡 Убедитесь что:');
        console.error('   1. Сервер запущен (npm start)');
        console.error('   2. API доступен по адресу:', API_BASE);
        console.error('   3. У вас есть права на редактирование артефактов\n');
        process.exit(1);
    }
}

main();
