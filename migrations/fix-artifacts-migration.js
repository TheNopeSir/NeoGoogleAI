#!/usr/bin/env node

/**
 * Миграция для исправления данных артефактов
 *
 * Исправляет:
 * 1. Отсутствующие или слишком короткие описания
 * 2. Отсутствующие массивы комментариев
 * 3. Отсутствующие объекты характеристик (specs)
 *
 * Использование:
 *   node migrations/fix-artifacts-migration.js [--dry-run]
 *
 * Опции:
 *   --dry-run    Показать изменения без применения
 */

import pg from 'pg';
import dotenv from 'dotenv';
import process from 'process';

dotenv.config();

const { Pool } = pg;

const isDryRun = process.argv.includes('--dry-run');

const pool = new Pool({
    user: process.env.DB_USER || 'gen_user',
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 5
});

async function fixArtifacts() {
    let client;
    const stats = {
        total: 0,
        fixedDescription: 0,
        fixedComments: 0,
        fixedSpecs: 0,
        errors: []
    };

    try {
        console.log('🔍 Подключение к базе данных...');
        client = await pool.connect();
        console.log('✅ Подключено!\n');

        if (isDryRun) {
            console.log('⚠️  РЕЖИМ DRY-RUN: Изменения НЕ будут применены\n');
        }

        // Получаем все артефакты
        console.log('📊 Загрузка артефактов из БД...');
        const result = await client.query(
            'SELECT id, data, updated_at FROM exhibits ORDER BY updated_at DESC'
        );

        stats.total = result.rows.length;
        console.log(`✅ Загружено артефактов: ${stats.total}\n`);

        console.log('🔧 Анализ и исправление данных...\n');

        for (const row of result.rows) {
            try {
                const id = row.id;
                const data = row.data;
                let needsUpdate = false;
                const fixes = [];

                // Проверка и исправление описания
                if (!data.description || data.description.trim().length < 5) {
                    const newDescription = `${data.title || 'Артефакт'} - уникальный экспонат коллекции.${
                        data.category ? ` Категория: ${data.category}.` : ''
                    }${
                        data.subcategory ? ` Подкатегория: ${data.subcategory}.` : ''
                    }`;

                    console.log(`📝 ${data.title || id}`);
                    console.log(`   Старое описание: "${data.description || '(отсутствует)'}"`);
                    console.log(`   Новое описание: "${newDescription}"`);

                    data.description = newDescription;
                    stats.fixedDescription++;
                    needsUpdate = true;
                    fixes.push('description');
                }

                // Проверка и исправление комментариев
                if (!data.comments || !Array.isArray(data.comments)) {
                    console.log(`💬 ${data.title || id}: Добавлен массив комментариев`);
                    data.comments = [];
                    stats.fixedComments++;
                    needsUpdate = true;
                    fixes.push('comments');
                }

                // Проверка и исправление характеристик
                if (!data.specs || typeof data.specs !== 'object' || Array.isArray(data.specs)) {
                    console.log(`📊 ${data.title || id}: Добавлен объект характеристик`);
                    data.specs = {};
                    stats.fixedSpecs++;
                    needsUpdate = true;
                    fixes.push('specs');
                }

                // Сохраняем изменения
                if (needsUpdate) {
                    if (!isDryRun) {
                        await client.query(
                            'UPDATE exhibits SET data = $1, updated_at = NOW() WHERE id = $2',
                            [data, id]
                        );
                        console.log(`✅ Обновлено: ${fixes.join(', ')}\n`);
                    } else {
                        console.log(`🔍 DRY-RUN: Будет обновлено: ${fixes.join(', ')}\n`);
                    }
                }

            } catch (err) {
                stats.errors.push({ id: row.id, error: err.message });
                console.error(`❌ Ошибка при обработке ${row.id}:`, err.message);
            }
        }

        // Итоговая статистика
        console.log('\n' + '='.repeat(80));
        console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
        console.log('='.repeat(80));
        console.log(`Всего артефактов обработано: ${stats.total}`);
        console.log(`Исправлено описаний: ${stats.fixedDescription}`);
        console.log(`Добавлено массивов комментариев: ${stats.fixedComments}`);
        console.log(`Добавлено объектов характеристик: ${stats.fixedSpecs}`);
        console.log(`Ошибок: ${stats.errors.length}`);

        if (stats.errors.length > 0) {
            console.log('\n❌ Ошибки:');
            stats.errors.forEach(e => {
                console.log(`   ${e.id}: ${e.error}`);
            });
        }

        if (isDryRun) {
            console.log('\n⚠️  Это был DRY-RUN. Запустите без --dry-run для применения изменений.');
        } else {
            console.log('\n✅ Миграция успешно завершена!');
        }

    } catch (error) {
        console.error('\n❌ Критическая ошибка:', error.message);
        process.exit(1);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

// Запуск с обработкой ошибок
fixArtifacts()
    .then(() => {
        console.log('\n✨ Готово!');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n💥 Фатальная ошибка:', err);
        process.exit(1);
    });
