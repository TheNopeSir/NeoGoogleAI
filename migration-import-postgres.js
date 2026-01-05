/**
 * Migration Import Script for PostgreSQL
 * Импортирует данные из JSON файлов в PostgreSQL без Supabase SDK
 */

import pg from 'pg';
const { Pool } = pg;
import fs from 'fs/promises';
import path from 'path';

// ==========================================
// НАСТРОЙКИ POSTGRESQL
// ==========================================
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/neoarchive";

const IMPORT_DIR = './migration-data';
const TABLES = ['users', 'exhibits', 'collections', 'notifications', 'messages', 'guestbook'];
const BATCH_SIZE = 100;

// ==========================================

async function importData() {
  console.log('🚀 Начинаем импорт в PostgreSQL...\n');

  // Проверяем наличие директории
  try {
    await fs.access(IMPORT_DIR);
  } catch {
    console.error(`❌ Директория ${IMPORT_DIR} не найдена!`);
    console.error('💡 Сначала запустите: npm run migrate:export\n');
    process.exit(1);
  }

  // Подключаемся к PostgreSQL
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Тестируем подключение
    await pool.query('SELECT NOW()');
    console.log('✅ Подключение к PostgreSQL успешно\n');
  } catch (err) {
    console.error('❌ Ошибка подключения к PostgreSQL:', err.message);
    console.error('💡 Проверьте DATABASE_URL:', DATABASE_URL);
    process.exit(1);
  }

  const importStats = {
    total: 0,
    tables: {},
    errors: []
  };

  // Загружаем метаданные
  try {
    const metadataPath = path.join(IMPORT_DIR, '_metadata.json');
    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);
    console.log(`📋 Импорт данных от: ${metadata.exportDate}`);
    console.log(`📋 Всего записей для импорта: ${metadata.stats.total}\n`);
  } catch {
    console.warn('⚠️  Метаданные не найдены, продолжаем...\n');
  }

  // Импортируем каждую таблицу
  for (const tableName of TABLES) {
    console.log(`📦 Импорт таблицы: ${tableName}`);

    try {
      const filePath = path.join(IMPORT_DIR, `${tableName}.json`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const records = JSON.parse(fileContent);

      if (!records || records.length === 0) {
        console.log(`⚠️  Файл ${tableName}.json пуст\n`);
        importStats.tables[tableName] = { imported: 0, failed: 0 };
        continue;
      }

      let imported = 0;
      let failed = 0;

      // Определяем ключ для конфликтов
      const conflictKey = tableName === 'users' ? 'username' : 'id';

      // Импортируем порциями
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);

        try {
          // Используем транзакцию для батча
          const client = await pool.connect();

          try {
            await client.query('BEGIN');

            for (const record of batch) {
              // Для users - используем username как ключ
              if (tableName === 'users') {
                await client.query(
                  `INSERT INTO users (username, data, created_at, updated_at)
                   VALUES ($1, $2, COALESCE($3::timestamptz, NOW()), NOW())
                   ON CONFLICT (username)
                   DO UPDATE SET data = $2, updated_at = NOW()`,
                  [record.username, record.data, record.created_at]
                );
              } else {
                // Для остальных таблиц - используем id
                await client.query(
                  `INSERT INTO ${tableName} (id, data, timestamp, created_at)
                   VALUES ($1, $2, $3, COALESCE($4::timestamptz, NOW()))
                   ON CONFLICT (id)
                   DO UPDATE SET data = $2, timestamp = $3`,
                  [record.id, record.data, record.timestamp, record.created_at]
                );
              }
            }

            await client.query('COMMIT');
            imported += batch.length;

            const progress = Math.round((i + batch.length) / records.length * 100);
            process.stdout.write(`\r  ⏳ Прогресс: ${progress}% (${imported}/${records.length})`);

          } catch (err) {
            await client.query('ROLLBACK');
            throw err;
          } finally {
            client.release();
          }

        } catch (err) {
          console.error(`\n  ❌ Ошибка в batch ${i}-${i + batch.length}:`, err.message);
          failed += batch.length;
          importStats.errors.push({
            table: tableName,
            batch: `${i}-${i + batch.length}`,
            error: err.message
          });
        }
      }

      console.log(''); // Новая строка после прогресс-бара

      importStats.total += imported;
      importStats.tables[tableName] = { imported, failed };

      if (failed > 0) {
        console.log(`⚠️  ${tableName}: ${imported} успешно, ${failed} с ошибками\n`);
      } else {
        console.log(`✅ ${tableName}: ${imported} записей импортировано\n`);
      }

    } catch (err) {
      console.error(`❌ Ошибка при обработке ${tableName}:`, err.message, '\n');
      importStats.tables[tableName] = { imported: 0, failed: 0 };
    }
  }

  // Закрываем пул
  await pool.end();

  // Сохраняем отчет
  const report = {
    importDate: new Date().toISOString(),
    targetDatabase: DATABASE_URL.replace(/:[^:@]+@/, ':***@'), // Скрываем пароль
    stats: importStats,
    version: '1.0.0'
  };

  await fs.writeFile(
    path.join(IMPORT_DIR, '_import-postgres-report.json'),
    JSON.stringify(report, null, 2),
    'utf-8'
  );

  console.log('📊 Статистика импорта:');
  console.log(`   Всего записей: ${importStats.total}`);
  console.log('   По таблицам:');
  for (const [table, stats] of Object.entries(importStats.tables)) {
    const status = stats.failed > 0 ? '⚠️ ' : '✅';
    console.log(`     ${status} ${table}: ${stats.imported} успешно${stats.failed > 0 ? `, ${stats.failed} ошибок` : ''}`);
  }

  if (importStats.errors.length > 0) {
    console.log(`\n⚠️  Всего ошибок: ${importStats.errors.length}`);
    console.log('📄 Подробности в: ./migration-data/_import-postgres-report.json');
  }

  console.log('\n✅ Импорт в PostgreSQL завершен!');
  console.log('💡 Следующие шаги:');
  console.log('   1. Обновите server.js для работы с PostgreSQL');
  console.log('   2. Удалите @supabase/supabase-js: npm uninstall @supabase/supabase-js');
  console.log('   3. Проверьте работу приложения\n');
}

// Запуск
importData().catch(err => {
  console.error('💥 Критическая ошибка:', err);
  process.exit(1);
});
