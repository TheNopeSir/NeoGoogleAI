/**
 * Migration Import Script
 * Импортирует данные из JSON файлов в новую Supabase БД
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// ==========================================
// НАСТРОЙКИ НОВОЙ БД
// ==========================================
const NEW_SUPABASE_URL = process.env.NEW_SUPABASE_URL || "https://your-new-project.supabase.co";
const NEW_SUPABASE_KEY = process.env.NEW_SUPABASE_SERVICE_KEY || "your-new-service-role-key";

const IMPORT_DIR = './migration-data';
const TABLES = ['users', 'exhibits', 'collections', 'notifications', 'messages', 'guestbook'];
const BATCH_SIZE = 100; // Импортируем порциями по 100 записей

// ==========================================

async function importData() {
  console.log('🚀 Начинаем импорт данных...\n');

  // Проверяем наличие директории с данными
  try {
    await fs.access(IMPORT_DIR);
  } catch {
    console.error(`❌ Директория ${IMPORT_DIR} не найдена!`);
    console.error('💡 Сначала запустите migration-export.js для экспорта данных\n');
    process.exit(1);
  }

  // Подключаемся к новой БД
  const supabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

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
    console.warn('⚠️  Метаданные не найдены, продолжаем импорт...\n');
  }

  // Импортируем каждую таблицу
  for (const tableName of TABLES) {
    console.log(`📦 Импорт таблицы: ${tableName}`);

    try {
      const filePath = path.join(IMPORT_DIR, `${tableName}.json`);

      // Читаем данные из файла
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const records = JSON.parse(fileContent);

      if (!records || records.length === 0) {
        console.log(`⚠️  Файл ${tableName}.json пуст`);
        importStats.tables[tableName] = { imported: 0, failed: 0 };
        continue;
      }

      let imported = 0;
      let failed = 0;

      // Импортируем порциями
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);

        try {
          const { error } = await supabase
            .from(tableName)
            .upsert(batch, { onConflict: tableName === 'users' ? 'username' : 'id' });

          if (error) {
            console.error(`  ❌ Ошибка в batch ${i}-${i + batch.length}:`, error.message);
            failed += batch.length;
            importStats.errors.push({
              table: tableName,
              batch: `${i}-${i + batch.length}`,
              error: error.message
            });
          } else {
            imported += batch.length;
            const progress = Math.round((i + batch.length) / records.length * 100);
            process.stdout.write(`\r  ⏳ Прогресс: ${progress}% (${imported}/${records.length})`);
          }
        } catch (err) {
          console.error(`  ❌ Критическая ошибка в batch ${i}-${i + batch.length}:`, err.message);
          failed += batch.length;
        }
      }

      console.log(''); // Новая строка после прогресс-бара

      importStats.total += imported;
      importStats.tables[tableName] = { imported, failed };

      if (failed > 0) {
        console.log(`⚠️  ${tableName}: ${imported} успешно, ${failed} с ошибками`);
      } else {
        console.log(`✅ ${tableName}: ${imported} записей импортировано`);
      }

    } catch (err) {
      console.error(`❌ Ошибка при обработке ${tableName}:`, err.message);
      importStats.tables[tableName] = { imported: 0, failed: 0 };
    }
  }

  // Сохраняем отчет об импорте
  const report = {
    importDate: new Date().toISOString(),
    targetUrl: NEW_SUPABASE_URL,
    stats: importStats,
    version: '1.0.0'
  };

  await fs.writeFile(
    path.join(IMPORT_DIR, '_import-report.json'),
    JSON.stringify(report, null, 2),
    'utf-8'
  );

  console.log('\n📊 Статистика импорта:');
  console.log(`   Всего записей: ${importStats.total}`);
  console.log('   По таблицам:');
  for (const [table, stats] of Object.entries(importStats.tables)) {
    const status = stats.failed > 0 ? '⚠️ ' : '✅';
    console.log(`     ${status} ${table}: ${stats.imported} успешно${stats.failed > 0 ? `, ${stats.failed} ошибок` : ''}`);
  }

  if (importStats.errors.length > 0) {
    console.log(`\n⚠️  Всего ошибок: ${importStats.errors.length}`);
    console.log('📄 Подробности в: ./migration-data/_import-report.json');
  }

  console.log('\n✅ Импорт завершен!');
  console.log('💡 Следующие шаги:');
  console.log('   1. Обновите SUPABASE_URL и ключи в .env');
  console.log('   2. Проверьте работу приложения');
  console.log('   3. Удалите миграционные данные: rm -rf ./migration-data\n');
}

// Запуск
importData().catch(err => {
  console.error('💥 Критическая ошибка:', err);
  process.exit(1);
});
