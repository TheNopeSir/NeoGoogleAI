#!/usr/bin/env node

/**
 * Скрипт импорта данных из SQL дампа
 *
 * Использование:
 *   node importFromSQL.js <backup.sql>
 *   node importFromSQL.js <backup.sql> --execute
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

const DB_USER = process.env.DB_USER || 'gen_user';
const DB_HOST = process.env.DB_HOST || '185.152.92.64';
const DB_NAME = process.env.DB_NAME || 'default_db';
const DB_PASS = process.env.DB_PASSWORD || '9H@DDCb.gQm.S}';

async function checkSQLFile(sqlFile) {
    try {
        const stats = await fs.stat(sqlFile);
        const content = await fs.readFile(sqlFile, 'utf-8');

        console.log(`📄 SQL файл: ${sqlFile}`);
        console.log(`📊 Размер: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📝 Строк: ${content.split('\n').length.toLocaleString()}`);

        // Проверяем содержимое
        const hasExhibits = content.includes('exhibits');
        const hasInserts = content.includes('INSERT') || content.includes('COPY');
        const hasImageUrls = content.includes('imageUrls');

        console.log('\n🔍 Анализ содержимого:');
        console.log(`  ${hasExhibits ? '✅' : '❌'} Таблица exhibits`);
        console.log(`  ${hasInserts ? '✅' : '❌'} INSERT/COPY операции`);
        console.log(`  ${hasImageUrls ? '✅' : '❌'} Поля imageUrls (изображения)`);

        if (!hasExhibits || !hasInserts) {
            console.log('\n⚠️  SQL дамп может не содержать данных exhibits');
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ Ошибка чтения файла:', error.message);
        return false;
    }
}

async function createBackup() {
    console.log('\n💾 Создание резервной копии текущей БД...');
    try {
        const { stdout } = await execAsync('node backupDatabase.js');
        console.log(stdout);
        return true;
    } catch (error) {
        console.error('⚠️  Не удалось создать бэкап:', error.message);
        console.log('Продолжить без бэкапа? (Ctrl+C для отмены)');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return false;
    }
}

async function importSQL(sqlFile, execute = false) {
    if (!execute) {
        console.log('\n🧪 РЕЖИМ АНАЛИЗА (без импорта)');
        console.log('\nДля выполнения импорта запустите:');
        console.log(`  node importFromSQL.js ${sqlFile} --execute\n`);
        return;
    }

    console.log('\n📥 Импорт SQL дампа в базу данных...\n');

    const command = `PGPASSWORD='${DB_PASS}' psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -f ${sqlFile}`;

    try {
        const { stdout, stderr } = await execAsync(command, {
            maxBuffer: 50 * 1024 * 1024 // 50MB buffer
        });

        if (stdout) console.log(stdout);
        if (stderr && !stderr.includes('NOTICE')) {
            console.error('⚠️  Предупреждения:', stderr);
        }

        console.log('\n✅ SQL дамп успешно импортирован!');
        return true;
    } catch (error) {
        console.error('\n❌ Ошибка импорта SQL:', error.message);

        if (error.message.includes('Connection refused')) {
            console.log('\n💡 База данных недоступна. Возможные причины:');
            console.log('  1. БД не запущена');
            console.log('  2. Неверный хост/порт');
            console.log('  3. Требуется VPN для доступа');
            console.log('\nПопробуйте восстановить SQL дамп вручную:');
            console.log(`  PGPASSWORD='${DB_PASS}' psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} < ${sqlFile}`);
        }

        return false;
    }
}

async function showStatistics() {
    console.log('\n📊 Проверка результатов...\n');
    try {
        const { stdout } = await execAsync('node diagnoseImages.js');
        console.log(stdout);
    } catch (error) {
        console.log('⚠️  Не удалось получить статистику');
    }
}

// Main
async function main() {
    const args = process.argv.slice(2);
    const sqlFile = args[0];
    const execute = args.includes('--execute');

    if (!sqlFile) {
        console.log('❌ Не указан SQL файл\n');
        console.log('Использование:');
        console.log('  node importFromSQL.js <backup.sql>           - Анализ');
        console.log('  node importFromSQL.js <backup.sql> --execute - Импорт\n');
        console.log('Пример:');
        console.log('  node importFromSQL.js database_backup.sql --execute\n');
        process.exit(1);
    }

    console.log('═══════════════════════════════════════════');
    console.log('   SQL IMPORT TOOL - NeoArchive');
    console.log('═══════════════════════════════════════════\n');

    // Шаг 1: Проверка файла
    const isValid = await checkSQLFile(sqlFile);
    if (!isValid && execute) {
        console.log('\n⚠️  Продолжить импорт? (Ctrl+C для отмены)');
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    if (!execute) {
        console.log('\n💡 Следующие шаги:');
        console.log('  1. Проверьте содержимое SQL файла');
        console.log(`  2. Запустите: node importFromSQL.js ${sqlFile} --execute`);
        console.log('  3. После импорта: node migrateImages.js --execute\n');
        return;
    }

    // Шаг 2: Создание бэкапа текущей БД
    await createBackup();

    // Шаг 3: Импорт SQL
    const success = await importSQL(sqlFile, execute);

    if (success) {
        // Шаг 4: Статистика
        await showStatistics();

        console.log('\n═══════════════════════════════════════════');
        console.log('   ✅ ИМПОРТ ЗАВЕРШЕН');
        console.log('═══════════════════════════════════════════\n');

        console.log('📋 Следующие шаги:\n');
        console.log('  1. Создайте JSON бэкап:');
        console.log('     node backupDatabase.js\n');
        console.log('  2. Мигрируйте изображения base64 → WebP:');
        console.log('     node migrateImages.js --execute\n');
        console.log('  3. Проверьте результаты:');
        console.log('     node diagnoseImages.js\n');
    } else {
        console.log('\n❌ Импорт не выполнен. Проверьте ошибки выше.\n');
    }
}

main().catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
});
