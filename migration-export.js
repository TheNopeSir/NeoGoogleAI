/**
 * Migration Export Script
 * Экспортирует все данные из старой Supabase БД в JSON файлы
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// ==========================================
// НАСТРОЙКИ СТАРОЙ БД
// ==========================================
const OLD_SUPABASE_URL = process.env.OLD_SUPABASE_URL || "https://kovcgjtqbvmuzhsrcktd.supabase.co";
const OLD_SUPABASE_KEY = process.env.OLD_SUPABASE_SERVICE_KEY || "your-old-service-role-key";

const EXPORT_DIR = './migration-data';
const TABLES = ['users', 'exhibits', 'collections', 'notifications', 'messages', 'guestbook'];

// ==========================================

async function exportData() {
  console.log('🚀 Начинаем экспорт данных...\n');

  // Создаем директорию для экспорта
  try {
    await fs.mkdir(EXPORT_DIR, { recursive: true });
  } catch (err) {
    console.error('Ошибка создания директории:', err);
    process.exit(1);
  }

  // Подключаемся к старой БД
  const supabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const exportStats = {
    total: 0,
    tables: {}
  };

  // Экспортируем каждую таблицу
  for (const tableName of TABLES) {
    console.log(`📦 Экспорт таблицы: ${tableName}`);

    try {
      // Получаем все данные из таблицы
      const { data, error } = await supabase
        .from(tableName)
        .select('*');

      if (error) {
        console.error(`❌ Ошибка при экспорте ${tableName}:`, error.message);
        continue;
      }

      if (!data || data.length === 0) {
        console.log(`⚠️  Таблица ${tableName} пуста`);
        exportStats.tables[tableName] = 0;
        continue;
      }

      // Сохраняем в JSON файл
      const filePath = path.join(EXPORT_DIR, `${tableName}.json`);
      await fs.writeFile(
        filePath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );

      const count = data.length;
      exportStats.total += count;
      exportStats.tables[tableName] = count;

      console.log(`✅ ${tableName}: ${count} записей экспортировано`);

    } catch (err) {
      console.error(`❌ Ошибка при обработке ${tableName}:`, err.message);
    }
  }

  // Сохраняем метаданные экспорта
  const metadata = {
    exportDate: new Date().toISOString(),
    sourceUrl: OLD_SUPABASE_URL,
    stats: exportStats,
    version: '1.0.0'
  };

  await fs.writeFile(
    path.join(EXPORT_DIR, '_metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );

  console.log('\n📊 Статистика экспорта:');
  console.log(`   Всего записей: ${exportStats.total}`);
  console.log('   По таблицам:');
  for (const [table, count] of Object.entries(exportStats.tables)) {
    console.log(`     - ${table}: ${count}`);
  }

  console.log(`\n✅ Экспорт завершен! Данные сохранены в: ${EXPORT_DIR}`);
  console.log('\n💡 Следующий шаг: запустите migration-import.js для импорта в новую БД\n');
}

// Запуск
exportData().catch(err => {
  console.error('💥 Критическая ошибка:', err);
  process.exit(1);
});
