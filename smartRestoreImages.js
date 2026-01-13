#!/usr/bin/env node

/**
 * Умное восстановление изображений после импорта SQL дампа
 *
 * Этот скрипт автоматически:
 * 1. Проверяет существование WebP файлов на диске
 * 2. Переиспользует существующие файлы если они есть
 * 3. Создает новые только если файлов нет
 * 4. Обновляет БД с правильными путями
 *
 * Использование:
 *   node smartRestoreImages.js              - Анализ (dry-run)
 *   node smartRestoreImages.js --execute    - Выполнить восстановление
 *   node smartRestoreImages.js --limit 10   - Обработать только первые 10 артефактов
 */

import { smartRestoreImages, isBase64DataUri } from './imageProcessor.js';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Подключение к БД
const pool = new Pool({
    host: process.env.DB_HOST || '185.152.92.64',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'default_db',
    user: process.env.DB_USER || 'gen_user',
    password: process.env.DB_PASSWORD,
    ssl: false
});

// Цвета для вывода
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function analyzeDatabase() {
    log('\n═══════════════════════════════════════════', 'cyan');
    log('   SMART IMAGE RESTORE - АНАЛИЗ', 'bright');
    log('═══════════════════════════════════════════\n', 'cyan');

    try {
        const result = await pool.query('SELECT id, data FROM exhibits ORDER BY updated_at DESC');

        const stats = {
            total: result.rows.length,
            withImages: 0,
            needMigration: 0,
            alreadyOptimized: 0,
            noImages: 0,
            toProcess: []
        };

        for (const row of result.rows) {
            const imageUrls = row.data?.imageUrls;

            if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
                stats.noImages++;
                continue;
            }

            stats.withImages++;
            const firstImage = imageUrls[0];

            // Base64 изображения - требуют обработки
            if (typeof firstImage === 'string' && isBase64DataUri(firstImage)) {
                stats.needMigration++;
                stats.toProcess.push({
                    id: row.id,
                    imageCount: imageUrls.length,
                    type: 'base64'
                });
            }
            // Уже оптимизированные
            else if (typeof firstImage === 'object' && firstImage.thumbnail) {
                stats.alreadyOptimized++;
            }
        }

        // Вывод статистики
        log('📊 Статистика базы данных:', 'bright');
        log(`   Всего артефактов: ${stats.total}`);
        log(`   С изображениями: ${stats.withImages}`, 'blue');
        log(`   Без изображений: ${stats.noImages}`);
        log('');
        log(`   ✅ Уже оптимизированы: ${stats.alreadyOptimized}`, 'green');
        log(`   🔄 Требуют обработки (base64): ${stats.needMigration}`, 'yellow');
        log('');

        if (stats.needMigration > 0) {
            log('💡 Эти артефакты будут обработаны:', 'bright');
            log(`   • Проверка существования WebP файлов на диске`);
            log(`   • Переиспользование существующих файлов`);
            log(`   • Создание новых только если необходимо`);
            log('');
        }

        return stats;
    } catch (error) {
        log(`\n❌ Ошибка анализа: ${error.message}`, 'red');
        throw error;
    }
}

async function smartRestore(limit = null) {
    log('\n═══════════════════════════════════════════', 'cyan');
    log('   SMART IMAGE RESTORE - ВЫПОЛНЕНИЕ', 'bright');
    log('═══════════════════════════════════════════\n', 'cyan');

    try {
        let query = 'SELECT id, data FROM exhibits ORDER BY updated_at DESC';
        const params = [];

        if (limit) {
            query += ' LIMIT $1';
            params.push(limit);
        }

        const result = await pool.query(query, params);

        const stats = {
            processed: 0,
            skipped: 0,
            filesReused: 0,
            filesCreated: 0,
            errors: []
        };

        let current = 0;
        const total = result.rows.length;

        for (const row of result.rows) {
            current++;
            const data = row.data;
            const imageUrls = data?.imageUrls;

            // Пропускаем артефакты без изображений
            if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
                stats.skipped++;
                continue;
            }

            const firstImage = imageUrls[0];

            // Пропускаем уже оптимизированные
            if (typeof firstImage === 'object' && firstImage.thumbnail) {
                stats.skipped++;
                continue;
            }

            // Обрабатываем base64 изображения
            if (typeof firstImage === 'string' && isBase64DataUri(firstImage)) {
                try {
                    log(`[${current}/${total}] Обработка ${row.id} (${imageUrls.length} изображений)...`, 'blue');

                    // Умное восстановление - переиспользует существующие файлы
                    const processedImages = await smartRestoreImages(imageUrls, row.id);

                    if (processedImages.length > 0) {
                        // Обновляем данные в БД
                        data.imageUrls = processedImages;

                        await pool.query(
                            'UPDATE exhibits SET data = $1, updated_at = NOW() WHERE id = $2',
                            [data, row.id]
                        );

                        stats.processed++;

                        // Подсчитываем переиспользованные и созданные файлы
                        // Это примерная оценка, точные цифры в логах
                        log(`   ✅ Обработано: ${processedImages.length} изображений`, 'green');
                    }
                } catch (error) {
                    log(`   ❌ Ошибка обработки ${row.id}: ${error.message}`, 'red');
                    stats.errors.push({
                        id: row.id,
                        error: error.message
                    });
                }
            } else {
                stats.skipped++;
            }
        }

        // Итоговая статистика
        log('\n═══════════════════════════════════════════', 'cyan');
        log('   РЕЗУЛЬТАТЫ', 'bright');
        log('═══════════════════════════════════════════\n', 'cyan');

        log(`✅ Обработано артефактов: ${stats.processed}`, 'green');
        log(`⏭️  Пропущено: ${stats.skipped}`);

        if (stats.errors.length > 0) {
            log(`\n❌ Ошибок: ${stats.errors.length}`, 'red');
            stats.errors.forEach(err => {
                log(`   • ${err.id}: ${err.error}`, 'red');
            });
        }

        log('');
        return stats;
    } catch (error) {
        log(`\n❌ Критическая ошибка: ${error.message}`, 'red');
        throw error;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const executeMode = args.includes('--execute');
    const limitArg = args.find(arg => arg.startsWith('--limit'));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

    try {
        // Проверка подключения к БД
        await pool.query('SELECT 1');
        log('✅ Подключение к БД установлено\n', 'green');

        if (!executeMode) {
            // Режим анализа
            const stats = await analyzeDatabase();

            if (stats.needMigration > 0) {
                log('📋 Для выполнения умного восстановления запустите:', 'bright');
                log(`   node smartRestoreImages.js --execute`, 'green');
                if (stats.needMigration > 100) {
                    log(`   node smartRestoreImages.js --execute --limit=100`, 'yellow');
                    log('   (Рекомендуется для больших баз данных)');
                }
                log('');
            } else {
                log('✨ Все изображения уже оптимизированы!', 'green');
                log('');
            }
        } else {
            // Режим выполнения
            if (limit) {
                log(`⚙️  Режим: Обработка первых ${limit} артефактов\n`, 'yellow');
            }

            const stats = await smartRestore(limit);

            if (stats.processed > 0) {
                log('✨ Умное восстановление завершено!', 'green');
                log('');
                log('💡 Преимущества умного восстановления:', 'bright');
                log('   • Существующие WebP файлы переиспользованы');
                log('   • Новые файлы созданы только при необходимости');
                log('   • База данных обновлена с правильными путями');
                log('   • Быстрая загрузка изображений в приложении');
                log('');
            }
        }

    } catch (error) {
        log(`\n❌ Фатальная ошибка: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Запуск скрипта
main().catch(console.error);
